import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractTenantSlugFromHost,
  normalizeTenantHost,
  resolveRequestHost,
} from './tenant-host';

type HeadersLike = Record<string, string | string[] | undefined>;

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async resolveFromHeaders(headers: HeadersLike) {
    const host = resolveRequestHost({
      host: headers.host,
      xForwardedHost: headers['x-forwarded-host'],
    });

    return this.resolveByHost(host);
  }

  /**
   * Versão suave de resolveFromHeaders: devolve `null` em vez de lançar quando
   * o host não mapeia um tenant. Usada pelo middleware para abrir o contexto
   * de tenant sem bloquear rotas públicas/neutras (ex.: health check).
   */
  async tryResolveFromHeaders(headers: HeadersLike) {
    try {
      return await this.resolveFromHeaders(headers);
    } catch {
      return null;
    }
  }

  async resolveByHost(host: string | null) {
    const normalizedHost = normalizeTenantHost(host);
    const byHost = normalizedHost
      ? await this.prisma.tenant.findUnique({
          where: { primaryHost: normalizedHost },
        })
      : null;

    if (byHost) {
      return this.ensureTenantAvailable(byHost);
    }

    const rootDomain = process.env.SAAS_ROOT_DOMAIN;
    const slugFromHost = rootDomain
      ? extractTenantSlugFromHost(normalizedHost, rootDomain)
      : null;
    const slug = slugFromHost ?? this.defaultTenantSlug();

    if (!slug) {
      throw new UnauthorizedException('Organização não identificada para este acesso.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new UnauthorizedException('Organização não encontrada ou indisponível.');
    }

    return this.ensureTenantAvailable(tenant);
  }

  private defaultTenantSlug(): string | null {
    const configured = process.env.DEFAULT_TENANT_SLUG?.trim();

    if (configured) {
      return configured;
    }

    return process.env.NODE_ENV === 'production' ? null : 'esaf';
  }

  private ensureTenantAvailable<T extends { status: TenantStatus }>(tenant: T): T {
    if (tenant.status === TenantStatus.ACTIVE || tenant.status === TenantStatus.TRIALING) {
      return tenant;
    }

    throw new UnauthorizedException('Organização inativa ou indisponível.');
  }
}
