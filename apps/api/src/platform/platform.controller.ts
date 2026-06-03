import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlatformJwtGuard } from './platform-jwt.guard';
import { PlatformService } from './platform.service';

// Gestão cross-tenant (apenas o dono da plataforma). Sem contexto de tenant:
// usa o base client. Protegido pela estratégia 'platform-jwt'.
@UseGuards(PlatformJwtGuard)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('metrics')
  metrics() {
    return this.platform.metrics();
  }

  @Get('tenants')
  listTenants() {
    return this.platform.listTenants();
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.platform.getTenant(id);
  }

  @Post('tenants/:id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(@Param('id') id: string) {
    return this.platform.suspend(id);
  }

  @Post('tenants/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('id') id: string) {
    return this.platform.reactivate(id);
  }

  @Post('tenants/:id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string) {
    return this.platform.archive(id);
  }
}
