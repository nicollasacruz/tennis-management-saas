import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TENANT_DB, TenantPrisma } from '../prisma/tenant-scope';
import { TenantContext } from '../tenants/tenant-context';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(TENANT_DB) private readonly prisma: TenantPrisma,
    private readonly tenantContext: TenantContext,
  ) {}

  create(dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        tenantId: this.tenantContext.getTenantIdOrThrow(),
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
