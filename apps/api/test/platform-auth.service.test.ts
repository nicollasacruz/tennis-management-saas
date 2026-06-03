import 'reflect-metadata';
import assert from 'node:assert/strict';
import * as bcrypt from 'bcrypt';
import { PlatformAuthService } from '../src/platform/platform-auth.service';

async function main() {
  const passwordHash = await bcrypt.hash('correct-horse', 10);

  const owner = {
    id: 'po_1',
    email: 'dono@clubtenispro.com',
    fullName: 'Dono SaaS',
    password: passwordHash,
    isActive: true,
  };

  let current = owner;
  const prisma = {
    platformUser: {
      findUnique: async ({ where }: any) =>
        where.email === owner.email ? { ...current } : null,
    },
  };

  const jwt = { sign: () => 'signed-token' };
  const service = new PlatformAuthService(prisma as any, jwt as any);

  // Login válido.
  const ok = await service.login('dono@clubtenispro.com', 'correct-horse');
  assert.equal(ok.access_token, 'signed-token');
  assert.equal(ok.user.email, owner.email);
  assert.equal(ok.user.fullName, owner.fullName);
  assert.equal((ok.user as any).password, undefined);

  // Email normalizado (case-insensitive).
  const okUpper = await service.login('DONO@clubtenispro.com', 'correct-horse');
  assert.equal(okUpper.access_token, 'signed-token');

  // Password errada.
  await assert.rejects(
    () => service.login('dono@clubtenispro.com', 'wrong'),
    /Credenciais inválidas/,
  );

  // Utilizador inativo.
  current = { ...owner, isActive: false };
  await assert.rejects(
    () => service.login('dono@clubtenispro.com', 'correct-horse'),
    /Credenciais inválidas/,
  );
  current = owner;

  // Email desconhecido.
  await assert.rejects(
    () => service.login('outro@x.com', 'correct-horse'),
    /Credenciais inválidas/,
  );

  // Campos em falta.
  await assert.rejects(() => service.login('', ''), /obrigatórios/);

  console.log('platform-auth.service: OK');
}

void main();
