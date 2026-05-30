import { Global, Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappQueueService } from './whatsapp-queue.service';
import { WhatsappService } from './whatsapp.service';

@Global()
@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappQueueService],
  exports: [WhatsappService, WhatsappQueueService],
})
export class WhatsappModule {}
