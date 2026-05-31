import { Global, Module } from '@nestjs/common';
import { TenantWhatsappConfigService } from './tenant-whatsapp-config.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappQueueService } from './whatsapp-queue.service';
import { WhatsappService } from './whatsapp.service';

@Global()
@Module({
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    WhatsappQueueService,
    TenantWhatsappConfigService,
  ],
  exports: [
    WhatsappService,
    WhatsappQueueService,
    TenantWhatsappConfigService,
  ],
})
export class WhatsappModule {}
