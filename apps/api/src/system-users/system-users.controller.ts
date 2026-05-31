import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { SystemUsersService } from './system-users.service';

@UseGuards(JwtAuthGuard)
@Controller('system-users')
export class SystemUsersController {
  constructor(private readonly systemUsersService: SystemUsersService) {}

  @Post()
  create(
    @Body() dto: CreateSystemUserDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.systemUsersService.create(dto, tenantId);
  }

  @Get()
  list(@CurrentUser('tenantId') tenantId: string) {
    return this.systemUsersService.list(tenantId);
  }
}
