import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemUserDto } from './dto/create-system-user.dto';

@Injectable()
export class SystemUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSystemUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    return this.prisma.systemUser.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
        phone: dto.phone,
        role: dto.role
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        phone: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  list() {
    return this.prisma.systemUser.findMany({
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }]
    });
  }
}
