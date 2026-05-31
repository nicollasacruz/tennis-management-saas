import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export interface TenantStore {
  tenantId: string;
}

/**
 * Guarda o tenant ativo do pedido/operação atual usando AsyncLocalStorage.
 * O middleware (pedidos HTTP) e os workers de fila (processamento de jobs)
 * abrem o contexto com `run`; a extension do Prisma lê o `tenantId` daqui
 * para isolar automaticamente as queries dos modelos de negócio.
 */
@Injectable()
export class TenantContext {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  run<T>(store: TenantStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  getStore(): TenantStore | undefined {
    return this.storage.getStore();
  }

  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  getTenantIdOrThrow(): string {
    const tenantId = this.getTenantId();

    if (!tenantId) {
      throw new Error('Operação sem contexto de tenant.');
    }

    return tenantId;
  }
}
