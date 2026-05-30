import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailJob, EmailJobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService, SendMailInput } from './mail.service';
import {
  buildRetryDate,
  deserializeMailPayload,
  normalizeMailJobError,
  serializeMailPayload,
} from './mail-queue.helpers';

type EnqueueMailOptions = {
  referenceType?: string;
  referenceId?: string;
  maxAttempts?: number;
  scheduledAt?: Date;
};

type ClaimRow = {
  id: string;
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

@Injectable()
export class MailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailQueueService.name);
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
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {
    this.workerEnabled = parseBool(
      this.config.get<string>('EMAIL_QUEUE_WORKER_ENABLED'),
      true,
    );
    this.pollMs = parsePositiveInt(
      this.config.get<string>('EMAIL_QUEUE_POLL_MS'),
      5000,
    );
    this.batchSize = parsePositiveInt(
      this.config.get<string>('EMAIL_QUEUE_BATCH_SIZE'),
      5,
    );
    this.maxAttempts = parsePositiveInt(
      this.config.get<string>('EMAIL_QUEUE_MAX_ATTEMPTS'),
      3,
    );
    this.retryBaseSeconds = parsePositiveInt(
      this.config.get<string>('EMAIL_QUEUE_RETRY_BASE_SECONDS'),
      60,
    );
    this.staleAfterSeconds = parsePositiveInt(
      this.config.get<string>('EMAIL_QUEUE_STALE_AFTER_SECONDS'),
      300,
    );
  }

  onModuleInit() {
    if (!this.workerEnabled) {
      this.logger.warn('Worker da fila de email desativado por configuração.');
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

  async enqueue(input: SendMailInput, options: EnqueueMailOptions = {}) {
    return this.prisma.emailJob.create({
      data: {
        payload: serializeMailPayload(input) as Prisma.InputJsonValue,
        referenceType: options.referenceType,
        referenceId: options.referenceId,
        maxAttempts: options.maxAttempts ?? this.maxAttempts,
        scheduledAt: options.scheduledAt ?? new Date(),
      },
    });
  }

  async list(status?: EmailJobStatus) {
    return this.prisma.emailJob.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
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
    const job = await this.prisma.emailJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job de email não encontrado.');
    }

    if (job.status !== EmailJobStatus.FAILED) {
      throw new BadRequestException(
        'Só é possível repetir jobs que estejam na fila de falhas.',
      );
    }

    return this.prisma.emailJob.update({
      where: { id },
      data: {
        status: EmailJobStatus.PENDING,
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
        `Erro ao processar fila de email: ${normalizeMailJobError(error)}`,
      );
    } finally {
      this.processing = false;
    }
  }

  private async recoverStaleProcessingJobs() {
    const staleBefore = new Date(Date.now() - this.staleAfterSeconds * 1000);
    await this.prisma.emailJob.updateMany({
      where: {
        status: EmailJobStatus.PROCESSING,
        processingStartedAt: { lt: staleBefore },
      },
      data: {
        status: EmailJobStatus.PENDING,
        processingStartedAt: null,
        scheduledAt: new Date(),
      },
    });
  }

  private async claimNextJob(): Promise<EmailJob | null> {
    const rows = await this.prisma.$queryRaw<ClaimRow[]>`
      UPDATE "EmailJob"
      SET
        "status" = 'PROCESSING'::"EmailJobStatus",
        "processingStartedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id"
        FROM "EmailJob"
        WHERE
          "status" = 'PENDING'::"EmailJobStatus"
          AND "scheduledAt" <= NOW()
        ORDER BY "scheduledAt" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING "id";
    `;

    const id = rows[0]?.id;
    if (!id) return null;

    return this.prisma.emailJob.findUnique({ where: { id } });
  }

  private async processJob(job: EmailJob) {
    try {
      const payload = deserializeMailPayload(job.payload);
      await this.mailService.send(payload);
      await this.prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: EmailJobStatus.SENT,
          attempts: job.attempts + 1,
          processingStartedAt: null,
          sentAt: new Date(),
          failedAt: null,
          lastError: null,
        },
      });
      this.logger.log(`Email enviado pela fila: job=${job.id}`);
    } catch (error) {
      await this.handleJobFailure(job, error);
    }
  }

  private async handleJobFailure(job: EmailJob, error: unknown) {
    const attempts = job.attempts + 1;
    const lastError = normalizeMailJobError(error);
    const failed = attempts >= job.maxAttempts;

    await this.prisma.emailJob.update({
      where: { id: job.id },
      data: failed
        ? {
            status: EmailJobStatus.FAILED,
            attempts,
            processingStartedAt: null,
            failedAt: new Date(),
            lastError,
          }
        : {
            status: EmailJobStatus.PENDING,
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
      this.logger.error(`Email movido para falhas: job=${job.id} erro=${lastError}`);
    } else {
      this.logger.warn(
        `Email reagendado: job=${job.id} tentativa=${attempts}/${job.maxAttempts}`,
      );
    }
  }
}
