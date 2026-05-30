import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { verifyPublicReceiptToken } from './public-receipt-token';

@Controller('public/receipts')
export class PublicReceiptsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Get(':token.pdf')
  async receiptPdf(
    @Param('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const paymentId = verifyPublicReceiptToken(
      token,
      this.configService.get<string>('RECEIPT_PUBLIC_TOKEN_SECRET') ?? '',
    );

    if (!paymentId) {
      throw new NotFoundException('Recibo não encontrado.');
    }

    const { buffer, filename } = await this.paymentsService.generateReceiptPdf(paymentId);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    return new StreamableFile(buffer);
  }
}
