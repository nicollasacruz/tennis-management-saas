import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BillingProvider,
  BILLING_PROVIDER,
  SubscriptionInfo,
  supportsSubscriptions,
} from '../onboarding/billing/billing-provider';

// Campos da escola devolvidos ao painel gerencial (base client, cross-tenant).
const TENANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  primaryHost: true,
  status: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantSelect;

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BILLING_PROVIDER) private readonly billing: BillingProvider,
  ) {}

  async listTenants() {
    // Sem chamadas live ao Stripe aqui (lista pode ter muitas escolas). O estado
    // da assinatura por escola é obtido no detalhe.
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: TENANT_SELECT,
    });
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: TENANT_SELECT,
    });

    if (!tenant) {
      throw new NotFoundException('Escola não encontrada.');
    }

    const [students, systemUsers] = await Promise.all([
      this.prisma.student.count({ where: { tenantId: id } }),
      this.prisma.systemUser.count({ where: { tenantId: id } }),
    ]);

    const subscription = await this.fetchSubscription(tenant.stripeSubscriptionId);

    return { ...tenant, counts: { students, systemUsers }, subscription };
  }

  suspend(id: string) {
    return this.setStatus(id, TenantStatus.SUSPENDED);
  }

  reactivate(id: string) {
    return this.setStatus(id, TenantStatus.ACTIVE);
  }

  archive(id: string) {
    return this.setStatus(id, TenantStatus.ARCHIVED);
  }

  async metrics() {
    const grouped = await this.prisma.tenant.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const byStatus = (status: TenantStatus) =>
      grouped.find((g) => g.status === status)?._count._all ?? 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await this.prisma.tenant.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
    const mrr = await this.computeMrr();

    return {
      total,
      active: byStatus(TenantStatus.ACTIVE),
      trialing: byStatus(TenantStatus.TRIALING),
      suspended: byStatus(TenantStatus.SUSPENDED),
      archived: byStatus(TenantStatus.ARCHIVED),
      newThisMonth,
      mrr, // { amount: cents, currency } ou null se Stripe indisponível
    };
  }

  private async setStatus(id: string, status: TenantStatus) {
    const exists = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Escola não encontrada.');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { status },
      select: TENANT_SELECT,
    });
  }

  private async fetchSubscription(
    subscriptionId: string | null,
  ): Promise<SubscriptionInfo | null> {
    if (!subscriptionId || !supportsSubscriptions(this.billing)) {
      return null;
    }

    return this.billing.getSubscription(subscriptionId);
  }

  // MRR = soma das assinaturas das escolas ativas. Best-effort: se o Stripe não
  // estiver configurado (mock) devolve null.
  private async computeMrr(): Promise<{ amount: number; currency: string } | null> {
    if (!supportsSubscriptions(this.billing)) {
      return null;
    }

    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: { in: [TenantStatus.ACTIVE, TenantStatus.TRIALING] },
        stripeSubscriptionId: { not: null },
      },
      select: { stripeSubscriptionId: true },
    });

    let amount = 0;
    let currency = 'eur';

    for (const t of tenants) {
      const sub = await this.billing.getSubscription(t.stripeSubscriptionId!);
      if (sub?.amount && ['active', 'trialing'].includes(sub.status)) {
        amount += sub.amount;
        if (sub.currency) currency = sub.currency;
      }
    }

    return { amount, currency };
  }
}
