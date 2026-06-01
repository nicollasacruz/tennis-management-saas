import assert from 'node:assert/strict';
import { resolveJwtSecret } from '../src/auth/jwt-secret';

const origEnv = process.env.NODE_ENV;
const origSecret = process.env.JWT_SECRET;

// dev sem JWT_SECRET -> usa fallback local
delete process.env.JWT_SECRET;
process.env.NODE_ENV = 'development';
assert.ok(resolveJwtSecret().length > 0);

// com JWT_SECRET -> usa o valor do ambiente
process.env.JWT_SECRET = 'super-secret-xyz';
assert.equal(resolveJwtSecret(), 'super-secret-xyz');

// produção sem JWT_SECRET -> lança (sem segredo público)
delete process.env.JWT_SECRET;
process.env.NODE_ENV = 'production';
assert.throws(() => resolveJwtSecret(), /JWT_SECRET/);

// produção com JWT_SECRET -> ok
process.env.JWT_SECRET = 'prod-secret';
assert.equal(resolveJwtSecret(), 'prod-secret');

// restaura ambiente
if (origEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = origEnv;
if (origSecret === undefined) delete process.env.JWT_SECRET;
else process.env.JWT_SECRET = origSecret;

console.log('jwt-secret: OK');
