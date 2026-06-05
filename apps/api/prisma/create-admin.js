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
  npm run user:create-admin -- --name "Admin Demo" --email admin@demo.clubtenispro.com --password "senha-forte"

Opções:
  --name       Nome completo do utilizador admin
  --email      Email único do utilizador admin
  --password   Password em texto plano; será guardada com hash bcrypt
  --phone      Telefone opcional
  --notes      Notas internas opcionais
  --tenant     Slug do tenant; por omissão usa DEFAULT_TENANT_SLUG ou demo
  --help       Mostra esta ajuda

Também pode usar variáveis de ambiente:
  ADMIN_NAME
  ADMIN_EMAIL
  ADMIN_PASSWORD
  ADMIN_PHONE
  ADMIN_NOTES
  ADMIN_TENANT_SLUG
  DEFAULT_TENANT_SLUG
  TENANT_PRIMARY_HOST
  SAAS_ROOT_DOMAIN
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

function validateSlug(slug) {
  const normalized = String(slug).trim().toLowerCase();

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(normalized)) {
    throw new Error('Slug do tenant inválido.');
  }

  return normalized;
}

function buildPrimaryHost(slug) {
  const explicitHost = process.env.TENANT_PRIMARY_HOST?.trim();

  if (explicitHost) {
    return explicitHost.toLowerCase();
  }

  const rootDomain = process.env.SAAS_ROOT_DOMAIN?.trim() || 'tenis.clubtenispro.com';
  return `${slug}.${rootDomain}`.toLowerCase();
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
  const tenantSlug = validateSlug(
    pick(args, 'tenant', 'ADMIN_TENANT_SLUG') ??
      process.env.DEFAULT_TENANT_SLUG ??
      'demo'
  );
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      name: process.env.TENANT_NAME?.trim() || tenantSlug.toUpperCase(),
      slug: tenantSlug,
      primaryHost: buildPrimaryHost(tenantSlug),
      receiptIssuer: process.env.RECEIPT_ISSUER,
      receiptSignatureLabel: process.env.RECEIPT_SIGNATURE_LABEL
    }
  });

  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await prisma.systemUser.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email
      }
    }
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
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email
          }
        },
        data: payload,
        select: {
          id: true,
          tenantId: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true
        }
      })
    : await prisma.systemUser.create({
        data: {
          tenantId: tenant.id,
          email,
          ...payload
        },
        select: {
          id: true,
          tenantId: true,
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
  console.log(`Tenant: ${tenant.slug} (${user.tenantId})`);
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
