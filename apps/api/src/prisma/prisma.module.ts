import { Global, Module } from '@nestjs/common';
import { TenantContext } from '../tenants/tenant-context';
import { PrismaService } from './prisma.service';
import { createTenantScopedClient, TENANT_DB } from './tenant-scope';

@Global()
@Module({
  providers: [
    TenantContext,
    PrismaService,
    {
      provide: TENANT_DB,
      inject: [PrismaService, TenantContext],
      useFactory: (prisma: PrismaService, tenantContext: TenantContext) =>
        createTenantScopedClient(prisma, tenantContext)
    }
  ],
  exports: [TenantContext, PrismaService, TENANT_DB]
})
export class PrismaModule {}
