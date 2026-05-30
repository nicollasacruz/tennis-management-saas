import { FirstMonthBillingPolicy, StudentSex } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(StudentSex)
  sex?: StudentSex;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNumber?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  doesPhysicalTraining?: boolean;

  @IsOptional()
  @Matches(/^\d{9}$/, {
    message: 'NIF deve ter 9 dígitos.'
  })
  taxId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMinor?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsibleName?: string;

  @IsOptional()
  @Matches(/^\d{9}$/, {
    message: 'NIF do responsável deve ter 9 dígitos.'
  })
  responsibleTaxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  responsiblePhone?: string;

  @IsOptional()
  @IsString()
  currentPlanId?: string;

  @IsOptional()
  @IsDateString()
  enrollmentStartDate?: string;

  @IsOptional()
  @IsDateString()
  enrollmentEndDate?: string;

  @IsOptional()
  @IsEnum(FirstMonthBillingPolicy)
  firstMonthBillingPolicy?: FirstMonthBillingPolicy;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
