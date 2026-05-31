import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemUserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

/**
 * Restringe o acesso por papel. Deve ser usado depois do JwtAuthGuard, que
 * coloca o utilizador (com `role`) no pedido. Sem `@Roles(...)` a rota fica livre.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemUserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }

    return true;
  }
}
