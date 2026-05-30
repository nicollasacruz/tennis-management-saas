import { Global, Module } from '@nestjs/common';
import { MailQueueController } from './mail-queue.controller';
import { MailQueueService } from './mail-queue.service';
import { MailService } from './mail.service';

@Global()
@Module({
  controllers: [MailQueueController],
  providers: [MailService, MailQueueService],
  exports: [MailService, MailQueueService],
})
export class MailModule {}
