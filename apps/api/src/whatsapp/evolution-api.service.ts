import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EvolutionInstance = {
  id?: string;
  name?: string;
  token?: string;
  number?: string | null;
  ownerJid?: string | null;
  connectionStatus?: string;
  profileName?: string | null;
};

type EvolutionCreateResponse = {
  instance?: {
    instanceName?: string;
    instanceId?: string;
    status?: string;
  };
  hash?: string;
  qrcode?: EvolutionQrCode;
};

type EvolutionConnectResponse = {
  qrcode?: EvolutionQrCode;
  base64?: string;
  code?: string;
  pairingCode?: string;
  count?: number;
};

type EvolutionQrCode = {
  base64?: string;
  code?: string;
  pairingCode?: string;
  count?: number;
};

export type EvolutionConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export type EvolutionConnectResult = {
  instanceName: string;
  instanceId: string | null;
  instanceToken: string;
  phoneNumber: string | null;
  status: EvolutionConnectionStatus;
  qrCodeBase64: string | null;
  qrCodeText: string | null;
};

export type EvolutionInstanceStatusResult = {
  instanceId: string | null;
  phoneNumber: string | null;
  status: EvolutionConnectionStatus;
};

@Injectable()
export class EvolutionApiService {
  private readonly baseUrl: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('EVOLUTION_API_BASE_URL') ??
      this.config.get<string>('EVOLUTION_GO_BASE_URL')
    )?.replace(/\/$/, '');
    this.apiKey =
      this.config.get<string>('EVOLUTION_API_KEY') ??
      this.config.get<string>('EVOLUTION_GO_API_KEY');
  }

  async createOrConnectInstance(input: {
    instanceName: string;
    instanceToken?: string | null;
  }): Promise<EvolutionConnectResult> {
    this.ensureConfigured();

    const instanceName = input.instanceName.trim();
    const instanceToken = input.instanceToken?.trim() || randomUUID();
    const existing = await this.findInstance(instanceName);
    const created = existing
      ? null
      : await this.createInstance(instanceName, instanceToken);

    const remote = existing ?? this.instanceFromCreate(created);
    const token = remote?.token || created?.hash || instanceToken;
    const status = this.mapConnectionStatus(
      remote?.connectionStatus ?? created?.instance?.status,
    );
    const connect =
      status === 'CONNECTED'
        ? ({} as EvolutionConnectResponse)
        : await this.connectInstance(instanceName);
    const qrCode = connect.qrcode ?? connect;

    return {
      instanceName,
      instanceId: remote?.id ?? created?.instance?.instanceId ?? null,
      instanceToken: token,
      phoneNumber: remote?.number ?? null,
      status: qrCode?.base64 || qrCode?.code ? 'CONNECTING' : status,
      qrCodeBase64: this.normalizeQrCodeBase64(qrCode?.base64),
      qrCodeText: qrCode?.code ?? qrCode?.pairingCode ?? null,
    };
  }

  async logoutInstance(instanceName: string): Promise<void> {
    this.ensureConfigured();

    const normalizedName = instanceName.trim();
    if (!normalizedName) {
      throw new BadRequestException('Nome da instância Evolution inválido.');
    }

    try {
      await this.request<unknown>(
        `/instance/logout/${encodeURIComponent(normalizedName)}`,
        { method: 'DELETE' },
      );
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        String(error.message).includes('404')
      ) {
        return;
      }

      throw error;
    }
  }

  async getInstanceStatus(
    instanceName: string,
  ): Promise<EvolutionInstanceStatusResult | null> {
    this.ensureConfigured();

    const remote = await this.findInstance(instanceName.trim());
    if (!remote) return null;

    return {
      instanceId: remote.id ?? null,
      phoneNumber: remote.number ?? this.phoneNumberFromOwnerJid(remote.ownerJid),
      status: this.mapConnectionStatus(remote.connectionStatus),
    };
  }

  private async findInstance(instanceName: string): Promise<EvolutionInstance | null> {
    const instances = await this.request<EvolutionInstance[]>('/instance/fetchInstances');
    return instances.find((instance) => instance.name === instanceName) ?? null;
  }

  private async createInstance(
    instanceName: string,
    instanceToken: string,
  ): Promise<EvolutionCreateResponse> {
    return this.request<EvolutionCreateResponse>('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        token: instanceToken,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
  }

  private async connectInstance(instanceName: string): Promise<EvolutionConnectResponse> {
    return this.request<EvolutionConnectResponse>(
      `/instance/connect/${encodeURIComponent(instanceName)}`,
    );
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    this.ensureConfigured();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey!,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new BadRequestException(
        `Evolution API devolveu ${response.status}: ${body.slice(0, 500) || response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private instanceFromCreate(response: EvolutionCreateResponse | null): EvolutionInstance | null {
    if (!response?.instance) return null;

    return {
      id: response.instance.instanceId,
      name: response.instance.instanceName,
      token: response.hash,
      connectionStatus: response.instance.status,
    };
  }

  private mapConnectionStatus(value: string | undefined): EvolutionConnectionStatus {
    if (value === 'open') return 'CONNECTED';
    if (value === 'connecting') return 'CONNECTING';
    return 'DISCONNECTED';
  }

  private phoneNumberFromOwnerJid(value: string | null | undefined): string | null {
    const number = value?.split('@')[0]?.replace(/\D/g, '');
    return number || null;
  }

  private normalizeQrCodeBase64(value: string | undefined): string | null {
    if (!value) return null;
    if (value.startsWith('data:image')) return value;
    return `data:image/png;base64,${value}`;
  }

  private ensureConfigured() {
    if (!this.baseUrl || !this.apiKey) {
      throw new BadRequestException(
        'Evolution API não configurada. Defina EVOLUTION_API_BASE_URL e EVOLUTION_API_KEY.',
      );
    }
  }
}
