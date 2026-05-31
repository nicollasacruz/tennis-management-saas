import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenants/tenant-context';
import { UpdateWhatsappConfigDto } from './dto/update-whatsapp-config.dto';
import { EvolutionApiService } from './evolution-api.service';

export interface WhatsappSendCredentials {
  instanceName: string;
  instanceToken: string;
}

/**
 * Configuração da instância Evolution por tenant (servidor Evolution partilhado,
 * uma instância por organização). Usa o cliente base do Prisma com filtro
 * explícito por `tenantId` — não passa pela extension de isolamento.
 */
@Injectable()
export class TenantWhatsappConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly evolutionApi: EvolutionApiService,
  ) {}

  /** Credenciais para envio; `null` se a instância ainda não estiver configurada. */
  async getSendCredentials(
    tenantId: string,
  ): Promise<WhatsappSendCredentials | null> {
    const config = await this.prisma.tenantWhatsappConfig.findUnique({
      where: { tenantId },
    });

    const instanceName = config?.instanceName ?? config?.instanceId;

    if (!instanceName || !config?.instanceToken) {
      return null;
    }

    return { instanceName, instanceToken: config.instanceToken };
  }

  /** Vista mascarada da config do tenant atual (não devolve o token). */
  async getForCurrentTenant() {
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const config = await this.prisma.tenantWhatsappConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return {
        configured: false,
        instanceId: null,
        instanceName: null,
        phoneNumber: null,
        hasToken: false,
        status: 'DISCONNECTED' as const,
        lastConnectedAt: null,
        updatedAt: null,
      };
    }

    return {
      configured: !!((config.instanceName ?? config.instanceId) && config.instanceToken),
      instanceId: config.instanceId,
      instanceName: config.instanceName,
      phoneNumber: config.phoneNumber,
      hasToken: !!config.instanceToken,
      status: config.status,
      lastConnectedAt: config.lastConnectedAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Cria/atualiza a config do tenant atual. O token só é alterado quando um valor
   * não vazio é enviado (PUT idempotente que preserva o token existente).
   */
  async upsertForCurrentTenant(dto: UpdateWhatsappConfigDto) {
    const tenantId = this.tenantContext.getTenantIdOrThrow();

    const instanceId = dto.instanceId?.trim() || null;
    const instanceName = dto.instanceName?.trim() || null;
    const phoneNumber = dto.phoneNumber?.trim() || null;
    const token = dto.instanceToken?.trim();

    await this.prisma.tenantWhatsappConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        instanceId,
        instanceToken: token || null,
        instanceName,
        phoneNumber,
      },
      update: {
        instanceId,
        instanceName,
        phoneNumber,
        ...(token ? { instanceToken: token } : {}),
      },
    });

    return this.getForCurrentTenant();
  }

  async createOrConnectForCurrentTenant() {
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const [tenant, config] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.tenantWhatsappConfig.findUnique({ where: { tenantId } }),
    ]);
    const instanceName =
      config?.instanceName?.trim() || this.buildInstanceName(tenant.slug, tenant.id);

    const connection = await this.evolutionApi.createOrConnectInstance({
      instanceName,
      instanceToken: config?.instanceToken,
    });

    await this.prisma.tenantWhatsappConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        instanceId: connection.instanceId,
        instanceToken: connection.instanceToken,
        instanceName: connection.instanceName,
        phoneNumber: connection.phoneNumber,
        status: connection.status,
        lastConnectedAt: connection.status === 'CONNECTED' ? new Date() : null,
      },
      update: {
        instanceId: connection.instanceId,
        instanceToken: connection.instanceToken,
        instanceName: connection.instanceName,
        phoneNumber: connection.phoneNumber,
        status: connection.status,
        lastConnectedAt: connection.status === 'CONNECTED' ? new Date() : config?.lastConnectedAt,
      },
    });

    return {
      config: await this.getForCurrentTenant(),
      qrCodeBase64: connection.qrCodeBase64,
      qrCodeText: connection.qrCodeText,
    };
  }

  private buildInstanceName(slug: string, tenantId: string) {
    const normalized = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized ? `tenant-${normalized}` : `tenant-${tenantId.slice(0, 8)}`;
  }
}
