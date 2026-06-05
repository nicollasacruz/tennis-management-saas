import assert from 'node:assert/strict';
import {
  extractTenantSlugFromHost,
  normalizeTenantHost,
  resolveRequestHost,
} from '../src/tenants/tenant-host';

assert.equal(normalizeTenantHost('DEMO.tenis.clubtenispro.com:443'), 'demo.tenis.clubtenispro.com');
assert.equal(normalizeTenantHost(' https://demo.tenis.clubtenispro.com/ '), 'demo.tenis.clubtenispro.com');
assert.equal(normalizeTenantHost(''), null);

assert.equal(
  resolveRequestHost({
    host: 'api-interno:3000',
    xForwardedHost: 'demo.tenis.clubtenispro.com, proxy.local',
  }),
  'demo.tenis.clubtenispro.com',
);

assert.equal(
  extractTenantSlugFromHost('demo.tenis.clubtenispro.com', 'tenis.clubtenispro.com'),
  'demo',
);
assert.equal(
  extractTenantSlugFromHost('demo.tenis.clubtenispro.com', 'tenis.clubtenispro.com'),
  'demo',
);
assert.equal(
  extractTenantSlugFromHost('tenis.clubtenispro.com', 'tenis.clubtenispro.com'),
  null,
);
assert.equal(
  extractTenantSlugFromHost('outro.exemplo.pt', 'tenis.clubtenispro.com'),
  null,
);
