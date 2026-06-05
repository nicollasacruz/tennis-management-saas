import assert from 'node:assert/strict';
import {
  canAddCourt,
  doSlotsOverlap,
  findOverlap,
  hasCapacity,
  isValidTimeRange,
  timeRangesOverlap,
} from '../src/class-slots/schedule.util';

// timeRangesOverlap — meio-aberto [start,end)
assert.equal(timeRangesOverlap(0, 60, 60, 120), false); // encostados não colidem
assert.equal(timeRangesOverlap(0, 61, 60, 120), true); // 1min de sobreposição
assert.equal(timeRangesOverlap(120, 180, 0, 60), false);
assert.equal(timeRangesOverlap(30, 90, 60, 120), true);

// doSlotsOverlap — só colide com mesmo court + mesmo dia
const a = { courtId: 'c1', dayOfWeek: 1, startMin: 1020, endMin: 1080 };
assert.equal(
  doSlotsOverlap(a, { courtId: 'c1', dayOfWeek: 1, startMin: 1050, endMin: 1110 }),
  true,
);
assert.equal(
  doSlotsOverlap(a, { courtId: 'c2', dayOfWeek: 1, startMin: 1050, endMin: 1110 }),
  false,
); // court diferente
assert.equal(
  doSlotsOverlap(a, { courtId: 'c1', dayOfWeek: 2, startMin: 1050, endMin: 1110 }),
  false,
); // dia diferente
assert.equal(
  doSlotsOverlap(a, { courtId: 'c1', dayOfWeek: 1, startMin: 1080, endMin: 1140 }),
  false,
); // encostado

// findOverlap — ignora o próprio id (update)
const existing = [
  { id: 's1', courtId: 'c1', dayOfWeek: 1, startMin: 1020, endMin: 1080 },
  { id: 's2', courtId: 'c1', dayOfWeek: 1, startMin: 1080, endMin: 1140 },
];
assert.equal(
  findOverlap({ courtId: 'c1', dayOfWeek: 1, startMin: 1050, endMin: 1100 }, existing)?.id,
  's1',
);
assert.equal(
  findOverlap(
    { courtId: 'c1', dayOfWeek: 1, startMin: 1020, endMin: 1080 },
    existing,
    's1',
  ),
  undefined,
); // é o próprio

// isValidTimeRange
assert.equal(isValidTimeRange(1020, 1080), true);
assert.equal(isValidTimeRange(1080, 1020), false); // invertido
assert.equal(isValidTimeRange(1020, 1020), false); // vazio
assert.equal(isValidTimeRange(-1, 60), false);
assert.equal(isValidTimeRange(0, 1441), false);

// canAddCourt — limite do plano
assert.equal(canAddCourt(0, 3), true);
assert.equal(canAddCourt(2, 3), true);
assert.equal(canAddCourt(3, 3), false);

// hasCapacity — null = sem limite
assert.equal(hasCapacity(0, 4), true);
assert.equal(hasCapacity(3, 4), true);
assert.equal(hasCapacity(4, 4), false);
assert.equal(hasCapacity(99, null), true);
assert.equal(hasCapacity(99, undefined), true);

console.log('schedule: OK');
