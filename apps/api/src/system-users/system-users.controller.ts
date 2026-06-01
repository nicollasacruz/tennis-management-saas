import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { SystemUsersService } from './system-users.service';

@UseGuards(JwtAuthGuard)
@Controller('system-users')
export class SystemUsersController {
  constructor(private readonly systemUsersService: SystemUsersService) {}

  @Post()
  create(@Body() dto: CreateSystemUserDto) {
    return this.systemUsersService.create(dto);
  }

  @Get()
  list() {
    return this.systemUsersService.list();
  }
}
