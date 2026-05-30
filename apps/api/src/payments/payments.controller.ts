import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SettlePaymentDto } from './dto/settle-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get()
  list(
    @Query('status') status?: string,
    @Query('month') month?: string
  ) {
    return this.paymentsService.list(status, month);
  }

  @Post('generate-current-month')
  generateCurrentMonth() {
    return this.paymentsService.generateCurrentMonthCharges();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }

  @Post(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettlePaymentDto) {
    return this.paymentsService.settle(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }

  @Post(':id/email-receipt')
  emailReceipt(
    @Param('id') id: string,
    @Body() dto: { email?: string } = {}
  ) {
    return this.paymentsService.emailReceipt(id, dto?.email);
  }

  @Get(':id/receipt.pdf')
  async receiptPdf(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const { buffer, filename } = await this.paymentsService.generateReceiptPdf(id);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"`
    );

    return new StreamableFile(buffer);
  }
}
