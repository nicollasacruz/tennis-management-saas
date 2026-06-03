import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Email e senha são obrigatórios');
    }

    // PlatformUser vive no apex (base client, sem isolamento de tenant).
    const owner = await this.prisma.platformUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!owner || !owner.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, owner.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // `platform: true` distingue este token do token de tenant (que traz tenantId).
    const payload = { sub: owner.id, email: owner.email, platform: true };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: owner.id,
        email: owner.email,
        fullName: owner.fullName,
      },
    };
  }
}
