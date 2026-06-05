import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClassSlotsService } from './class-slots.service';

@UseGuards(JwtAuthGuard)
@Controller('class-exceptions')
export class ClassExceptionsController {
  constructor(private readonly classSlotsService: ClassSlotsService) {}

  @Get()
  list(@Query('weekStart') weekStart: string) {
    return this.classSlotsService.listExceptions(weekStart);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.classSlotsService.removeException(id);
  }
}
