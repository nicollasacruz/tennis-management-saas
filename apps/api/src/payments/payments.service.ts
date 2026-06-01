import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, Prisma } from '@prisma/client';
import { MailQueueService } from '../mail/mail-queue.service';
import { TENANT_DB, TenantPrisma, TenantTx } from '../prisma/tenant-scope';
import { TenantContext } from '../tenants/tenant-context';
import { normalizeWhatsappNumber } from '../whatsapp/whatsapp.helpers';
import { WhatsappQueueService } from '../whatsapp/whatsapp-queue.service';
import { BillingService } from './billing.service';
import { buildReceiptPdf } from './receipt-pdf';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SettlePaymentDto } from './dto/settle-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { createPublicReceiptToken } from './public-receipt-token';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly billingService: BillingService,
    @Inject(TENANT_DB) private readonly prisma: TenantPrisma,
    private readonly configService: ConfigService,
    private readonly mailQueueService: MailQueueService,
    private readonly whatsappQueueService: WhatsappQueueService,
    private readonly tenantContext: TenantContext
  ) {}

  private async getReceiptBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        logoUrl: true,
        receiptIssuer: true,
        receiptSignatureLabel: true,
      },
    });

    return {
      issuer:
        tenant?.receiptIssuer ??
        this.configService.get<string>('RECEIPT_ISSUER') ??
        'ESAF - Escola de Tenis',
      logoUrl: tenant?.logoUrl ?? this.configService.get<string>('ESAF_LOGO_URL'),
      signatureLabel:
        tenant?.receiptSignatureLabel ??
        this.configService.get<string>('RECEIPT_SIGNATURE_LABEL') ??
        'Direção ESAF',
    };
  }

  async create(dto: CreatePaymentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId }
    });

    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    const resolvedPlanId =
      dto.planId === undefined ? student.currentPlanId ?? null : dto.planId;

    const plan = resolvedPlanId
      ? await this.prisma.plan.findUnique({
        where: { id: resolvedPlanId }
      })
      : null;

    if (resolvedPlanId) {
      if (!plan) {
        throw new NotFoundException('Plano não encontrado.');
      }
    }

    const competencyMonth = new Date(dto.competencyMonth);
    const dueDate = new Date(dto.dueDate);
    const status = this.resolveStatus(dto.status, dueDate);
    const paidAt = status === PaymentStatus.PAID ? new Date(dto.paidAt ?? new Date()) : null;
    const amountCents =
      status === PaymentStatus.PAID || !plan
        ? dto.amountCents
        : this.billingService.calculateMonthlyCharge(
            plan.monthlyFeeCents,
            student.doesPhysicalTraining
          );
    const description = this.billingService.buildPaymentDescription({
      competencyMonth,
      method: dto.method,
      planName: plan?.name ?? null,
      studentName: student.fullName
    });

    const payment = await this.withReceiptNumberingRetry(() =>
      this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId: this.tenantContext.getTenantIdOrThrow(),
          amountCents,
          competencyMonth,
          description,
          dueDate,
          method: dto.method,
          paidAt,
          planId: resolvedPlanId,
          status,
          studentId: dto.studentId
        }
      });

      if (status === PaymentStatus.PAID) {
        await tx.receipt.create({
          data: {
            tenantId: this.tenantContext.getTenantIdOrThrow(),
            number: await this.buildReceiptNumber(tx, paidAt ?? new Date()),
            paymentId: payment.id
          }
        });
      }

      return tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: {
          plan: true,
          receipt: true,
          student: true
        }
      });
    }));

    if (payment.status === PaymentStatus.PAID) {
      await this.enqueueAutomaticReceiptCommunications(payment.id);
    }

    return payment;
  }

  async list(status?: string, month?: string) {
    const normalizedStatus =
      status && status !== 'ALL' && Object.values(PaymentStatus).includes(status as PaymentStatus)
        ? (status as PaymentStatus)
        : undefined;

    const where: Prisma.PaymentWhereInput = {};

    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split('-').map(Number);
      const start = new Date(Date.UTC(year, monthNum - 1, 1));
      const end = new Date(Date.UTC(year, monthNum, 1));
      where.competencyMonth = { gte: start, lt: end };
    }

    return this.prisma.payment.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        plan: true,
        receipt: true,
        student: true
      },
      orderBy: [{ competencyMonth: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        plan: true,
        receipt: true,
        student: true,
        tenant: true
      }
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const existing = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        plan: true,
        receipt: true
      }
    });

    if (!existing) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    const studentId = dto.studentId ?? existing.studentId;
    const student = await this.prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    const resolvedPlanId =
      dto.planId === undefined ? existing.planId : dto.planId;

    const plan = resolvedPlanId
      ? await this.prisma.plan.findUnique({
        where: { id: resolvedPlanId }
      })
      : null;

    if (resolvedPlanId) {
      if (!plan) {
        throw new NotFoundException('Plano não encontrado.');
      }
    }

    const competencyMonth = dto.competencyMonth
      ? new Date(dto.competencyMonth)
      : existing.competencyMonth;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : existing.dueDate;
    const status =
      dto.status !== undefined
        ? this.resolveStatus(dto.status, dueDate)
        : existing.status === PaymentStatus.PAID
          ? PaymentStatus.PAID
          : this.resolveStatus(existing.status, dueDate);
    const method = dto.method === undefined ? existing.method : dto.method;
    const paidAt =
      status === PaymentStatus.PAID
        ? new Date(dto.paidAt ?? existing.paidAt ?? new Date())
        : null;
    const amountCents =
      status === PaymentStatus.PAID || !plan
        ? dto.amountCents ?? existing.amountCents
        : this.billingService.calculateMonthlyCharge(
            plan.monthlyFeeCents,
            student.doesPhysicalTraining
          );
    const description = this.billingService.buildPaymentDescription({
      competencyMonth,
      method,
      planName:
        resolvedPlanId === null
          ? null
          : plan?.name ?? existing.plan?.name ?? null,
      studentName: student.fullName
    });

    const payment = await this.withReceiptNumberingRetry(() =>
      this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: {
          amountCents,
          competencyMonth,
          description,
          dueDate,
          method,
          paidAt,
          planId: resolvedPlanId,
          status,
          studentId
        }
      });

      if (status === PaymentStatus.PAID && !existing.receipt) {
        await tx.receipt.create({
          data: {
            tenantId: this.tenantContext.getTenantIdOrThrow(),
            number: await this.buildReceiptNumber(tx, paidAt ?? new Date()),
            paymentId: id
          }
        });
      }

      if (status !== PaymentStatus.PAID && existing.receipt) {
        await tx.receipt.delete({
          where: {
            paymentId: id
          }
        });
      }

      return tx.payment.findUniqueOrThrow({
        where: { id },
        include: {
          plan: true,
          receipt: true,
          student: true
        }
      });
    }));

    await this.enqueueAutomaticReceiptCommunications(payment.id);
    return payment;
  }

  async settle(id: string, dto: SettlePaymentDto) {
    const existing = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        plan: true,
        receipt: true,
        student: true
      }
    });

    if (!existing) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    const paidAt = new Date(dto.paidAt ?? new Date());
    const method = dto.method ?? existing.method;
    const description = this.billingService.buildPaymentDescription({
      competencyMonth: existing.competencyMonth,
      method,
      planName: existing.plan?.name ?? null,
      studentName: existing.student.fullName
    });

    const payment = await this.withReceiptNumberingRetry(() =>
      this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: {
          description,
          method,
          paidAt,
          status: PaymentStatus.PAID
        }
      });

      if (!existing.receipt) {
        await tx.receipt.create({
          data: {
            tenantId: this.tenantContext.getTenantIdOrThrow(),
            number: await this.buildReceiptNumber(tx, paidAt),
            paymentId: id
          }
        });
      }

      return tx.payment.findUniqueOrThrow({
        where: { id },
        include: {
          plan: true,
          receipt: true,
          student: true
        }
      });
    }));

    await this.enqueueAutomaticReceiptCommunications(payment.id);
    return payment;
  }

  async remove(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: {
        id: true
      }
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    await this.prisma.payment.delete({
      where: { id }
    });
  }

  async generateReceiptPdf(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        plan: true,
        receipt: true,
        student: true
      }
    });

    if (!payment || payment.status !== PaymentStatus.PAID || !payment.receipt || !payment.paidAt) {
      throw new NotFoundException('Recibo não disponível para este pagamento.');
    }

    const billingName = payment.student.isMinor
      ? payment.student.responsibleName ?? payment.student.fullName
      : payment.student.fullName;
    const billingTaxId = payment.student.isMinor
      ? payment.student.responsibleTaxId ?? payment.student.taxId
      : payment.student.taxId;
    const billingPhone = payment.student.isMinor
      ? payment.student.responsiblePhone ?? payment.student.phone
      : payment.student.phone;

    if (!billingTaxId || !billingPhone) {
      throw new BadRequestException(
        'O aluno não tem os dados fiscais completos para emitir o recibo.'
      );
    }

    const branding = await this.getReceiptBranding(payment.tenantId);
    const buffer = await buildReceiptPdf(
      {
        amountCents: payment.amountCents,
        billingName,
        billingPhone,
        billingTaxId,
        competencyMonth: payment.competencyMonth,
        description: this.billingService.buildPaymentDescription({
          competencyMonth: payment.competencyMonth,
          method: payment.method,
          planName: payment.plan?.name ?? null,
          studentName: payment.student.fullName
        }),
        dueDate: payment.dueDate,
        issuer: branding.issuer,
        method: payment.method,
        paidAt: payment.paidAt,
        planName: payment.plan?.name ?? null,
        receiptNumber: payment.receipt.number,
        responsibleName: payment.student.isMinor
          ? payment.student.responsibleName ?? null
          : null,
        signatureLabel: branding.signatureLabel,
        studentName: payment.student.fullName
      },
      branding.logoUrl
    );

    return {
      buffer,
      filename: `recibo-${payment.receipt.number}.pdf`
    };
  }

  async emailReceipt(id: string, overrideEmail?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { student: true, receipt: true }
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    const recipient = (overrideEmail ?? payment.student.email ?? '').trim();
    if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      throw new BadRequestException(
        'O aluno não tem email registado. Indique um email no pedido para enviar o recibo.'
      );
    }

    const job = await this.enqueueReceiptEmail(id, recipient);
    const filename = `recibo-${payment.receipt?.number}.pdf`;

    return {
      queued: true,
      jobId: job.id,
      status: job.status,
      to: recipient,
      filename
    };
  }

  private async enqueueAutomaticReceiptCommunications(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { student: true, receipt: true }
    });

    if (!payment || payment.status !== PaymentStatus.PAID || !payment.receipt) {
      return;
    }

    const existingEmailJob = await this.prisma.emailJob.findFirst({
      where: {
        referenceType: 'receipt:auto',
        referenceId: id
      },
      select: { id: true }
    });

    if (!existingEmailJob && payment.student.email) {
      try {
        await this.enqueueReceiptEmail(id, payment.student.email, 'receipt:auto');
      } catch (error) {
        this.logger.warn(
          `Não foi possível agendar email automático do recibo ${id}: ${this.formatBackgroundError(error)}`
        );
      }
    }

    const phone = normalizeWhatsappNumber(
      payment.student.isMinor
        ? payment.student.responsiblePhone ?? payment.student.phone
        : payment.student.phone
    );
    const existingWhatsappJob = await this.prisma.whatsappJob.findFirst({
      where: {
        referenceType: 'receipt:auto',
        referenceId: id
      },
      select: { id: true }
    });

    if (!existingWhatsappJob && phone) {
      try {
        await this.enqueueReceiptWhatsapp(id, phone, 'receipt:auto');
      } catch (error) {
        this.logger.warn(
          `Não foi possível agendar WhatsApp automático do recibo ${id}: ${this.formatBackgroundError(error)}`
        );
      }
    }
  }

  private async enqueueReceiptEmail(
    id: string,
    recipient: string,
    referenceType = 'receipt'
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { student: true, receipt: true }
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    const { buffer, filename } = await this.generateReceiptPdf(id);
    const { issuer } = await this.getReceiptBranding(payment.tenantId);
    const subject = `Recibo ${payment.receipt?.number ?? ''} · ${issuer}`.trim();
    const greeting = payment.student.isMinor && payment.student.responsibleName
      ? payment.student.responsibleName
      : payment.student.fullName;

    const text =
      `Olá ${greeting},\n\n` +
      `Em anexo o recibo referente ao pagamento da mensalidade.\n\n` +
      `Cumprimentos,\n${issuer}`;
    const html =
      `<p>Olá <strong>${escapeHtml(greeting)}</strong>,</p>` +
      `<p>Em anexo o recibo referente ao pagamento da mensalidade.</p>` +
      `<p>Cumprimentos,<br/>${escapeHtml(issuer)}</p>`;

    return this.mailQueueService.enqueue(
      {
        to: recipient,
        subject,
        text,
        html,
        attachments: [
          { filename, content: buffer, contentType: 'application/pdf' }
        ]
      },
      {
        referenceType,
        referenceId: id
      }
    );
  }

  private async enqueueReceiptWhatsapp(
    id: string,
    number: string,
    referenceType = 'receipt'
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { student: true, receipt: true }
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    const { filename } = await this.generateReceiptPdf(id);
    const { issuer } = await this.getReceiptBranding(payment.tenantId);
    const greeting = payment.student.isMinor && payment.student.responsibleName
      ? payment.student.responsibleName
      : payment.student.fullName;
    const publicApiBaseUrl = this.configService.get<string>('PUBLIC_API_BASE_URL')?.replace(/\/$/, '');
    const tokenSecret = this.configService.get<string>('RECEIPT_PUBLIC_TOKEN_SECRET');

    if (!publicApiBaseUrl || !tokenSecret) {
      throw new BadRequestException(
        'Envio por WhatsApp não configurado. Defina PUBLIC_API_BASE_URL e RECEIPT_PUBLIC_TOKEN_SECRET.'
      );
    }

    const token = createPublicReceiptToken({
      paymentId: id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      secret: tokenSecret
    });
    const url = `${publicApiBaseUrl}/public/receipts/${token}.pdf`;

    return this.whatsappQueueService.enqueue(
      {
        number,
        type: 'document',
        url,
        filename,
        caption:
          `Olá ${greeting}, segue em anexo o recibo referente ao pagamento da mensalidade.\n\n` +
          `Cumprimentos,\n${issuer}`
      },
      {
        referenceType,
        referenceId: id
      }
    );
  }

  private formatBackgroundError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  async generateCurrentMonthCharges() {
    return this.billingService.generateCurrentMonthCharges();
  }

  private resolveStatus(status: PaymentStatus | undefined, dueDate: Date) {
    if (status === PaymentStatus.PAID) {
      return PaymentStatus.PAID;
    }

    if (status === PaymentStatus.OVERDUE) {
      return PaymentStatus.OVERDUE;
    }

    return dueDate < new Date() ? PaymentStatus.OVERDUE : PaymentStatus.PENDING;
  }

  private async buildReceiptNumber(
    tx: TenantTx,
    issuedAt: Date
  ) {
    const monthStart = new Date(issuedAt.getFullYear(), issuedAt.getMonth(), 1);
    const nextMonthStart = new Date(
      issuedAt.getFullYear(),
      issuedAt.getMonth() + 1,
      1
    );
    const currentCount = await tx.receipt.count({
      where: {
        issuedAt: {
          gte: monthStart,
          lt: nextMonthStart
        }
      }
    });

    const year = issuedAt.getFullYear();
    const month = String(issuedAt.getMonth() + 1).padStart(2, '0');
    const sequence = String(currentCount + 1).padStart(4, '0');

    return `ESAF-${year}${month}-${sequence}`;
  }

  private async withReceiptNumberingRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isUniqueViolation =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';

        if (isUniqueViolation && attempt < maxRetries) {
          this.logger.warn(
            `Conflito de numeração de recibo, tentativa ${attempt + 1}/${maxRetries}`,
          );
          continue;
        }

        throw error;
      }
    }

    throw new Error('Não foi possível gerar o número do recibo após várias tentativas.');
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
