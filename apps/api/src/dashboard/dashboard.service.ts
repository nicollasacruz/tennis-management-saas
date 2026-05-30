import { Injectable } from '@nestjs/common';
import { AttendanceType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
    const sameMonthLastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const sameMonthLastYearEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    const priorYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const priorYtdEnd = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    );

    const [
      activeStudents,
      activeTechnicalUsers,
      currentMonthCharges,
      collectedThisMonth,
      pendingAmount,
      overdueCount,
      receiptsIssued,
      recentPayments,
      paidThisMonth,
      newStudentsThisMonth,
      churnedThisMonth,
      attendancesThisMonth,
      pendingPayments,
      methodAgg,
      yearCharged,
      yearCollected,
      planDistribution,
      topDebtors,
      prevMonthCollected,
      sameMonthLastYearCollected,
      priorYtdCollected,
      eventsSinceMonthStart,
      eventsSinceLastYearSameMonthEnd,
      eventsYTD,
    ] = await Promise.all([
      this.prisma.student.count({ where: { isActive: true } }),
      this.prisma.systemUser.count({ where: { isActive: true } }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: { competencyMonth: { gte: monthStart, lt: nextMonthStart } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: {
          status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
        },
      }),
      this.prisma.payment.count({ where: { status: PaymentStatus.OVERDUE } }),
      this.prisma.receipt.count({
        where: { issuedAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.PAID },
        orderBy: { paidAt: 'desc' },
        take: 4,
        include: {
          student: { select: { fullName: true } },
          receipt: { select: { number: true } },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        _count: { _all: true },
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.student.count({
        where: { createdAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      this.prisma.studentStatusHistory.count({
        where: {
          isActive: false,
          startedAt: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['type'],
        _count: { _all: true },
        where: { attendanceDate: { gte: monthStart, lt: nextMonthStart } },
      }),
      this.prisma.payment.findMany({
        where: {
          status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
        },
        select: { amountCents: true, dueDate: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        _sum: { amountCents: true },
        _count: { _all: true },
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: monthStart, lt: nextMonthStart },
          method: { not: null },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: { competencyMonth: { gte: yearStart, lt: nextYearStart } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: yearStart, lt: nextYearStart },
        },
      }),
      this.prisma.student.groupBy({
        by: ['currentPlanId'],
        _count: { _all: true },
        where: { isActive: true, currentPlanId: { not: null } },
      }),
      this.prisma.payment.findMany({
        where: {
          status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: { student: { select: { id: true, fullName: true } } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: prevMonthStart, lt: monthStart },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: sameMonthLastYearStart, lt: sameMonthLastYearEnd },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: priorYearStart, lt: priorYtdEnd },
        },
      }),
      this.prisma.studentStatusHistory.groupBy({
        by: ['isActive'],
        _count: { _all: true },
        where: { startedAt: { gte: monthStart } },
      }),
      this.prisma.studentStatusHistory.groupBy({
        by: ['isActive'],
        _count: { _all: true },
        where: { startedAt: { gte: sameMonthLastYearEnd } },
      }),
      this.prisma.studentStatusHistory.groupBy({
        by: ['isActive'],
        _count: { _all: true },
        where: { startedAt: { gte: yearStart } },
      }),
    ]);

    const sumGrouped = (
      rows: Array<{ isActive: boolean; _count: { _all: number } }>,
    ) => {
      let added = 0;
      let removed = 0;
      for (const r of rows) {
        if (r.isActive) added += r._count._all;
        else removed += r._count._all;
      }
      return { added, removed, net: added - removed };
    };
    // unpack last 4 grouped queries: [prevMonthCollected, sameMonthLastYearCollected, priorYtdCollected, eventsSinceMonthStart, eventsSinceLastYearSameMonthEnd, eventsYTD]

    // aging buckets
    const aging: Record<AgingBucket, { count: number; amountCents: number }> = {
      '0-30': { count: 0, amountCents: 0 },
      '31-60': { count: 0, amountCents: 0 },
      '61-90': { count: 0, amountCents: 0 },
      '90+': { count: 0, amountCents: 0 },
    };
    for (const p of pendingPayments) {
      const days = Math.floor(
        (now.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const bucket: AgingBucket =
        days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
      aging[bucket].count += 1;
      aging[bucket].amountCents += p.amountCents;
    }

    // method mix
    const methodMix = (Object.values(PaymentMethod) as PaymentMethod[]).map(
      (method) => {
        const row = methodAgg.find((m) => m.method === method);
        return {
          method,
          amountCents: row?._sum.amountCents ?? 0,
          count: row?._count._all ?? 0,
        };
      },
    );

    // attendances
    const att = { tennis: 0, physical: 0 };
    for (const a of attendancesThisMonth) {
      if (a.type === AttendanceType.TENNIS) att.tennis = a._count._all;
      if (a.type === AttendanceType.PHYSICAL) att.physical = a._count._all;
    }

    // plan distribution (resolve names)
    const planIds = planDistribution
      .map((p) => p.currentPlanId)
      .filter((id): id is string => Boolean(id));
    const plans = planIds.length
      ? await this.prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true, monthlyFeeCents: true },
        })
      : [];
    const planMap = new Map(plans.map((p) => [p.id, p]));
    const planBreakdown = planDistribution
      .map((p) => {
        const plan = p.currentPlanId ? planMap.get(p.currentPlanId) : null;
        return {
          planId: p.currentPlanId,
          planName: plan?.name ?? 'Sem plano',
          monthlyFeeCents: plan?.monthlyFeeCents ?? 0,
          activeStudents: p._count._all,
        };
      })
      .sort((a, b) => b.activeStudents - a.activeStudents);

    const chargedMonth = currentMonthCharges._sum.amountCents ?? 0;
    const collectedMonth = collectedThisMonth._sum.amountCents ?? 0;
    const collectionRate = chargedMonth > 0 ? collectedMonth / chargedMonth : 0;
    const paidCount = paidThisMonth._count._all ?? 0;
    const paidSum = paidThisMonth._sum.amountCents ?? 0;
    const avgTicketCents = paidCount > 0 ? Math.round(paidSum / paidCount) : 0;

    const chargedYear = yearCharged._sum.amountCents ?? 0;
    const collectedYear = yearCollected._sum.amountCents ?? 0;
    const yearCollectionRate = chargedYear > 0 ? collectedYear / chargedYear : 0;

    // growth — students
    const monthDelta = sumGrouped(eventsSinceMonthStart);
    const yearOverYearDelta = sumGrouped(eventsSinceLastYearSameMonthEnd);
    const ytdDelta = sumGrouped(eventsYTD);
    const activeStudentsMonthAgo = activeStudents - monthDelta.net;
    const activeStudentsYearAgo = activeStudents - yearOverYearDelta.net;
    const activeStudentsYearStart = activeStudents - ytdDelta.net;

    const pct = (current: number, prev: number) =>
      prev > 0 ? (current - prev) / prev : current > 0 ? 1 : 0;

    const studentMomPct = pct(activeStudents, activeStudentsMonthAgo);
    const studentYoyPct = pct(activeStudents, activeStudentsYearAgo);
    const studentYtdPct = pct(activeStudents, activeStudentsYearStart);

    // growth — revenue
    const prevMonthCollectedCents = prevMonthCollected._sum.amountCents ?? 0;
    const sameMonthLastYearCollectedCents =
      sameMonthLastYearCollected._sum.amountCents ?? 0;
    const priorYtdCollectedCents = priorYtdCollected._sum.amountCents ?? 0;

    const revenueMomPct = pct(collectedMonth, prevMonthCollectedCents);
    const revenueYoyPct = pct(collectedMonth, sameMonthLastYearCollectedCents);
    const revenueYtdPct = pct(collectedYear, priorYtdCollectedCents);

    // ARPU = recolhido mês / alunos ativos
    const arpuMonthCents =
      activeStudents > 0 ? Math.round(collectedMonth / activeStudents) : 0;
    const arpuPrevMonthCents =
      activeStudentsMonthAgo > 0
        ? Math.round(prevMonthCollectedCents / activeStudentsMonthAgo)
        : 0;
    const arpuMomPct = pct(arpuMonthCents, arpuPrevMonthCents);

    return {
      activeStudents,
      activeTechnicalUsers,
      collectedThisMonthCents: collectedMonth,
      pendingAmountCents: pendingAmount._sum.amountCents ?? 0,
      overdueCount,
      projectedMonthlyRevenueCents: chargedMonth,
      receiptsIssued,
      collectionRate,
      avgTicketCents,
      newStudentsThisMonth,
      churnedThisMonth,
      attendancesThisMonth: att,
      methodMix,
      aging,
      planBreakdown,
      yearChargedCents: chargedYear,
      yearCollectedCents: collectedYear,
      yearCollectionRate,
      growth: {
        students: {
          activeNow: activeStudents,
          activeMonthAgo: activeStudentsMonthAgo,
          activeYearAgo: activeStudentsYearAgo,
          activeYearStart: activeStudentsYearStart,
          momPct: studentMomPct,
          yoyPct: studentYoyPct,
          ytdPct: studentYtdPct,
          netNewMonth: monthDelta.net,
          netNewYTD: ytdDelta.net,
          addedYTD: ytdDelta.added,
          churnedYTD: ytdDelta.removed,
        },
        revenue: {
          monthCollectedCents: collectedMonth,
          prevMonthCollectedCents,
          sameMonthLastYearCollectedCents,
          ytdCollectedCents: collectedYear,
          priorYtdCollectedCents,
          momPct: revenueMomPct,
          yoyPct: revenueYoyPct,
          ytdPct: revenueYtdPct,
          arpuMonthCents,
          arpuPrevMonthCents,
          arpuMomPct,
        },
      },
      topDebtors: topDebtors.map((p) => ({
        id: p.id,
        studentId: p.student.id,
        studentName: p.student.fullName,
        amountCents: p.amountCents,
        dueDate: p.dueDate,
        daysLate: Math.max(
          0,
          Math.floor(
            (now.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        ),
      })),
      recentPayments: recentPayments.map((payment) => ({
        amountCents: payment.amountCents,
        id: payment.id,
        paidAt: payment.paidAt,
        receiptNumber: payment.receipt?.number ?? null,
        studentName: payment.student.fullName,
      })),
    };
  }

  async getYearly() {
    const now = new Date();
    // últimos 12 meses incluindo o atual
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [charges, payments, receipts, statusEvents] = await Promise.all([
      this.prisma.payment.findMany({
        where: { competencyMonth: { gte: start, lt: end } },
        select: { competencyMonth: true, amountCents: true },
      }),
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: start, lt: end },
        },
        select: { paidAt: true, amountCents: true },
      }),
      this.prisma.receipt.findMany({
        where: { issuedAt: { gte: start, lt: end } },
        select: { issuedAt: true },
      }),
      this.prisma.studentStatusHistory.findMany({
        where: { startedAt: { gte: start, lt: end } },
        select: { startedAt: true, isActive: true },
      }),
    ]);

    type Bucket = {
      month: string;
      label: string;
      chargedCents: number;
      collectedCents: number;
      receipts: number;
      newStudents: number;
      churned: number;
    };
    const buckets: Bucket[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      buckets.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-PT', { month: 'short' }),
        chargedCents: 0,
        collectedCents: 0,
        receipts: 0,
        newStudents: 0,
        churned: 0,
      });
    }
    const idxFor = (d: Date) =>
      (d.getFullYear() - start.getFullYear()) * 12 +
      (d.getMonth() - start.getMonth());

    for (const c of charges) {
      const i = idxFor(c.competencyMonth);
      if (i >= 0 && i < 12) buckets[i].chargedCents += c.amountCents;
    }
    for (const p of payments) {
      if (!p.paidAt) continue;
      const i = idxFor(p.paidAt);
      if (i >= 0 && i < 12) buckets[i].collectedCents += p.amountCents;
    }
    for (const r of receipts) {
      const i = idxFor(r.issuedAt);
      if (i >= 0 && i < 12) buckets[i].receipts += 1;
    }
    for (const s of statusEvents) {
      const i = idxFor(s.startedAt);
      if (i < 0 || i >= 12) continue;
      if (s.isActive) buckets[i].newStudents += 1;
      else buckets[i].churned += 1;
    }

    return { months: buckets };
  }
}
