import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PublicReceiptsController } from './public-receipts.controller';

@Module({
  controllers: [PaymentsController, PublicReceiptsController],
  exports: [BillingService, PaymentsService],
  providers: [BillingService, PaymentsService]
})
export class PaymentsModule {}
