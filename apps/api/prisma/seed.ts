import {
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  SystemUserRole
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const esafTenant = await prisma.tenant.upsert({
    where: { slug: 'esaf' },
    update: {
      name: 'ESAF - Escola de Tenis',
      primaryHost: 'esaf.tenis.esaf.run.place',
      receiptIssuer: 'ESAF - Escola de Tenis',
      receiptSignatureLabel: 'Direcao ESAF'
    },
    create: {
      id: 'tenant_esaf',
      name: 'ESAF - Escola de Tenis',
      slug: 'esaf',
      primaryHost: 'esaf.tenis.esaf.run.place',
      receiptIssuer: 'ESAF - Escola de Tenis',
      receiptSignatureLabel: 'Direcao ESAF'
    }
  });

  const basePlan = await prisma.plan.upsert({
    where: { name: 'Escola Base' },
    update: {
      description: 'Plano mensal com foco em evolução técnica.',
      monthlyFeeCents: 6500,
      sessionCount: 8
    },
    create: {
      name: 'Escola Base',
      description: 'Plano mensal com foco em evolução técnica.',
      monthlyFeeCents: 6500,
      sessionCount: 8
    }
  });

  const competitionPlan = await prisma.plan.upsert({
    where: { name: 'Competição' },
    update: {
      description: 'Treino intensivo para atletas em competição.',
      monthlyFeeCents: 11000,
      sessionCount: 16
    },
    create: {
      name: 'Competição',
      description: 'Treino intensivo para atletas em competição.',
      monthlyFeeCents: 11000,
      sessionCount: 16
    }
  });

  const kidsPlan = await prisma.plan.upsert({
    where: { name: 'Kids' },
    update: {
      description: 'Introdução lúdica ao ténis para crianças.',
      monthlyFeeCents: 5200,
      sessionCount: 6
    },
    create: {
      name: 'Kids',
      description: 'Introdução lúdica ao ténis para crianças.',
      monthlyFeeCents: 5200,
      sessionCount: 6
    }
  });

  const joao = await prisma.student.upsert({
    where: { email: 'joao@esaf.local' },
    update: {
      fullName: 'João Matos',
      currentPlanId: competitionPlan.id,
      phone: '+351 910 000 001',
      taxId: '245778910'
    },
    create: {
      fullName: 'João Matos',
      email: 'joao@esaf.local',
      phone: '+351 910 000 001',
      taxId: '245778910',
      currentPlanId: competitionPlan.id
    }
  });

  const rita = await prisma.student.upsert({
    where: { email: 'rita@esaf.local' },
    update: {
      fullName: 'Rita Nunes',
      currentPlanId: basePlan.id,
      phone: '+351 910 000 002',
      taxId: '214889560'
    },
    create: {
      fullName: 'Rita Nunes',
      email: 'rita@esaf.local',
      phone: '+351 910 000 002',
      taxId: '214889560',
      currentPlanId: basePlan.id
    }
  });

  const ines = await prisma.student.upsert({
    where: { email: 'ines@esaf.local' },
    update: {
      fullName: 'Inês Duarte',
      currentPlanId: kidsPlan.id,
      isMinor: true,
      phone: '+351 910 000 003',
      responsibleName: 'Carla Duarte',
      responsiblePhone: '+351 910 000 900',
      responsibleTaxId: '233445678'
    },
    create: {
      fullName: 'Inês Duarte',
      email: 'ines@esaf.local',
      isMinor: true,
      phone: '+351 910 000 003',
      responsibleName: 'Carla Duarte',
      responsiblePhone: '+351 910 000 900',
      responsibleTaxId: '233445678',
      currentPlanId: kidsPlan.id
    }
  });

  const paymentCount = await prisma.payment.count();
  const userCount = await prisma.systemUser.count({
    where: { tenantId: esafTenant.id }
  });

  if (paymentCount === 0) {
    await prisma.payment.create({
      data: {
        studentId: joao.id,
        planId: competitionPlan.id,
        description: 'Mensalidade Competição',
        competencyMonth: new Date('2026-03-01T00:00:00.000Z'),
        dueDate: new Date('2026-03-08T00:00:00.000Z'),
        paidAt: new Date('2026-03-05T00:00:00.000Z'),
        amountCents: 11000,
        method: PaymentMethod.MBWAY,
        status: PaymentStatus.PAID,
        receipt: {
          create: {
            number: 'ESAF-202603-0001'
          }
        }
      }
    });

    await prisma.payment.create({
      data: {
        studentId: rita.id,
        planId: basePlan.id,
        description: 'Mensalidade Escola Base',
        competencyMonth: new Date('2026-03-01T00:00:00.000Z'),
        dueDate: new Date('2026-03-10T00:00:00.000Z'),
        amountCents: 6500,
        status: PaymentStatus.PENDING
      }
    });

    await prisma.payment.create({
      data: {
        studentId: ines.id,
        planId: kidsPlan.id,
        description: 'Mensalidade Kids',
        competencyMonth: new Date('2026-02-01T00:00:00.000Z'),
        dueDate: new Date('2026-02-10T00:00:00.000Z'),
        amountCents: 5200,
        status: PaymentStatus.OVERDUE
      }
    });
  }

  if (userCount === 0 && process.env.NODE_ENV !== 'production') {
    // Senha padrão para usuários de demonstração: "esaf123"
    const defaultPassword = await bcrypt.hash('esaf123', 10);
    
    await prisma.systemUser.createMany({
      data: [
        {
          email: 'ricardo@esaf.local',
          tenantId: esafTenant.id,
          password: defaultPassword,
          fullName: 'Ricardo Esteves',
          phone: '+351 910 100 001',
          role: SystemUserRole.HEAD_COACH
        },
        {
          email: 'marta@esaf.local',
          tenantId: esafTenant.id,
          password: defaultPassword,
          fullName: 'Marta Correia',
          phone: '+351 910 100 002',
          role: SystemUserRole.FINANCE
        },
        {
          email: 'sofia@esaf.local',
          tenantId: esafTenant.id,
          password: defaultPassword,
          fullName: 'Sofia Lopes',
          phone: '+351 910 100 003',
          role: SystemUserRole.DESK
        }
      ]
    });
    
    console.log('✅ Utilizadores de demonstração criados:');
    console.log('   - ricardo@esaf.local / esaf123 (HEAD_COACH)');
    console.log('   - marta@esaf.local / esaf123 (FINANCE)');
    console.log('   - sofia@esaf.local / esaf123 (DESK)');
  }

  const activityCount = await prisma.activity.count();

  if (activityCount === 0) {
    await prisma.activity.createMany({
      data: [
        {
          title: 'I Torneio Juvenil ESAF',
          description:
            'Arranque da época competitiva juvenil nas nossas instalações. Prova destinada aos mais jovens, com espírito formativo.',
          category: 'Juvenil',
          startDate: new Date('2026-04-25T00:00:00.000Z'),
          endDate: new Date('2026-04-26T00:00:00.000Z')
        },
        {
          title: 'II Torneio Juvenil ESAF',
          description:
            'Segunda etapa do circuito interno, consolidando a experiência competitiva dos atletas da formação.',
          category: 'Juvenil',
          startDate: new Date('2026-05-23T00:00:00.000Z'),
          endDate: new Date('2026-05-24T00:00:00.000Z')
        },
        {
          title: 'Barcelos Open',
          description:
            'Prova de referência no calendário nacional, disputada nos courts da ESAF. Os nossos atletas competem frente a adversários de todo o país, no palco que chamam de casa.',
          category: 'Nacional',
          startDate: new Date('2026-08-01T00:00:00.000Z')
        }
      ]
    });

    console.log('✅ Atividades de demonstração criadas:');
    console.log('   - I Torneio Juvenil ESAF (25–26 Abr 2026)');
    console.log('   - II Torneio Juvenil ESAF (23–24 Mai 2026)');
    console.log('   - Barcelos Open (Ago 2026)');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
