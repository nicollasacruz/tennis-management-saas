import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateActivityDto) {
    return this.activitiesService.create(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get('public')
  listPublished() {
    return this.activitiesService.listPublished();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.activitiesService.list();
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: CreateActivityDto) {
    return this.activitiesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.activitiesService.remove(id);
  }
}
