import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenants/tenant-context';
import { TenantWhatsappConfigService } from './tenant-whatsapp-config.service';
import type { WhatsappDocumentPayload } from './whatsapp.helpers';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  // Servidor Evolution partilhado entre tenants; cada tenant tem a sua instância.
  private readonly baseUrl: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly tenantContext: TenantContext,
    private readonly whatsappConfig: TenantWhatsappConfigService,
  ) {
    this.baseUrl = (
      this.config.get<string>('EVOLUTION_API_BASE_URL') ??
      this.config.get<string>('EVOLUTION_GO_BASE_URL')
    )?.replace(/\/$/, '');
  }

  async sendDocument(payload: WhatsappDocumentPayload): Promise<{ delivered: boolean }> {
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const instance = await this.whatsappConfig.getSendCredentials(tenantId);

    if (!this.baseUrl) {
      throw new Error('Evolution API não configurada. Defina EVOLUTION_API_BASE_URL.');
    }

    if (!instance) {
      throw new Error(
        'WhatsApp não configurado para esta organização. Configure a instância Evolution em /whatsapp/config.',
      );
    }

    const instanceName = encodeURIComponent(instance.instanceName);
    const response = await fetch(`${this.baseUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: instance.instanceToken,
      },
      body: JSON.stringify({
        number: payload.number,
        mediatype: payload.type,
        mimetype: 'application/pdf',
        media: payload.url,
        fileName: payload.filename,
        caption: payload.caption,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Evolution API devolveu ${response.status}: ${body.slice(0, 500) || response.statusText}`,
      );
    }

    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
    } | null;
    if (body?.success === false) {
      throw new Error(`Evolution API recusou o envio: ${body.message ?? 'erro desconhecido'}`);
    }

    this.logger.log(`WhatsApp enviado para=${payload.number} ficheiro=${payload.filename}`);
    return { delivered: true };
  }
}
