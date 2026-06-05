import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceType } from '@prisma/client';

export class CreateAttendanceDto {
  @IsString()
  studentId!: string;

  @IsDateString()
  attendanceDate!: string;

  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @IsOptional()
  @IsString()
  classSlotId?: string;
}
