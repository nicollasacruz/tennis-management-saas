import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { SystemUserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContext } from './tenant-context';
import { BillingPortalDto } from './dto/billing-portal.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { TenantsService } from './tenants.service';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get('current/settings')
  getCurrentSettings() {
    return this.tenantsService.getSettings(this.tenantContext.getTenantIdOrThrow());
  }

  @Put('current/settings')
  @UseGuards(RolesGuard)
  @Roles(SystemUserRole.ADMIN)
  updateCurrentSettings(@Body() dto: UpdateTenantSettingsDto) {
    return this.tenantsService.updateSettings(
      this.tenantContext.getTenantIdOrThrow(),
      dto,
    );
  }

  @Get('current/subscription')
  getCurrentSubscription() {
    return this.tenantsService.getSubscription(
      this.tenantContext.getTenantIdOrThrow(),
    );
  }

  @Post('current/billing-portal')
  @UseGuards(RolesGuard)
  @Roles(SystemUserRole.ADMIN)
  createBillingPortal(@Body() dto: BillingPortalDto) {
    return this.tenantsService.createBillingPortal(
      this.tenantContext.getTenantIdOrThrow(),
      dto.returnUrl,
    );
  }
}
