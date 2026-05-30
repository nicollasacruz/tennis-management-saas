import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WhatsappDocumentPayload } from './whatsapp.helpers';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly instanceId: string | undefined;
  private readonly instanceToken: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('EVOLUTION_GO_BASE_URL')?.replace(/\/$/, '');
    this.apiKey = this.config.get<string>('EVOLUTION_GO_API_KEY') || undefined;
    this.instanceId = this.config.get<string>('EVOLUTION_GO_INSTANCE_ID') || undefined;
    this.instanceToken = this.config.get<string>('EVOLUTION_GO_INSTANCE_TOKEN') || undefined;
  }

  async sendDocument(payload: WhatsappDocumentPayload): Promise<{ delivered: boolean }> {
    const sendApiKey = this.instanceToken ?? this.apiKey;

    if (!this.baseUrl || !sendApiKey || !this.instanceId) {
      throw new Error(
        'Evolution Go não configurado. Defina EVOLUTION_GO_BASE_URL, EVOLUTION_GO_INSTANCE_ID e EVOLUTION_GO_INSTANCE_TOKEN.',
      );
    }

    const response = await fetch(`${this.baseUrl}/send/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: sendApiKey,
      },
      body: JSON.stringify({
        ...payload,
        id: this.instanceId,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Evolution Go devolveu ${response.status}: ${body.slice(0, 500) || response.statusText}`,
      );
    }

    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
    } | null;
    if (body?.success === false) {
      throw new Error(`Evolution Go recusou o envio: ${body.message ?? 'erro desconhecido'}`);
    }

    this.logger.log(`WhatsApp enviado para=${payload.number} ficheiro=${payload.filename}`);
    return { delivered: true };
  }
}
