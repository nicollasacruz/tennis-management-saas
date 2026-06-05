import assert from 'node:assert/strict';
import {
  deserializeWhatsappPayload,
  normalizeWhatsappNumber,
  serializeWhatsappPayload,
} from '../src/whatsapp/whatsapp.helpers';

assert.equal(normalizeWhatsappNumber('910 000 001'), '351910000001');
assert.equal(normalizeWhatsappNumber('+351 910 000 001'), '351910000001');
assert.equal(normalizeWhatsappNumber('00351 910 000 001'), '351910000001');
assert.equal(normalizeWhatsappNumber(''), null);
assert.equal(normalizeWhatsappNumber('123'), null);

const originalPayload = {
  number: '351910000001',
  type: 'document' as const,
  url: 'https://clubtenispro.com/api/public/receipts/token.pdf',
  filename: 'recibo-REC-202605-0001.pdf',
  caption: 'Olá Rita, segue em anexo o recibo da mensalidade.',
};

const serialized = serializeWhatsappPayload(originalPayload);
const restored = deserializeWhatsappPayload(serialized);

assert.deepEqual(restored, originalPayload);
