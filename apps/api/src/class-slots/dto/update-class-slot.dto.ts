import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateClassSlotDto {
  @IsOptional()
  @IsString()
  courtId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  startMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  endMin?: number;

  @IsOptional()
  @IsString()
  coachId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
