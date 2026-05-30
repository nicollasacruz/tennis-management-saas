const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function printUsage() {
  console.log(`
Apaga todos os pagamentos de uma competência mensal.

Uso:
  npm run payments:delete-month -- --month 2026-04

Opções:
  --month     Mês no formato YYYY-MM. Se omitido, usa o mês corrente.
  --help      Mostra esta ajuda.

Variável de ambiente opcional:
  PAYMENTS_MONTH
`);
}

function resolveMonth(rawValue) {
  const monthValue =
    rawValue ?? process.env.PAYMENTS_MONTH ?? getCurrentMonthValue();

  if (!/^\d{4}-\d{2}$/.test(monthValue)) {
    throw new Error('Mês inválido. Use o formato YYYY-MM.');
  }

  const [year, month] = monthValue.split('-').map(Number);

  if (month < 1 || month > 12) {
    throw new Error('Mês inválido. O mês deve estar entre 01 e 12.');
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));

  return { monthStart, monthValue, nextMonthStart };
}

function getCurrentMonthValue() {
  const now = new Date();
  return [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0')
  ].join('-');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true') {
    printUsage();
    return;
  }

  const { monthStart, monthValue, nextMonthStart } = resolveMonth(args.month);

  const total = await prisma.payment.count({
    where: {
      competencyMonth: {
        gte: monthStart,
        lt: nextMonthStart
      }
    }
  });

  if (total === 0) {
    console.log(`Nenhum pagamento encontrado para ${monthValue}.`);
    return;
  }

  const result = await prisma.payment.deleteMany({
    where: {
      competencyMonth: {
        gte: monthStart,
        lt: nextMonthStart
      }
    }
  });

  console.log(`Pagamentos removidos com sucesso para ${monthValue}.`);
  console.log(`Total removido: ${result.count}`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
