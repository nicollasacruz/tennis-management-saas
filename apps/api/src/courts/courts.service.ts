import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TENANT_DB, TenantPrisma } from '../prisma/tenant-scope';
import { TenantContext } from '../tenants/tenant-context';
import { canAddCourt } from '../class-slots/schedule.util';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';

const DEFAULT_MAX_COURTS = 3;

@Injectable()
export class CourtsService {
  constructor(
    @Inject(TENANT_DB) private readonly prisma: TenantPrisma,
    private readonly base: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  list() {
    return this.prisma.court.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        surface: true,
        isActive: true,
        sortOrder: true,
        _count: { select: { classSlots: true } },
      },
    });
  }

  /** Limite de courts do plano (Tenant.maxCourts; Tenant não é tenant-scoped). */
  async getLimits() {
    const tenant = await this.base.tenant.findUnique({
      where: { id: this.tenantContext.getTenantIdOrThrow() },
      select: { maxCourts: true },
    });
    const max = tenant?.maxCourts ?? DEFAULT_MAX_COURTS;
    const active = await this.prisma.court.count({ where: { isActive: true } });
    return { maxCourts: max, activeCourts: active };
  }

  async create(dto: CreateCourtDto) {
    const isActive = dto.isActive ?? true;

    if (isActive) {
      const { maxCourts, activeCourts } = await this.getLimits();
      if (!canAddCourt(activeCourts, maxCourts)) {
        throw new BadRequestException(
          `Limite de courts do plano atingido (máximo ${maxCourts}).`,
        );
      }
    }

    return this.prisma.court.create({
      data: {
        tenantId: this.tenantContext.getTenantIdOrThrow(),
        name: dto.name,
        surface: dto.surface ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive,
      },
      select: { id: true, name: true, surface: true, isActive: true, sortOrder: true },
    });
  }

  async update(id: string, dto: UpdateCourtDto) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!court) {
      throw new NotFoundException('Court não encontrado.');
    }

    // Reativar um court conta para o limite.
    if (dto.isActive === true && !court.isActive) {
      const { maxCourts, activeCourts } = await this.getLimits();
      if (!canAddCourt(activeCourts, maxCourts)) {
        throw new BadRequestException(
          `Limite de courts do plano atingido (máximo ${maxCourts}).`,
        );
      }
    }

    return this.prisma.court.update({
      where: { id },
      data: {
        name: dto.name,
        surface: dto.surface,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
      select: { id: true, name: true, surface: true, isActive: true, sortOrder: true },
    });
  }

  async remove(id: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      select: { id: true, _count: { select: { classSlots: true } } },
    });
    if (!court) {
      throw new NotFoundException('Court não encontrado.');
    }
    if (court._count.classSlots > 0) {
      throw new BadRequestException(
        'Court tem aulas associadas. Remove as aulas ou desativa o court.',
      );
    }

    await this.prisma.court.delete({ where: { id } });
  }
}
