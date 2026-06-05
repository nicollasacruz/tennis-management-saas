import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassExceptionType, SystemUserRole } from '@prisma/client';
import { TENANT_DB, TenantPrisma } from '../prisma/tenant-scope';
import { TenantContext } from '../tenants/tenant-context';
import { CreateClassSlotDto } from './dto/create-class-slot.dto';
import { UpdateClassSlotDto } from './dto/update-class-slot.dto';
import { CreateClassExceptionDto } from './dto/create-class-exception.dto';
import { MarkClassAttendanceDto } from './dto/mark-class-attendance.dto';
import { findOverlap, hasCapacity, isValidTimeRange } from './schedule.util';

const COACH_ROLES: SystemUserRole[] = ['HEAD_COACH', 'COACH'];

@Injectable()
export class ClassSlotsService {
  constructor(
    @Inject(TENANT_DB) private readonly prisma: TenantPrisma,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---- Slots -------------------------------------------------------------

  listSlots() {
    return this.prisma.classSlot.findMany({
      where: { isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startMin: 'asc' }],
      select: {
        id: true,
        title: true,
        courtId: true,
        coachId: true,
        dayOfWeek: true,
        startMin: true,
        endMin: true,
        capacity: true,
        court: { select: { id: true, name: true } },
        coach: { select: { id: true, fullName: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async createSlot(dto: CreateClassSlotDto) {
    if (!isValidTimeRange(dto.startMin, dto.endMin)) {
      throw new BadRequestException('Intervalo de horário inválido.');
    }
    await this.assertCourtActive(dto.courtId);
    await this.assertCoach(dto.coachId);
    await this.assertNoOverlap(dto.courtId, dto.dayOfWeek, dto.startMin, dto.endMin);

    return this.prisma.classSlot.create({
      data: {
        tenantId: this.tenantContext.getTenantIdOrThrow(),
        courtId: dto.courtId,
        title: dto.title,
        dayOfWeek: dto.dayOfWeek,
        startMin: dto.startMin,
        endMin: dto.endMin,
        coachId: dto.coachId ?? null,
        capacity: dto.capacity ?? null,
      },
      select: { id: true },
    });
  }

  async updateSlot(id: string, dto: UpdateClassSlotDto) {
    const slot = await this.prisma.classSlot.findUnique({
      where: { id },
      select: {
        id: true,
        courtId: true,
        dayOfWeek: true,
        startMin: true,
        endMin: true,
      },
    });
    if (!slot) {
      throw new NotFoundException('Aula não encontrada.');
    }

    const courtId = dto.courtId ?? slot.courtId;
    const dayOfWeek = dto.dayOfWeek ?? slot.dayOfWeek;
    const startMin = dto.startMin ?? slot.startMin;
    const endMin = dto.endMin ?? slot.endMin;

    if (!isValidTimeRange(startMin, endMin)) {
      throw new BadRequestException('Intervalo de horário inválido.');
    }
    if (dto.courtId) await this.assertCourtActive(dto.courtId);
    if (dto.coachId) await this.assertCoach(dto.coachId);
    await this.assertNoOverlap(courtId, dayOfWeek, startMin, endMin, id);

    return this.prisma.classSlot.update({
      where: { id },
      data: {
        courtId: dto.courtId,
        title: dto.title,
        dayOfWeek: dto.dayOfWeek,
        startMin: dto.startMin,
        endMin: dto.endMin,
        coachId: dto.coachId,
        capacity: dto.capacity,
        isActive: dto.isActive,
      },
      select: { id: true },
    });
  }

  async removeSlot(id: string) {
    const slot = await this.prisma.classSlot.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!slot) {
      throw new NotFoundException('Aula não encontrada.');
    }
    await this.prisma.classSlot.delete({ where: { id } });
  }

  // ---- Roster (enrollments) ---------------------------------------------

  async listEnrollments(slotId: string) {
    await this.assertSlot(slotId);
    return this.prisma.classEnrollment.findMany({
      where: { classSlotId: slotId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        studentId: true,
        student: { select: { id: true, fullName: true, isActive: true } },
      },
    });
  }

  async addEnrollment(slotId: string, studentId: string) {
    const slot = await this.prisma.classSlot.findUnique({
      where: { id: slotId },
      select: { id: true, capacity: true, _count: { select: { enrollments: true } } },
    });
    if (!slot) {
      throw new NotFoundException('Aula não encontrada.');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, isActive: true },
    });
    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }
    if (!student.isActive) {
      throw new BadRequestException('Não é possível inscrever um aluno inativo.');
    }

    const already = await this.prisma.classEnrollment.findFirst({
      where: { classSlotId: slotId, studentId },
      select: { id: true },
    });
    if (already) {
      throw new BadRequestException('Aluno já inscrito nesta aula.');
    }

    if (!hasCapacity(slot._count.enrollments, slot.capacity)) {
      throw new BadRequestException('Aula sem vagas.');
    }

    return this.prisma.classEnrollment.create({
      data: {
        tenantId: this.tenantContext.getTenantIdOrThrow(),
        classSlotId: slotId,
        studentId,
      },
      select: { id: true, studentId: true },
    });
  }

  async removeEnrollment(slotId: string, studentId: string) {
    await this.prisma.classEnrollment.deleteMany({
      where: { classSlotId: slotId, studentId },
    });
  }

  // ---- Exceptions (overrides por data) ----------------------------------

  listExceptions(weekStart: string) {
    const { start, end } = this.resolveWeekRange(weekStart);
    return this.prisma.classException.findMany({
      where: {
        OR: [
          { date: { gte: start, lt: end } },
          { newDate: { gte: start, lt: end } },
        ],
      },
      select: {
        id: true,
        classSlotId: true,
        date: true,
        type: true,
        newCourtId: true,
        newDate: true,
        newStartMin: true,
        newEndMin: true,
        reason: true,
      },
    });
  }

  async createException(slotId: string, dto: CreateClassExceptionDto) {
    await this.assertSlot(slotId);
    const date = this.parseDateOnly(dto.date);

    let newCourtId: string | null = null;
    let newDate: Date | null = null;
    let newStartMin: number | null = null;
    let newEndMin: number | null = null;

    if (dto.type === ClassExceptionType.MOVED) {
      if (dto.newCourtId) {
        await this.assertCourtActive(dto.newCourtId);
        newCourtId = dto.newCourtId;
      }
      if (dto.newDate) newDate = this.parseDateOnly(dto.newDate);
      if (dto.newStartMin != null && dto.newEndMin != null) {
        if (!isValidTimeRange(dto.newStartMin, dto.newEndMin)) {
          throw new BadRequestException('Novo intervalo de horário inválido.');
        }
        newStartMin = dto.newStartMin;
        newEndMin = dto.newEndMin;
      }
      if (!newCourtId && !newDate && newStartMin == null) {
        throw new BadRequestException(
          'Mover uma aula exige novo court, nova data ou nova hora.',
        );
      }
    }

    return this.prisma.classException.upsert({
      where: { classSlotId_date: { classSlotId: slotId, date } },
      create: {
        tenantId: this.tenantContext.getTenantIdOrThrow(),
        classSlotId: slotId,
        date,
        type: dto.type,
        newCourtId,
        newDate,
        newStartMin,
        newEndMin,
        reason: dto.reason ?? null,
      },
      update: {
        type: dto.type,
        newCourtId,
        newDate,
        newStartMin,
        newEndMin,
        reason: dto.reason ?? null,
      },
      select: { id: true },
    });
  }

  async removeException(id: string) {
    await this.prisma.classException.deleteMany({ where: { id } });
  }

  // ---- Presença a partir da aula ----------------------------------------

  async markAttendance(slotId: string, dto: MarkClassAttendanceDto) {
    await this.assertSlot(slotId);
    const attendanceDate = this.parseDateOnly(dto.date);
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const studentIds = [...new Set(dto.studentIds)];

    return this.prisma.$transaction(
      studentIds.map((studentId) =>
        this.prisma.attendance.upsert({
          where: {
            studentId_attendanceDate_type: {
              studentId,
              attendanceDate,
              type: 'TENNIS',
            },
          },
          create: {
            tenantId,
            studentId,
            attendanceDate,
            type: 'TENNIS',
            classSlotId: slotId,
          },
          update: { classSlotId: slotId },
          select: { id: true, studentId: true },
        }),
      ),
    );
  }

  // ---- Helpers -----------------------------------------------------------

  private async assertSlot(slotId: string) {
    const slot = await this.prisma.classSlot.findUnique({
      where: { id: slotId },
      select: { id: true },
    });
    if (!slot) {
      throw new NotFoundException('Aula não encontrada.');
    }
  }

  private async assertCourtActive(courtId: string) {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      select: { id: true, isActive: true },
    });
    if (!court) {
      throw new NotFoundException('Court não encontrado.');
    }
    if (!court.isActive) {
      throw new BadRequestException('Court inativo.');
    }
  }

  private async assertCoach(coachId?: string | null) {
    if (!coachId) return;
    const coach = await this.prisma.systemUser.findUnique({
      where: { id: coachId },
      select: { id: true, role: true, isActive: true },
    });
    if (!coach) {
      throw new NotFoundException('Treinador não encontrado.');
    }
    if (!coach.isActive || !COACH_ROLES.includes(coach.role)) {
      throw new BadRequestException('Treinador inválido (deve ser um treinador ativo).');
    }
  }

  private async assertNoOverlap(
    courtId: string,
    dayOfWeek: number,
    startMin: number,
    endMin: number,
    ignoreId?: string,
  ) {
    const existing = await this.prisma.classSlot.findMany({
      where: { courtId, dayOfWeek, isActive: true },
      select: { id: true, courtId: true, dayOfWeek: true, startMin: true, endMin: true },
    });
    const clash = findOverlap(
      { courtId, dayOfWeek, startMin, endMin },
      existing,
      ignoreId,
    );
    if (clash) {
      throw new BadRequestException(
        'Já existe uma aula neste court e horário.',
      );
    }
  }

  private resolveWeekRange(weekStart: string) {
    const start = this.parseDateOnly(weekStart);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }

  private parseDateOnly(rawValue: string) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
      throw new BadRequestException('Data inválida. Use o formato YYYY-MM-DD.');
    }
    const [year, month, day] = rawValue.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
}
