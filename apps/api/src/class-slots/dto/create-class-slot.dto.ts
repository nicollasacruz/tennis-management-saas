import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateClassSlotDto {
  @IsString()
  courtId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  startMin!: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  endMin!: number;

  @IsOptional()
  @IsString()
  coachId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number;
}
