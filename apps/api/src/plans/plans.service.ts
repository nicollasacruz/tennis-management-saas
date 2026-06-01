import { Inject, Injectable } from '@nestjs/common';
import { TENANT_DB, TenantPrisma } from '../prisma/tenant-scope';
import { TenantContext } from '../tenants/tenant-context';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @Inject(TENANT_DB) private readonly prisma: TenantPrisma,
    private readonly tenantContext: TenantContext,
  ) {}

  create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        tenantId: this.tenantContext.getTenantIdOrThrow(),
        description: dto.description,
        monthlyFeeCents: dto.monthlyFeeCents,
        name: dto.name,
        sessionCount: dto.sessionCount
      }
    });
  }

  list() {
    return this.prisma.plan.findMany({
      orderBy: [
        { monthlyFeeCents: 'asc' },
        { name: 'asc' }
      ]
    });
  }
}
