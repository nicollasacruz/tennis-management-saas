import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  planId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  @IsDateString()
  competencyMonth!: string;

  @IsDateString()
  dueDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  amountCents!: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
