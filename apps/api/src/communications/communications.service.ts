import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmailJobStatus, WhatsappJobStatus } from '@prisma/client';
import { MailQueueService } from '../mail/mail-queue.service';
import { TENANT_DB, TenantPrisma } from '../prisma/tenant-scope';
import { WhatsappQueueService } from '../whatsapp/whatsapp-queue.service';

export type CommunicationChannel = 'email' | 'whatsapp';
export type CommunicationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';

type CommunicationJob = {
  id: string;
  channel: CommunicationChannel;
  status: CommunicationStatus;
  recipient: string;
  referenceType: string | null;
  referenceId: string | null;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  processingStartedAt: Date | null;
  sentAt: Date | null;
  failedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function getStringPayloadField(payload: unknown, field: string): string {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return '';
  }

  const value = (payload as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

@Injectable()
export class CommunicationsService {
  constructor(
    @Inject(TENANT_DB) private readonly prisma: TenantPrisma,
    private readonly mailQueueService: MailQueueService,
    private readonly whatsappQueueService: WhatsappQueueService,
  ) {}

  async list(channel?: string, status?: string): Promise<CommunicationJob[]> {
    const parsedChannel = this.parseChannel(channel);
    const parsedStatus = this.parseStatus(status);
    const jobs: CommunicationJob[] = [];

    if (!parsedChannel || parsedChannel === 'email') {
      const emailJobs = await this.prisma.emailJob.findMany({
        where: parsedStatus ? { status: parsedStatus as EmailJobStatus } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      jobs.push(
        ...emailJobs.map((job) => ({
          id: job.id,
          channel: 'email' as const,
          status: job.status,
          recipient: getStringPayloadField(job.payload, 'to'),
          referenceType: job.referenceType,
          referenceId: job.referenceId,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          scheduledAt: job.scheduledAt,
          processingStartedAt: job.processingStartedAt,
          sentAt: job.sentAt,
          failedAt: job.failedAt,
          lastError: job.lastError,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        })),
      );
    }

    if (!parsedChannel || parsedChannel === 'whatsapp') {
      const whatsappJobs = await this.prisma.whatsappJob.findMany({
        where: parsedStatus ? { status: parsedStatus as WhatsappJobStatus } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      jobs.push(
        ...whatsappJobs.map((job) => ({
          id: job.id,
          channel: 'whatsapp' as const,
          status: job.status,
          recipient: getStringPayloadField(job.payload, 'number'),
          referenceType: job.referenceType,
          referenceId: job.referenceId,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          scheduledAt: job.scheduledAt,
          processingStartedAt: job.processingStartedAt,
          sentAt: job.sentAt,
          failedAt: job.failedAt,
          lastError: job.lastError,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        })),
      );
    }

    return jobs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 100);
  }

  async retry(channel: string, id: string) {
    const parsedChannel = this.parseChannel(channel);

    if (parsedChannel === 'email') {
      // Confirma que o job pertence ao tenant atual (auto-isolado) antes de reenfileirar.
      const job = await this.prisma.emailJob.findFirst({ where: { id } });
      if (!job) {
        throw new NotFoundException('Trabalho de email não encontrado.');
      }
      return this.mailQueueService.retryFailedJob(id);
    }

    if (parsedChannel === 'whatsapp') {
      const job = await this.prisma.whatsappJob.findFirst({ where: { id } });
      if (!job) {
        throw new NotFoundException('Trabalho de WhatsApp não encontrado.');
      }
      return this.whatsappQueueService.retryFailedJob(id);
    }

    throw new BadRequestException('Canal de comunicação inválido.');
  }

  private parseChannel(channel?: string): CommunicationChannel | undefined {
    if (!channel || channel === 'ALL') return undefined;
    const normalized = channel.toLowerCase();
    if (normalized === 'email' || normalized === 'whatsapp') {
      return normalized;
    }

    throw new BadRequestException('Canal de comunicação inválido.');
  }

  private parseStatus(status?: string): CommunicationStatus | undefined {
    if (!status || status === 'ALL') return undefined;
    const normalized = status.toUpperCase();
    if (['PENDING', 'PROCESSING', 'SENT', 'FAILED'].includes(normalized)) {
      return normalized as CommunicationStatus;
    }

    throw new BadRequestException('Estado de comunicação inválido.');
  }
}
