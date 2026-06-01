import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { FirstMonthBillingPolicy, Prisma } from '@prisma/client';
import { TENANT_DB, TenantPrisma } from '../prisma/tenant-scope';
import { TenantContext } from '../tenants/tenant-context';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const studentBaseInclude = {
  _count: {
    select: {
      payments: true
    }
  },
  currentPlan: true,
  statusHistory: {
    orderBy: {
      startedAt: 'desc'
    },
    select: {
      endedAt: true,
      id: true,
      isActive: true,
      startedAt: true
    },
    take: 1
  }
} satisfies Prisma.StudentInclude;

type StudentRecord = Prisma.StudentGetPayload<{
  include: typeof studentBaseInclude;
}>;

@Injectable()
export class StudentsService {
  constructor(
    @Inject(TENANT_DB) private readonly prisma: TenantPrisma,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(dto: CreateStudentDto) {
    const planId = await this.normalizePlanId(dto.currentPlanId);
    this.validateReceiptIdentity(dto);
    const birthDate = this.resolveBirthDate(dto.birthDate);
    const enrollmentStartDate = this.resolveEnrollmentStartDate(planId, dto);
    const enrollmentEndDate = this.resolveEnrollmentEndDate(planId, dto);
    this.validateEnrollment(planId, enrollmentStartDate, enrollmentEndDate);

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          tenantId: this.tenantContext.getTenantIdOrThrow(),
          birthDate,
          currentPlanId: planId,
          doesPhysicalTraining: dto.doesPhysicalTraining ?? false,
          email: dto.email,
          enrollmentEndDate,
          enrollmentStartDate,
          firstMonthBillingPolicy: FirstMonthBillingPolicy.FULL_WITH_MAKEUP,
          fullName: dto.fullName,
          isActive: dto.isActive ?? true,
          isMinor: dto.isMinor ?? false,
          licenseNumber: this.normalizeOptionalString(dto.licenseNumber),
          notes: dto.notes,
          phone: dto.phone,
          responsibleName: dto.responsibleName,
          responsiblePhone: dto.responsiblePhone,
          responsibleTaxId: dto.responsibleTaxId,
          sex: dto.sex,
          taxId: dto.taxId
        },
        select: {
          createdAt: true,
          id: true,
          isActive: true
        }
      });

      await tx.studentStatusHistory.create({
        data: {
          tenantId: this.tenantContext.getTenantIdOrThrow(),
          isActive: student.isActive,
          startedAt: student.createdAt,
          studentId: student.id
        }
      });

      const hydratedStudent = await tx.student.findUniqueOrThrow({
        where: { id: student.id },
        include: studentBaseInclude
      });

      return this.mapStudent(hydratedStudent);
    });
  }

  async list() {
    const students = await this.prisma.student.findMany({
      include: studentBaseInclude,
      orderBy: {
        fullName: 'asc'
      }
    });

    return students.map((student) => this.mapStudent(student));
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: studentBaseInclude
    });

    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    return this.mapStudent(student);
  }

  async update(id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.student.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    const planId =
      dto.currentPlanId === undefined
        ? undefined
        : await this.normalizePlanId(dto.currentPlanId);
    this.validateReceiptIdentity(dto, existing);
    const birthDate = this.resolveBirthDate(dto.birthDate, existing.birthDate);
    const resolvedPlanId = planId === undefined ? existing.currentPlanId : planId;
    const enrollmentStartDate = this.resolveEnrollmentStartDate(
      resolvedPlanId,
      dto,
      existing.enrollmentStartDate,
      planId !== undefined && planId !== existing.currentPlanId
    );
    const enrollmentEndDate = this.resolveEnrollmentEndDate(
      resolvedPlanId,
      dto,
      existing.enrollmentEndDate
    );
    this.validateEnrollment(resolvedPlanId, enrollmentStartDate, enrollmentEndDate);

    const statusChanged =
      dto.isActive !== undefined && dto.isActive !== existing.isActive;
    const statusChangedAt = statusChanged ? new Date() : null;

    return this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: {
          birthDate,
          currentPlanId: planId,
          doesPhysicalTraining: dto.doesPhysicalTraining,
          email: dto.email,
          enrollmentEndDate,
          enrollmentStartDate,
          firstMonthBillingPolicy: FirstMonthBillingPolicy.FULL_WITH_MAKEUP,
          fullName: dto.fullName,
          isActive: dto.isActive,
          isMinor: dto.isMinor,
          licenseNumber:
            dto.licenseNumber === undefined
              ? undefined
              : this.normalizeOptionalString(dto.licenseNumber),
          notes: dto.notes,
          phone: dto.phone,
          responsibleName: dto.responsibleName,
          responsiblePhone: dto.responsiblePhone,
          responsibleTaxId: dto.responsibleTaxId,
          sex: dto.sex,
          taxId: dto.taxId
        }
      });

      if (statusChanged && statusChangedAt) {
        const recentHistory = await tx.studentStatusHistory.findMany({
          where: { studentId: id },
          orderBy: {
            startedAt: 'desc'
          },
          take: 2
        });
        const currentHistory = recentHistory[0] ?? null;
        const previousHistory = recentHistory[1] ?? null;
        const shouldCollapseSameDayRoundtrip = Boolean(
          currentHistory &&
            currentHistory.endedAt === null &&
            currentHistory.isActive === existing.isActive &&
            this.isSameDay(currentHistory.startedAt, statusChangedAt) &&
            previousHistory &&
            previousHistory.isActive === dto.isActive &&
            previousHistory.endedAt &&
            this.isSameDay(previousHistory.endedAt, statusChangedAt)
        );

        if (shouldCollapseSameDayRoundtrip && currentHistory && previousHistory) {
          await tx.studentStatusHistory.delete({
            where: { id: currentHistory.id }
          });

          await tx.studentStatusHistory.update({
            where: { id: previousHistory.id },
            data: {
              endedAt: null
            }
          });
        } else {
          await tx.studentStatusHistory.updateMany({
            where: {
              endedAt: null,
              studentId: id
            },
            data: {
              endedAt: statusChangedAt
            }
          });

          await tx.studentStatusHistory.create({
            data: {
              tenantId: this.tenantContext.getTenantIdOrThrow(),
              isActive: dto.isActive!,
              startedAt: statusChangedAt,
              studentId: id
            }
          });
        }
      }

      const hydratedStudent = await tx.student.findUniqueOrThrow({
        where: { id },
        include: studentBaseInclude
      });

      return this.mapStudent(hydratedStudent);
    });
  }

  async listStatusHistory(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true
      }
    });

    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    const history = await this.prisma.studentStatusHistory.findMany({
      where: { studentId: id },
      orderBy: {
        startedAt: 'desc'
      }
    });

    return history.map((entry) => this.mapStatusHistoryEntry(entry));
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            payments: true
          }
        },
        id: true
      }
    });

    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    if (student._count.payments > 0) {
      throw new BadRequestException(
        'Não é possível apagar o aluno enquanto existirem pagamentos associados.'
      );
    }

    await this.prisma.student.delete({
      where: { id }
    });
  }

  private mapStudent(student: StudentRecord) {
    const currentStatusEntry = student.statusHistory[0] ?? null;

    return {
      ageCategory: this.resolveAgeCategory(student.birthDate),
      ageReferenceYear: new Date().getFullYear(),
      birthDate: student.birthDate,
      createdAt: student.createdAt,
      currentPlan: student.currentPlan,
      currentPlanId: student.currentPlanId,
      doesPhysicalTraining: student.doesPhysicalTraining,
      email: student.email,
      enrollmentEndDate: student.enrollmentEndDate,
      enrollmentStartDate: student.enrollmentStartDate,
      firstMonthBillingPolicy: student.firstMonthBillingPolicy,
      fullName: student.fullName,
      id: student.id,
      isActive: student.isActive,
      isMinor: student.isMinor,
      licenseNumber: student.licenseNumber,
      notes: student.notes,
      paymentCount: student._count.payments,
      phone: student.phone,
      currentStatusSince: currentStatusEntry?.startedAt ?? null,
      responsibleName: student.responsibleName,
      responsiblePhone: student.responsiblePhone,
      responsibleTaxId: student.responsibleTaxId,
      sex: student.sex,
      taxId: student.taxId,
      updatedAt: student.updatedAt
    };
  }

  private mapStatusHistoryEntry(entry: {
    endedAt: Date | null;
    id: string;
    isActive: boolean;
    startedAt: Date;
  }) {
    return {
      dayCount: this.calculatePeriodDayCount(entry.startedAt, entry.endedAt),
      endedAt: entry.endedAt,
      id: entry.id,
      isActive: entry.isActive,
      startedAt: entry.startedAt
    };
  }

  private resolveAgeCategory(birthDate: Date | null) {
    if (!birthDate) {
      return null;
    }

    const referenceYear = new Date().getFullYear();
    const ageOnYearEnd = referenceYear - birthDate.getFullYear();

    if (ageOnYearEnd < 0) {
      return null;
    }

    if (ageOnYearEnd <= 10) {
      return 'SUB-10';
    }

    if (ageOnYearEnd <= 12) {
      return 'SUB-12';
    }

    if (ageOnYearEnd <= 14) {
      return 'SUB-14';
    }

    if (ageOnYearEnd <= 16) {
      return 'SUB-16';
    }

    if (ageOnYearEnd <= 18) {
      return 'SUB-18';
    }

    return 'SENIOR';
  }

  private validateReceiptIdentity(
    dto: CreateStudentDto | UpdateStudentDto,
    existing?: {
      isMinor: boolean;
      phone: string;
      responsibleName: string | null;
      responsiblePhone: string | null;
      responsibleTaxId: string | null;
      taxId: string | null;
    }
  ) {
    const isMinor = dto.isMinor ?? existing?.isMinor ?? false;
    const phone = dto.phone ?? existing?.phone ?? null;
    const taxId = dto.taxId ?? existing?.taxId ?? null;
    const responsibleName =
      dto.responsibleName ?? existing?.responsibleName ?? null;
    const responsibleTaxId =
      dto.responsibleTaxId ?? existing?.responsibleTaxId ?? null;

    if (!phone) {
      throw new BadRequestException(
        'Telefone é obrigatório para emitir recibos.'
      );
    }

    if (isMinor) {
      if (!responsibleName || !responsibleTaxId) {
        throw new BadRequestException(
          'Para menores de idade, indique nome e NIF do responsável.'
        );
      }

      return;
    }

    if (!taxId) {
      throw new BadRequestException(
        'NIF do aluno é obrigatório para emissão do recibo.'
      );
    }
  }

  private async normalizePlanId(planId?: string) {
    if (planId === undefined) {
      return undefined;
    }

    if (planId === '') {
      return null;
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado.');
    }

    return planId;
  }

  private resolveBirthDate(
    rawBirthDate?: string | null,
    existingBirthDate?: Date | null
  ) {
    if (rawBirthDate === undefined) {
      return existingBirthDate ?? null;
    }

    if (rawBirthDate === null || rawBirthDate === '') {
      return null;
    }

    const birthDate = new Date(rawBirthDate);

    if (birthDate > new Date()) {
      throw new BadRequestException(
        'A data de nascimento não pode ser futura.'
      );
    }

    return birthDate;
  }

  private resolveEnrollmentStartDate(
    planId: string | null | undefined,
    dto: CreateStudentDto | UpdateStudentDto,
    existingStartDate?: Date | null,
    planChanged?: boolean
  ) {
    if (!planId) {
      return null;
    }

    if (dto.enrollmentStartDate) {
      return new Date(dto.enrollmentStartDate);
    }

    if (planChanged || !existingStartDate) {
      return new Date();
    }

    return existingStartDate;
  }

  private resolveEnrollmentEndDate(
    planId: string | null | undefined,
    dto: CreateStudentDto | UpdateStudentDto,
    existingEndDate?: Date | null
  ) {
    if (!planId) {
      return null;
    }

    if (dto.enrollmentEndDate) {
      return new Date(dto.enrollmentEndDate);
    }

    if (dto.enrollmentEndDate === '') {
      return null;
    }

    return existingEndDate ?? null;
  }

  private validateEnrollment(
    planId: string | null | undefined,
    startDate: Date | null,
    endDate: Date | null
  ) {
    if (!planId) {
      return;
    }

    if (!startDate) {
      throw new BadRequestException(
        'Data de início da matrícula é obrigatória quando existe plano ativo.'
      );
    }

    if (endDate && endDate < startDate) {
      throw new BadRequestException(
        'A data de fim da matrícula não pode ser anterior à data de início.'
      );
    }
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private calculatePeriodDayCount(startedAt: Date, endedAt: Date | null) {
    const start = this.startOfDay(startedAt).getTime();
    const end = this.startOfDay(endedAt ?? new Date()).getTime();

    if (end < start) {
      return 0;
    }

    return Math.floor((end - start) / 86_400_000) + 1;
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private isSameDay(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }
}
