import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenants/tenant-context';
import { resolveJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(),
    });
  }

  async validate(payload: {
    sub: string;
    tenantId: string;
    email: string;
    role: string;
    fullName: string;
  }) {
    if (!payload.tenantId) {
      throw new UnauthorizedException('Sessão sem organização associada');
    }

    // Se o host resolveu um tenant, o token tem de pertencer ao mesmo tenant
    // (impede reutilizar um token de uma organização noutro host).
    const hostTenantId = this.tenantContext.getTenantId();
    if (hostTenantId && hostTenantId !== payload.tenantId) {
      throw new UnauthorizedException('Sessão não pertence a esta organização');
    }

    const user = await this.prisma.systemUser.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Utilizador não encontrado ou inativo');
    }

    return user;
  }
}
