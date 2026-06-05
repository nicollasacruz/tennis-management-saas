import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClassSlotsService } from './class-slots.service';
import { AddEnrollmentDto } from './dto/add-enrollment.dto';
import { CreateClassExceptionDto } from './dto/create-class-exception.dto';
import { CreateClassSlotDto } from './dto/create-class-slot.dto';
import { MarkClassAttendanceDto } from './dto/mark-class-attendance.dto';
import { UpdateClassSlotDto } from './dto/update-class-slot.dto';

@UseGuards(JwtAuthGuard)
@Controller('class-slots')
export class ClassSlotsController {
  constructor(private readonly classSlotsService: ClassSlotsService) {}

  @Get()
  list() {
    return this.classSlotsService.listSlots();
  }

  @Post()
  create(@Body() dto: CreateClassSlotDto) {
    return this.classSlotsService.createSlot(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassSlotDto) {
    return this.classSlotsService.updateSlot(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.classSlotsService.removeSlot(id);
  }

  @Get(':id/enrollments')
  listEnrollments(@Param('id') id: string) {
    return this.classSlotsService.listEnrollments(id);
  }

  @Post(':id/enrollments')
  addEnrollment(@Param('id') id: string, @Body() dto: AddEnrollmentDto) {
    return this.classSlotsService.addEnrollment(id, dto.studentId);
  }

  @Delete(':id/enrollments/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEnrollment(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classSlotsService.removeEnrollment(id, studentId);
  }

  @Post(':id/exceptions')
  createException(
    @Param('id') id: string,
    @Body() dto: CreateClassExceptionDto,
  ) {
    return this.classSlotsService.createException(id, dto);
  }

  @Post(':id/attendance')
  markAttendance(
    @Param('id') id: string,
    @Body() dto: MarkClassAttendanceDto,
  ) {
    return this.classSlotsService.markAttendance(id, dto);
  }
}
