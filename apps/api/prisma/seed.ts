import {
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  SystemUserRole
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Clube de Ténis Demo',
      primaryHost: 'demo.clubtenispro.com',
      receiptIssuer: 'Clube de Ténis Demo',
      receiptSignatureLabel: 'Direção Clube Demo'
    },
    create: {
      id: 'tenant_demo',
      name: 'Clube de Ténis Demo',
      slug: 'demo',
      primaryHost: 'demo.clubtenispro.com',
      receiptIssuer: 'Clube de Ténis Demo',
      receiptSignatureLabel: 'Direção Clube Demo'
    }
  });

  // Migra a instância Evolution global (env) para a config por-tenant do tenant demo,
  // preservando o WhatsApp atual. Servidor Evolution API continua partilhado.
  const evolutionInstanceId = (
    process.env.EVOLUTION_API_INSTANCE_ID ??
    process.env.EVOLUTION_GO_INSTANCE_ID
  )?.trim();
  const evolutionInstanceToken = (
    process.env.EVOLUTION_API_INSTANCE_TOKEN ??
    process.env.EVOLUTION_GO_INSTANCE_TOKEN
  )?.trim();
  const hasEvolutionEnv =
    !!evolutionInstanceId &&
    evolutionInstanceId !== 'CHANGE_ME' &&
    !!evolutionInstanceToken &&
    evolutionInstanceToken !== 'CHANGE_ME';

  await prisma.tenantWhatsappConfig.upsert({
    where: { tenantId: demoTenant.id },
    update: hasEvolutionEnv
      ? {
          instanceId: evolutionInstanceId,
          instanceToken: evolutionInstanceToken
        }
      : {},
    create: {
      tenantId: demoTenant.id,
      instanceName: 'demo',
      instanceId: hasEvolutionEnv ? evolutionInstanceId : null,
      instanceToken: hasEvolutionEnv ? evolutionInstanceToken : null
    }
  });

  const basePlan = await prisma.plan.upsert({
    where: { tenantId_name: { tenantId: demoTenant.id, name: 'Escola Base' } },
    update: {
      description: 'Plano mensal com foco em evolução técnica.',
      monthlyFeeCents: 6500,
      sessionCount: 8
    },
    create: {
      tenantId: demoTenant.id,
      name: 'Escola Base',
      description: 'Plano mensal com foco em evolução técnica.',
      monthlyFeeCents: 6500,
      sessionCount: 8
    }
  });

  const competitionPlan = await prisma.plan.upsert({
    where: { tenantId_name: { tenantId: demoTenant.id, name: 'Competição' } },
    update: {
      description: 'Treino intensivo para atletas em competição.',
      monthlyFeeCents: 11000,
      sessionCount: 16
    },
    create: {
      tenantId: demoTenant.id,
      name: 'Competição',
      description: 'Treino intensivo para atletas em competição.',
      monthlyFeeCents: 11000,
      sessionCount: 16
    }
  });

  const kidsPlan = await prisma.plan.upsert({
    where: { tenantId_name: { tenantId: demoTenant.id, name: 'Kids' } },
    update: {
      description: 'Introdução lúdica ao ténis para crianças.',
      monthlyFeeCents: 5200,
      sessionCount: 6
    },
    create: {
      tenantId: demoTenant.id,
      name: 'Kids',
      description: 'Introdução lúdica ao ténis para crianças.',
      monthlyFeeCents: 5200,
      sessionCount: 6
    }
  });

  const joao = await prisma.student.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'joao@demo.clubtenispro.com' } },
    update: {
      fullName: 'João Matos',
      currentPlanId: competitionPlan.id,
      phone: '+351 910 000 001',
      taxId: '245778910'
    },
    create: {
      tenantId: demoTenant.id,
      fullName: 'João Matos',
      email: 'joao@demo.clubtenispro.com',
      phone: '+351 910 000 001',
      taxId: '245778910',
      currentPlanId: competitionPlan.id
    }
  });

  const rita = await prisma.student.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'rita@demo.clubtenispro.com' } },
    update: {
      fullName: 'Rita Nunes',
      currentPlanId: basePlan.id,
      phone: '+351 910 000 002',
      taxId: '214889560'
    },
    create: {
      tenantId: demoTenant.id,
      fullName: 'Rita Nunes',
      email: 'rita@demo.clubtenispro.com',
      phone: '+351 910 000 002',
      taxId: '214889560',
      currentPlanId: basePlan.id
    }
  });

  const ines = await prisma.student.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'ines@demo.clubtenispro.com' } },
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
      tenantId: demoTenant.id,
      fullName: 'Inês Duarte',
      email: 'ines@demo.clubtenispro.com',
      isMinor: true,
      phone: '+351 910 000 003',
      responsibleName: 'Carla Duarte',
      responsiblePhone: '+351 910 000 900',
      responsibleTaxId: '233445678',
      currentPlanId: kidsPlan.id
    }
  });

  const paymentCount = await prisma.payment.count({
    where: { tenantId: demoTenant.id }
  });
  const userCount = await prisma.systemUser.count({
    where: { tenantId: demoTenant.id }
  });

  if (paymentCount === 0) {
    await prisma.payment.create({
      data: {
        tenantId: demoTenant.id,
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
            tenantId: demoTenant.id,
            number: 'REC-202603-0001'
          }
        }
      }
    });

    await prisma.payment.create({
      data: {
        tenantId: demoTenant.id,
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
        tenantId: demoTenant.id,
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
    // Senha padrão para usuários de demonstração: "demo1234"
    const defaultPassword = await bcrypt.hash('demo1234', 10);
    
    await prisma.systemUser.createMany({
      data: [
        {
          email: 'ricardo@demo.clubtenispro.com',
          tenantId: demoTenant.id,
          password: defaultPassword,
          fullName: 'Ricardo Esteves',
          phone: '+351 910 100 001',
          role: SystemUserRole.HEAD_COACH
        },
        {
          email: 'marta@demo.clubtenispro.com',
          tenantId: demoTenant.id,
          password: defaultPassword,
          fullName: 'Marta Correia',
          phone: '+351 910 100 002',
          role: SystemUserRole.FINANCE
        },
        {
          email: 'sofia@demo.clubtenispro.com',
          tenantId: demoTenant.id,
          password: defaultPassword,
          fullName: 'Sofia Lopes',
          phone: '+351 910 100 003',
          role: SystemUserRole.DESK
        }
      ]
    });
    
    console.log('✅ Utilizadores de demonstração criados:');
    console.log('   - ricardo@demo.clubtenispro.com / demo1234 (HEAD_COACH)');
    console.log('   - marta@demo.clubtenispro.com / demo1234 (FINANCE)');
    console.log('   - sofia@demo.clubtenispro.com / demo1234 (DESK)');
  }

  const activityCount = await prisma.activity.count({
    where: { tenantId: demoTenant.id }
  });

  if (activityCount === 0) {
    await prisma.activity.createMany({
      data: [
        {
          tenantId: demoTenant.id,
          title: 'I Torneio Juvenil Demo',
          description:
            'Arranque da época competitiva juvenil nas nossas instalações. Prova destinada aos mais jovens, com espírito formativo.',
          category: 'Juvenil',
          startDate: new Date('2026-04-25T00:00:00.000Z'),
          endDate: new Date('2026-04-26T00:00:00.000Z')
        },
        {
          tenantId: demoTenant.id,
          title: 'II Torneio Juvenil Demo',
          description:
            'Segunda etapa do circuito interno, consolidando a experiência competitiva dos atletas da formação.',
          category: 'Juvenil',
          startDate: new Date('2026-05-23T00:00:00.000Z'),
          endDate: new Date('2026-05-24T00:00:00.000Z')
        },
        {
          tenantId: demoTenant.id,
          title: 'Barcelos Open',
          description:
            'Prova de referência no calendário nacional, disputada nos courts do clube. Os nossos atletas competem frente a adversários de todo o país, no palco que chamam de casa.',
          category: 'Nacional',
          startDate: new Date('2026-08-01T00:00:00.000Z')
        }
      ]
    });

    console.log('✅ Atividades de demonstração criadas:');
    console.log('   - I Torneio Juvenil Demo (25–26 Abr 2026)');
    console.log('   - II Torneio Juvenil Demo (23–24 Mai 2026)');
    console.log('   - Barcelos Open (Ago 2026)');
  }

  // Courts + horários de aulas (demo). dayOfWeek: 1=Seg, 2=Ter, 3=Qua.
  // Horas em minutos desde 00:00 (1020=17:00, 1080=18:00, 1140=19:00, 1200=20:00).
  const court1 = await prisma.court.upsert({
    where: { tenantId_name: { tenantId: demoTenant.id, name: 'Court 1' } },
    update: { surface: 'Terra batida', sortOrder: 0 },
    create: {
      tenantId: demoTenant.id,
      name: 'Court 1',
      surface: 'Terra batida',
      sortOrder: 0
    }
  });

  const court2 = await prisma.court.upsert({
    where: { tenantId_name: { tenantId: demoTenant.id, name: 'Court 2' } },
    update: { surface: 'Piso rápido', sortOrder: 1 },
    create: {
      tenantId: demoTenant.id,
      name: 'Court 2',
      surface: 'Piso rápido',
      sortOrder: 1
    }
  });

  const classSlotCount = await prisma.classSlot.count({
    where: { tenantId: demoTenant.id }
  });

  if (classSlotCount === 0) {
    const headCoach = await prisma.systemUser.findFirst({
      where: { tenantId: demoTenant.id, role: SystemUserRole.HEAD_COACH },
      select: { id: true }
    });

    const subTen = await prisma.classSlot.create({
      data: {
        tenantId: demoTenant.id,
        courtId: court1.id,
        title: 'SUB-10 Iniciação',
        dayOfWeek: 1,
        startMin: 1020,
        endMin: 1080,
        capacity: 6,
        coachId: headCoach?.id ?? null
      }
    });

    const competicao = await prisma.classSlot.create({
      data: {
        tenantId: demoTenant.id,
        courtId: court1.id,
        title: 'Competição',
        dayOfWeek: 3,
        startMin: 1080,
        endMin: 1200,
        capacity: 4,
        coachId: headCoach?.id ?? null
      }
    });

    const adultos = await prisma.classSlot.create({
      data: {
        tenantId: demoTenant.id,
        courtId: court2.id,
        title: 'Adultos',
        dayOfWeek: 2,
        startMin: 1140,
        endMin: 1200,
        capacity: 8
      }
    });

    await prisma.classEnrollment.createMany({
      data: [
        { tenantId: demoTenant.id, classSlotId: subTen.id, studentId: ines.id },
        { tenantId: demoTenant.id, classSlotId: competicao.id, studentId: joao.id },
        { tenantId: demoTenant.id, classSlotId: adultos.id, studentId: rita.id }
      ]
    });

    console.log('✅ Courts e horários de demonstração criados:');
    console.log('   - Court 1 (Terra batida), Court 2 (Piso rápido)');
    console.log('   - SUB-10 (Seg 17h), Competição (Qua 18h), Adultos (Ter 19h)');
  }

  // Super admin do SaaS (dono da plataforma, painel /gerencial). NÃO é um
  // utilizador de tenant — vive no apex, auth separada. Apenas demo/dev: em
  // produção, criar com `npm run platform:create-owner -- --email ... --password ...`.
  if (process.env.NODE_ENV !== 'production') {
    const ownerPassword = await bcrypt.hash('dono123', 10);
    await prisma.platformUser.upsert({
      where: { email: 'dono@clubtenispro.com' },
      update: {},
      create: {
        email: 'dono@clubtenispro.com',
        fullName: 'Dono ClubTenisPro',
        password: ownerPassword
      }
    });

    console.log('✅ Super admin do SaaS (demo) criado:');
    console.log('   - dono@clubtenispro.com / dono123 (painel /gerencial)');
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
