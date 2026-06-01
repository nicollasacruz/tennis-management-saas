import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WhatsappJob, WhatsappJobStatus } from '@prisma/client';
import {
  buildRetryDate,
  normalizeQueueError,
  parseBool,
  parsePositiveInt,
} from '../mail/mail-queue.helpers';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenants/tenant-context';
import { createPublicReceiptToken } from '../payments/public-receipt-token';
import {
  WhatsappDocumentPayload,
  deserializeWhatsappPayload,
  serializeWhatsappPayload,
} from './whatsapp.helpers';
import { WhatsappService } from './whatsapp.service';

type EnqueueWhatsappOptions = {
  referenceType?: string;
  referenceId?: string;
  maxAttempts?: number;
  scheduledAt?: Date;
};

type ClaimRow = {
  id: string;
};

@Injectable()
export class WhatsappQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappQueueService.name);
  private readonly workerEnabled: boolean;
  private readonly pollMs: number;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly retryBaseSeconds: number;
  private readonly staleAfterSeconds: number;
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly config: ConfigService,
    private readonly tenantContext: TenantContext,
  ) {
    this.workerEnabled = parseBool(
      this.config.get<string>('WHATSAPP_QUEUE_WORKER_ENABLED'),
      true,
    );
    this.pollMs = parsePositiveInt(
      this.config.get<string>('WHATSAPP_QUEUE_POLL_MS'),
      5000,
    );
    this.batchSize = parsePositiveInt(
      this.config.get<string>('WHATSAPP_QUEUE_BATCH_SIZE'),
      5,
    );
    this.maxAttempts = parsePositiveInt(
      this.config.get<string>('WHATSAPP_QUEUE_MAX_ATTEMPTS'),
      3,
    );
    this.retryBaseSeconds = parsePositiveInt(
      this.config.get<string>('WHATSAPP_QUEUE_RETRY_BASE_SECONDS'),
      60,
    );
    this.staleAfterSeconds = parsePositiveInt(
      this.config.get<string>('WHATSAPP_QUEUE_STALE_AFTER_SECONDS'),
      300,
    );
  }

  onModuleInit() {
    if (!this.workerEnabled) {
      this.logger.warn('Worker da fila de WhatsApp desativado por configuração.');
      return;
    }

    void this.processDueJobs();
    this.timer = setInterval(() => {
      void this.processDueJobs();
    }, this.pollMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async enqueue(input: WhatsappDocumentPayload, options: EnqueueWhatsappOptions = {}) {
    return this.prisma.whatsappJob.create({
      data: {
        tenantId: this.tenantContext.getTenantIdOrThrow(),
        payload: serializeWhatsappPayload(input) as Prisma.InputJsonValue,
        referenceType: options.referenceType,
        referenceId: options.referenceId,
        maxAttempts: options.maxAttempts ?? this.maxAttempts,
        scheduledAt: options.scheduledAt ?? new Date(),
      },
    });
  }

  async list(status?: WhatsappJobStatus) {
    return this.prisma.whatsappJob.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        payload: true,
        referenceType: true,
        referenceId: true,
        attempts: true,
        maxAttempts: true,
        scheduledAt: true,
        processingStartedAt: true,
        sentAt: true,
        failedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async retryFailedJob(id: string) {
    const job = await this.prisma.whatsappJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job de WhatsApp não encontrado.');
    }

    if (job.status !== WhatsappJobStatus.FAILED) {
      throw new BadRequestException(
        'Só é possível repetir jobs que estejam na fila de falhas.',
      );
    }

    return this.prisma.whatsappJob.update({
      where: { id },
      data: {
        status: WhatsappJobStatus.PENDING,
        attempts: 0,
        scheduledAt: new Date(),
        processingStartedAt: null,
        failedAt: null,
        lastError: null,
      },
    });
  }

  async processDueJobs() {
    if (this.processing) return;
    this.processing = true;

    try {
      await this.recoverStaleProcessingJobs();

      for (let processed = 0; processed < this.batchSize; processed += 1) {
        const job = await this.claimNextJob();
        if (!job) break;
        await this.processJob(job);
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar fila de WhatsApp: ${normalizeQueueError(error)}`,
      );
    } finally {
      this.processing = false;
    }
  }

  private async recoverStaleProcessingJobs() {
    const staleBefore = new Date(Date.now() - this.staleAfterSeconds * 1000);
    await this.prisma.whatsappJob.updateMany({
      where: {
        status: WhatsappJobStatus.PROCESSING,
        processingStartedAt: { lt: staleBefore },
      },
      data: {
        status: WhatsappJobStatus.PENDING,
        processingStartedAt: null,
        scheduledAt: new Date(),
      },
    });
  }

  private async claimNextJob(): Promise<WhatsappJob | null> {
    const rows = await this.prisma.$queryRaw<ClaimRow[]>`
      UPDATE "WhatsappJob"
      SET
        "status" = 'PROCESSING'::"WhatsappJobStatus",
        "processingStartedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id"
        FROM "WhatsappJob"
        WHERE
          "status" = 'PENDING'::"WhatsappJobStatus"
          AND "scheduledAt" <= NOW()
        ORDER BY "scheduledAt" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING "id";
    `;

    const id = rows[0]?.id;
    if (!id) return null;

    return this.prisma.whatsappJob.findUnique({ where: { id } });
  }

  private async processJob(job: WhatsappJob) {
    // A fila é global; cada job é processado no contexto do seu tenant para que
    // o envio resolva a instância Evolution correta (config por tenant).
    await this.tenantContext.run({ tenantId: job.tenantId }, async () => {
      try {
        const payload = this.refreshReceiptPayloadUrl(
          job,
          deserializeWhatsappPayload(job.payload),
        );
        await this.whatsappService.sendDocument(payload);
        await this.prisma.whatsappJob.update({
          where: { id: job.id },
          data: {
            status: WhatsappJobStatus.SENT,
            attempts: job.attempts + 1,
            processingStartedAt: null,
            sentAt: new Date(),
            failedAt: null,
            lastError: null,
          },
        });
        this.logger.log(`WhatsApp enviado pela fila: job=${job.id}`);
      } catch (error) {
        await this.handleJobFailure(job, error);
      }
    });
  }

  private refreshReceiptPayloadUrl(
    job: WhatsappJob,
    payload: WhatsappDocumentPayload,
  ): WhatsappDocumentPayload {
    if (!job.referenceId || !job.referenceType?.startsWith('receipt')) {
      return payload;
    }

    const publicApiBaseUrl = this.config
      .get<string>('PUBLIC_API_BASE_URL')
      ?.replace(/\/$/, '');
    const tokenSecret = this.config.get<string>('RECEIPT_PUBLIC_TOKEN_SECRET');

    if (!publicApiBaseUrl || !tokenSecret) {
      throw new Error(
        'Envio por WhatsApp não configurado. Defina PUBLIC_API_BASE_URL e RECEIPT_PUBLIC_TOKEN_SECRET.',
      );
    }

    const token = createPublicReceiptToken({
      paymentId: job.referenceId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      secret: tokenSecret,
    });

    return {
      ...payload,
      url: `${publicApiBaseUrl}/public/receipts/${token}.pdf`,
    };
  }

  private async handleJobFailure(job: WhatsappJob, error: unknown) {
    const attempts = job.attempts + 1;
    const lastError = normalizeQueueError(error);
    const failed = attempts >= job.maxAttempts;

    await this.prisma.whatsappJob.update({
      where: { id: job.id },
      data: failed
        ? {
            status: WhatsappJobStatus.FAILED,
            attempts,
            processingStartedAt: null,
            failedAt: new Date(),
            lastError,
          }
        : {
            status: WhatsappJobStatus.PENDING,
            attempts,
            scheduledAt: buildRetryDate(
              attempts,
              new Date(),
              this.retryBaseSeconds,
            ),
            processingStartedAt: null,
            lastError,
          },
    });

    if (failed) {
      this.logger.error(`WhatsApp movido para falhas: job=${job.id} erro=${lastError}`);
    } else {
      this.logger.warn(
        `WhatsApp reagendado: job=${job.id} tentativa=${attempts}/${job.maxAttempts}`,
      );
    }
  }
}
