import assert from 'node:assert/strict';
import {
  buildRetryDate,
  deserializeMailPayload,
  serializeMailPayload,
} from '../src/mail/mail-queue.helpers';

const originalPayload = {
  to: 'familia@example.com',
  subject: 'Recibo',
  text: 'Segue em anexo.',
  html: '<p>Segue em anexo.</p>',
  attachments: [
    {
      filename: 'recibo.pdf',
      content: Buffer.from('pdf-falso'),
      contentType: 'application/pdf',
    },
  ],
};

const serialized = serializeMailPayload(originalPayload);
const restored = deserializeMailPayload(serialized);

assert.equal(restored.to, originalPayload.to);
assert.equal(restored.subject, originalPayload.subject);
assert.equal(restored.attachments?.[0]?.filename, 'recibo.pdf');
assert.equal(restored.attachments?.[0]?.contentType, 'application/pdf');
assert.equal(restored.attachments?.[0]?.content.toString(), 'pdf-falso');

const baseDate = new Date('2026-05-16T10:00:00.000Z');
assert.equal(
  buildRetryDate(1, baseDate, 60).toISOString(),
  '2026-05-16T10:01:00.000Z',
);
assert.equal(
  buildRetryDate(3, baseDate, 60).toISOString(),
  '2026-05-16T10:04:00.000Z',
);
