import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';
import { TenantsService } from './tenants.service';

/**
 * Resolve o tenant pelo host do pedido e executa o resto da cadeia dentro do
 * contexto de tenant (AsyncLocalStorage). Resolução suave: se o host não mapear
 * um tenant (health check, host neutro, dev sem fallback), segue sem contexto —
 * as queries isoladas é que exigem tenant.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tenants: TenantsService,
    private readonly tenantContext: TenantContext,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const tenant = await this.tenants.tryResolveFromHeaders(req.headers);

    if (tenant) {
      this.tenantContext.run({ tenantId: tenant.id }, () => next());
      return;
    }

    next();
  }
}
