import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'esaf-secret-key-change-in-production',
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
