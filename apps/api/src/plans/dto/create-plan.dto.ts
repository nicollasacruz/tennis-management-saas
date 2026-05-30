import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  monthlyFeeCents!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string;
}
