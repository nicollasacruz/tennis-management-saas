import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmailJobStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailQueueService } from './mail-queue.service';

@UseGuards(JwtAuthGuard)
@Controller('mail/jobs')
export class MailQueueController {
  constructor(private readonly mailQueueService: MailQueueService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.mailQueueService.list(this.parseStatus(status));
  }

  @Post(':id/retry')
  retry(@Param('id') id: string) {
    return this.mailQueueService.retryFailedJob(id);
  }

  private parseStatus(status?: string): EmailJobStatus | undefined {
    if (!status) return undefined;

    const normalized = status.toUpperCase();
    if (
      !Object.values(EmailJobStatus).includes(normalized as EmailJobStatus)
    ) {
      throw new BadRequestException('Estado da fila de email inválido.');
    }

    return normalized as EmailJobStatus;
  }
}
