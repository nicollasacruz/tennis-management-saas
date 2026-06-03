const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

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
Cria ou atualiza o dono da plataforma (acesso ao painel /gerencial).

Uso:
  npm run platform:create-owner -- --name "Dono SaaS" --email dono@clubtenispro.com --password "senha-forte"

Opções:
  --name       Nome completo do dono
  --email      Email único do dono
  --password   Password em texto plano; guardada com hash bcrypt
  --help       Mostra esta ajuda

Também pode usar variáveis de ambiente:
  PLATFORM_OWNER_NAME
  PLATFORM_OWNER_EMAIL
  PLATFORM_OWNER_PASSWORD
`);
}

function pick(args, key, envKey) {
  return args[key] ?? process.env[envKey];
}

function requireValue(label, value) {
  if (!value || !String(value).trim()) {
    throw new Error(`${label} é obrigatório.`);
  }

  return String(value).trim();
}

function validateEmail(email) {
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Email inválido.');
  }

  return email.toLowerCase();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true') {
    printUsage();
    return;
  }

  const fullName = requireValue(
    'Nome',
    pick(args, 'name', 'PLATFORM_OWNER_NAME')
  );
  const email = validateEmail(
    requireValue('Email', pick(args, 'email', 'PLATFORM_OWNER_EMAIL'))
  );
  const password = requireValue(
    'Password',
    pick(args, 'password', 'PLATFORM_OWNER_PASSWORD')
  );

  const hashedPassword = await bcrypt.hash(password, 10);

  const owner = await prisma.platformUser.upsert({
    where: { email },
    update: { fullName, password: hashedPassword, isActive: true },
    create: { email, fullName, password: hashedPassword },
    select: { id: true, email: true, fullName: true, isActive: true },
  });

  console.log('Dono da plataforma criado/atualizado com sucesso.');
  console.log(`ID: ${owner.id}`);
  console.log(`Nome: ${owner.fullName}`);
  console.log(`Email: ${owner.email}`);
  console.log(`Ativo: ${owner.isActive ? 'sim' : 'não'}`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
