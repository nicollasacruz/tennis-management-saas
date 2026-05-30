import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        category: dto.category,
        description: dto.description,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isPublished: dto.isPublished ?? true,
        startDate: new Date(dto.startDate),
        title: dto.title
      }
    });
  }

  list() {
    return this.prisma.activity.findMany({
      orderBy: { startDate: 'asc' }
    });
  }

  listPublished() {
    return this.prisma.activity.findMany({
      orderBy: { startDate: 'asc' },
      where: { isPublished: true }
    });
  }

  async findOne(id: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Atividade não encontrada.');
    return activity;
  }

  async update(id: string, dto: CreateActivityDto) {
    await this.findOne(id);
    return this.prisma.activity.update({
      where: { id },
      data: {
        category: dto.category,
        description: dto.description,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isPublished: dto.isPublished ?? true,
        startDate: new Date(dto.startDate),
        title: dto.title
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.activity.delete({ where: { id } });
  }
}
