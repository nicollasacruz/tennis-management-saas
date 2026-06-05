import { ClassExceptionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClassExceptionDto {
  @IsDateString()
  date!: string;

  @IsEnum(ClassExceptionType)
  type!: ClassExceptionType;

  @IsOptional()
  @IsString()
  newCourtId?: string;

  @IsOptional()
  @IsDateString()
  newDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  newStartMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  newEndMin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
