import assert from 'node:assert/strict';
import {
  createPublicReceiptToken,
  verifyPublicReceiptToken,
} from '../src/payments/public-receipt-token';

const secret = 'segredo-de-teste-com-tamanho-suficiente';
const token = createPublicReceiptToken({
  paymentId: 'pagamento-123',
  expiresAt: new Date('2026-05-23T12:00:00.000Z'),
  secret,
});

assert.equal(
  verifyPublicReceiptToken(token, secret, new Date('2026-05-23T11:59:59.000Z')),
  'pagamento-123',
);

assert.equal(
  verifyPublicReceiptToken(token, secret, new Date('2026-05-23T12:00:01.000Z')),
  null,
);

assert.equal(
  verifyPublicReceiptToken(`${token}alterado`, secret, new Date('2026-05-23T11:00:00.000Z')),
  null,
);
