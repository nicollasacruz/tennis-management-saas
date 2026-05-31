import assert from 'node:assert/strict';
import {
  extractTenantSlugFromHost,
  normalizeTenantHost,
  resolveRequestHost,
} from '../src/tenants/tenant-host';

assert.equal(normalizeTenantHost('ESAF.tenis.esaf.run.place:443'), 'esaf.tenis.esaf.run.place');
assert.equal(normalizeTenantHost(' https://demo.tenis.esaf.run.place/ '), 'demo.tenis.esaf.run.place');
assert.equal(normalizeTenantHost(''), null);

assert.equal(
  resolveRequestHost({
    host: 'api-interno:3000',
    xForwardedHost: 'esaf.tenis.esaf.run.place, proxy.local',
  }),
  'esaf.tenis.esaf.run.place',
);

assert.equal(
  extractTenantSlugFromHost('esaf.tenis.esaf.run.place', 'tenis.esaf.run.place'),
  'esaf',
);
assert.equal(
  extractTenantSlugFromHost('demo.tenis.esaf.run.place', 'tenis.esaf.run.place'),
  'demo',
);
assert.equal(
  extractTenantSlugFromHost('tenis.esaf.run.place', 'tenis.esaf.run.place'),
  null,
);
assert.equal(
  extractTenantSlugFromHost('outro.exemplo.pt', 'tenis.esaf.run.place'),
  null,
);
