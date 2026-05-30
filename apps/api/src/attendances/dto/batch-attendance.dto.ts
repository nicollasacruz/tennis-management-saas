import { IsArray, IsDateString, IsEnum, IsString } from 'class-validator';
import { AttendanceType } from '@prisma/client';

export class BatchAttendanceDto {
  @IsString()
  studentId!: string;

  @IsDateString()
  attendanceDate!: string;

  @IsArray()
  @IsEnum(AttendanceType, { each: true })
  types!: AttendanceType[];
}
