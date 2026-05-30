import { PaymentMethod } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class SettlePaymentDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
