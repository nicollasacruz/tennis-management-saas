const { PrismaClient, SystemUserRole } = require('@prisma/client');
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
Cria ou promove um utilizador admin.

Uso:
  npm run user:create-admin -- --name "Admin ESAF" --email admin@esaf.pt --password "senha-forte"

Opções:
  --name       Nome completo do utilizador admin
  --email      Email único do utilizador admin
  --password   Password em texto plano; será guardada com hash bcrypt
  --phone      Telefone opcional
  --notes      Notas internas opcionais
  --help       Mostra esta ajuda

Também pode usar variáveis de ambiente:
  ADMIN_NAME
  ADMIN_EMAIL
  ADMIN_PASSWORD
  ADMIN_PHONE
  ADMIN_NOTES
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

  const fullName = requireValue('Nome', pick(args, 'name', 'ADMIN_NAME'));
  const email = validateEmail(
    requireValue('Email', pick(args, 'email', 'ADMIN_EMAIL'))
  );
  const password = requireValue(
    'Password',
    pick(args, 'password', 'ADMIN_PASSWORD')
  );
  const phone = pick(args, 'phone', 'ADMIN_PHONE');
  const notes = pick(args, 'notes', 'ADMIN_NOTES');

  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await prisma.systemUser.findUnique({
    where: { email }
  });

  const payload = {
    fullName,
    isActive: true,
    password: hashedPassword,
    role: SystemUserRole.ADMIN,
    ...(phone !== undefined ? { phone } : {}),
    ...(notes !== undefined ? { notes } : {})
  };

  const user = existing
    ? await prisma.systemUser.update({
        where: { email },
        data: payload,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true
        }
      })
    : await prisma.systemUser.create({
        data: {
          email,
          ...payload
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true
        }
      });

  console.log(
    existing
      ? 'Utilizador existente atualizado para admin com sucesso.'
      : 'Utilizador admin criado com sucesso.'
  );
  console.log(`ID: ${user.id}`);
  console.log(`Nome: ${user.fullName}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log(`Ativo: ${user.isActive ? 'sim' : 'não'}`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
