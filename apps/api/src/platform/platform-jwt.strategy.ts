import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { resolveJwtSecret } from '../auth/jwt-secret';

/**
 * Estratégia separada da do tenant (nome 'platform-jwt'). Aceita apenas tokens
 * de plataforma (`platform: true`, sem tenantId) e NÃO faz o cross-tenant
 * host-check — o painel /gerencial é cross-tenant por natureza.
 */
@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(
  Strategy,
  'platform-jwt',
) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(),
    });
  }

  async validate(payload: { sub: string; email: string; platform?: boolean }) {
    if (!payload.platform) {
      throw new UnauthorizedException('Sessão inválida para o painel gerencial');
    }

    const owner = await this.prisma.platformUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, isActive: true },
    });

    if (!owner || !owner.isActive) {
      throw new UnauthorizedException('Dono da plataforma não encontrado ou inativo');
    }

    return owner;
  }
}
