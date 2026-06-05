import { ArrayNotEmpty, IsArray, IsDateString, IsString } from 'class-validator';

export class MarkClassAttendanceDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  studentIds!: string[];
}
