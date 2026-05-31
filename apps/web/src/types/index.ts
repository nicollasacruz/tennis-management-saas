export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type CommunicationChannel = 'email' | 'whatsapp';
export type CommunicationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
export type PaymentMethod = 'MBWAY' | 'CASH' | 'BANK_TRANSFER' | 'CARD';
export type FirstMonthBillingPolicy = 'PRORATA' | 'FULL_WITH_MAKEUP';
export type StudentSex = 'FEMALE' | 'MALE' | 'OTHER';
export type SystemUserRole = 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'FINANCE' | 'DESK';
export type StudentAgeCategory =
  | 'SUB-10'
  | 'SUB-12'
  | 'SUB-14'
  | 'SUB-16'
  | 'SUB-18'
  | 'SENIOR';

export type Plan = {
  createdAt: string;
  description: string | null;
  id: string;
  monthlyFeeCents: number;
  name: string;
  sessionCount: number | null;
  updatedAt: string;
};

export type Student = {
  ageCategory: StudentAgeCategory | null;
  ageReferenceYear: number;
  birthDate: string | null;
  createdAt: string;
  currentPlan: Plan | null;
  currentPlanId: string | null;
  doesPhysicalTraining: boolean;
  currentStatusSince: string | null;
  email: string | null;
  enrollmentEndDate: string | null;
  enrollmentStartDate: string | null;
  firstMonthBillingPolicy: FirstMonthBillingPolicy;
  fullName: string;
  id: string;
  isActive: boolean;
  isMinor: boolean;
  licenseNumber: string | null;
  notes: string | null;
  paymentCount: number;
  phone: string | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  responsibleTaxId: string | null;
  sex: StudentSex | null;
  taxId: string | null;
  updatedAt: string;
};

export type StudentStatusHistoryEntry = {
  dayCount: number;
  endedAt: string | null;
  id: string;
  isActive: boolean;
  startedAt: string;
};

export type AttendanceType = 'TENNIS' | 'PHYSICAL';

export type Attendance = {
  attendanceDate: string;
  id: string;
  studentId: string;
  type: AttendanceType;
};

export type SystemUser = {
  createdAt: string;
  email: string;
  fullName: string;
  id: string;
  isActive: boolean;
  notes: string | null;
  phone: string | null;
  role: SystemUserRole;
  updatedAt: string;
};

export type Payment = {
  amountCents: number;
  competencyMonth: string;
  createdAt: string;
  description: string;
  dueDate: string;
  id: string;
  method: PaymentMethod | null;
  paidAt: string | null;
  plan: Plan | null;
  planId: string | null;
  receipt: { number: string } | null;
  status: PaymentStatus;
  student: {
    email: string | null;
    fullName: string;
    id: string;
  };
  studentId: string;
  updatedAt: string;
};

export type CommunicationJob = {
  id: string;
  channel: CommunicationChannel;
  status: CommunicationStatus;
  recipient: string;
  referenceType: string | null;
  referenceId: string | null;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  processingStartedAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardAgingBucket = '0-30' | '31-60' | '61-90' | '90+';

export type DashboardSummary = {
  activeStudents: number;
  activeTechnicalUsers: number;
  collectedThisMonthCents: number;
  overdueCount: number;
  pendingAmountCents: number;
  projectedMonthlyRevenueCents: number;
  receiptsIssued: number;
  collectionRate: number;
  avgTicketCents: number;
  newStudentsThisMonth: number;
  churnedThisMonth: number;
  attendancesThisMonth: { tennis: number; physical: number };
  methodMix: Array<{
    method: PaymentMethod;
    amountCents: number;
    count: number;
  }>;
  aging: Record<DashboardAgingBucket, { count: number; amountCents: number }>;
  planBreakdown: Array<{
    planId: string | null;
    planName: string;
    monthlyFeeCents: number;
    activeStudents: number;
  }>;
  yearChargedCents: number;
  yearCollectedCents: number;
  yearCollectionRate: number;
  growth: {
    students: {
      activeNow: number;
      activeMonthAgo: number;
      activeYearAgo: number;
      activeYearStart: number;
      momPct: number;
      yoyPct: number;
      ytdPct: number;
      netNewMonth: number;
      netNewYTD: number;
      addedYTD: number;
      churnedYTD: number;
    };
    revenue: {
      monthCollectedCents: number;
      prevMonthCollectedCents: number;
      sameMonthLastYearCollectedCents: number;
      ytdCollectedCents: number;
      priorYtdCollectedCents: number;
      momPct: number;
      yoyPct: number;
      ytdPct: number;
      arpuMonthCents: number;
      arpuPrevMonthCents: number;
      arpuMomPct: number;
    };
  };
  topDebtors: Array<{
    id: string;
    studentId: string;
    studentName: string;
    amountCents: number;
    dueDate: string;
    daysLate: number;
  }>;
  recentPayments: Array<{
    amountCents: number;
    id: string;
    paidAt: string;
    receiptNumber: string | null;
    studentName: string;
  }>;
};

export type DashboardYearly = {
  months: Array<{
    month: string;
    label: string;
    chargedCents: number;
    collectedCents: number;
    receipts: number;
    newStudents: number;
    churned: number;
  }>;
};

export type MonthlyChargeGenerationResult = {
  competencyMonth: string;
  createdCount: number;
  skippedCount: number;
  totalAmountCents: number;
};

export type User = {
  id: string;
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    primaryHost: string;
    slug: string;
  };
  email: string;
  fullName: string;
  role: string;
};

export type WhatsappConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export type WhatsappConfig = {
  configured: boolean;
  instanceId: string | null;
  instanceName: string | null;
  phoneNumber: string | null;
  hasToken: boolean;
  status: WhatsappConnectionStatus;
  lastConnectedAt: string | null;
  updatedAt: string | null;
};

export type WhatsappConnectResult = {
  config: WhatsappConfig;
  qrCodeBase64: string | null;
  qrCodeText: string | null;
};

export type Activity = {
  category: string;
  createdAt: string;
  description: string;
  endDate: string | null;
  id: string;
  isPublished: boolean;
  startDate: string;
  title: string;
  updatedAt: string;
};
