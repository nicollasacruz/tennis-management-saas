import { IsString } from 'class-validator';

export class AddEnrollmentDto {
  @IsString()
  studentId!: string;
}
