import { SetMetadata } from '@nestjs/common';
import { SystemUserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restringe a rota aos papéis indicados (validado pelo RolesGuard). */
export const Roles = (...roles: SystemUserRole[]) =>
  SetMetadata(ROLES_KEY, roles);
