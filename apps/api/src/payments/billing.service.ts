import { Inject, Injectable } from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  Prisma
} from '@prisma/client';
import { TENANT_DB, TenantPrisma } from '../prisma/tenant-scope';
import { TenantContext } from '../tenants/tenant-context';

const PHYSICAL_TRAINING_SURCHARGE_CENTS = 500;

type ChargeStudentRecord = Prisma.StudentGetPayload<{
  include: {
    currentPlan: true;
  };
}>;

@Injectable()
export class BillingService {
  constructor(
    @Inject(TENANT_DB) private readonly prisma: TenantPrisma,
    private readonly tenantContext: TenantContext,
  ) {}

  async syncCurrentMonth(referenceDate = new Date()) {
    await this.refreshOverduePayments(referenceDate);
    return this.generateCurrentMonthCharges(referenceDate);
  }

  async generateCurrentMonthCharges(referenceDate = new Date()) {
    const { monthEnd, monthStart, nextMonthStart } = this.getMonthBounds(referenceDate);

    const students = await this.prisma.student.findMany({
      where: {
        currentPlanId: { not: null },
        enrollmentStartDate: {
          lte: monthEnd
        },
        isActive: true,
        OR: [
          { enrollmentEndDate: null },
          {
            enrollmentEndDate: {
              gte: monthStart
            }
          }
        ]
      },
      include: {
        currentPlan: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    const existingPayments = students.length
      ? await this.prisma.payment.findMany({
          where: {
            competencyMonth: {
              gte: monthStart,
              lt: nextMonthStart
            },
            studentId: {
              in: students.map((student) => student.id)
            }
          },
          select: {
            studentId: true
          }
        })
      : [];
    const studentsWithCurrentMonthPayment = new Set(
      existingPayments.map((payment) => payment.studentId)
    );

    const paymentsToCreate = students
      .filter((student) =>
        this.shouldCreateCharge(student, studentsWithCurrentMonthPayment)
      )
      .map((student) => this.buildChargePayload(student, referenceDate, monthStart))
      .filter((payment) => payment.amountCents > 0);

    if (paymentsToCreate.length) {
      const tenantId = this.tenantContext.getTenantIdOrThrow();
      await this.prisma.payment.createMany({
        data: paymentsToCreate.map((payment) => ({ ...payment, tenantId }))
      });
    }

    return {
      competencyMonth: monthStart,
      createdCount: paymentsToCreate.length,
      skippedCount: students.length - paymentsToCreate.length,
      totalAmountCents: paymentsToCreate.reduce(
        (sum, payment) => sum + payment.amountCents,
        0
      )
    };
  }

  buildPaymentDescription({
    competencyMonth,
    method,
    planName,
    studentName
  }: {
    competencyMonth: Date;
    method?: PaymentMethod | null;
    planName?: string | null;
    studentName: string;
  }) {
    const resolvedPlanName = planName?.trim() || 'Sem plano associado';
    const resolvedStudentName = studentName.trim();
    const resolvedMonth = new Intl.DateTimeFormat('pt-PT', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(competencyMonth));

    return [
      resolvedPlanName,
      resolvedMonth,
      resolvedStudentName,
      this.paymentMethodLabel(method)
    ].join(' · ');
  }

  paymentMethodLabel(method?: PaymentMethod | null) {
    if (method === 'BANK_TRANSFER') {
      return 'Transferência bancária';
    }

    if (method === 'MBWAY') {
      return 'MB WAY';
    }

    if (method === 'CARD') {
      return 'Cartão';
    }

    if (method === 'CASH') {
      return 'Dinheiro';
    }

    return 'Método por definir';
  }

  async refreshOverduePayments(referenceDate = new Date()) {
    const cutoff = this.startOfDay(referenceDate);

    await this.prisma.payment.updateMany({
      where: {
        dueDate: { lt: cutoff },
        status: PaymentStatus.PENDING
      },
      data: {
        status: PaymentStatus.OVERDUE
      }
    });
  }

  private shouldCreateCharge(
    student: ChargeStudentRecord,
    studentsWithCurrentMonthPayment: Set<string>
  ) {
    return Boolean(
      student.currentPlan &&
      student.enrollmentStartDate &&
      !studentsWithCurrentMonthPayment.has(student.id)
    );
  }

  private buildChargePayload(
    student: ChargeStudentRecord,
    referenceDate: Date,
    competencyMonth: Date
  ) {
    const plan = student.currentPlan!;
    const amountCents = this.calculateMonthlyCharge(
      plan.monthlyFeeCents,
      student.doesPhysicalTraining
    );
    const dueDate = this.buildDueDate(
      competencyMonth,
      referenceDate,
      student.enrollmentStartDate!
    );
    const overdueCutoff = this.startOfDay(referenceDate);

    return {
      amountCents,
      competencyMonth,
      description: this.buildPaymentDescription({
        competencyMonth,
        planName: plan.name,
        studentName: student.fullName
      }),
      dueDate,
      method: null,
      paidAt: null,
      planId: plan.id,
      status: dueDate < overdueCutoff ? PaymentStatus.OVERDUE : PaymentStatus.PENDING,
      studentId: student.id
    };
  }

  calculateMonthlyCharge(
    monthlyFeeCents: number,
    doesPhysicalTraining: boolean
  ) {
    const baseAmountCents = Math.max(0, monthlyFeeCents);

    return doesPhysicalTraining
      ? baseAmountCents + PHYSICAL_TRAINING_SURCHARGE_CENTS
      : baseAmountCents;
  }

  private buildDueDate(
    competencyMonth: Date,
    referenceDate: Date,
    enrollmentStartDate: Date
  ) {
    const { monthStart } = this.getMonthBounds(competencyMonth);
    const canonicalDueDate = this.isSameMonth(enrollmentStartDate, competencyMonth)
      ? this.maxDate(this.startOfDay(enrollmentStartDate), monthStart)
      : monthStart;
    const generationDate = this.startOfDay(referenceDate);

    return canonicalDueDate < generationDate ? generationDate : canonicalDueDate;
  }

  private getMonthBounds(referenceDate: Date) {
    const monthStart = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1
    );
    const nextMonthStart = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      1
    );
    const monthEnd = new Date(nextMonthStart.getTime() - 1);

    return { monthEnd, monthStart, nextMonthStart };
  }

  private isSameMonth(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth()
    );
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private maxDate(left: Date, right: Date) {
    return left > right ? left : right;
  }

}
