import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        description: dto.description,
        monthlyFeeCents: dto.monthlyFeeCents,
        name: dto.name,
        sessionCount: dto.sessionCount
      }
    });
  }

  list() {
    return this.prisma.plan.findMany({
      orderBy: [
        { monthlyFeeCents: 'asc' },
        { name: 'asc' }
      ]
    });
  }
}
