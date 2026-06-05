/**
 * Helpers puros de agendamento — sem dependências de DB/Nest para serem
 * testáveis isoladamente (estilo `applyTenantScopeArgs` em tenant-scope.ts).
 */

export const MINUTES_IN_DAY = 24 * 60;

export interface TimeSlotLike {
  courtId: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
}

/** Dois intervalos [aStart,aEnd) e [bStart,bEnd) intersectam-se? */
export function timeRangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Duas aulas colidem (mesmo court, mesmo dia, horas a sobrepor)? */
export function doSlotsOverlap(a: TimeSlotLike, b: TimeSlotLike): boolean {
  if (a.courtId !== b.courtId) return false;
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  return timeRangesOverlap(a.startMin, a.endMin, b.startMin, b.endMin);
}

/** Há colisão entre `candidate` e qualquer slot existente (exclui `ignoreId`)? */
export function findOverlap<T extends TimeSlotLike & { id?: string }>(
  candidate: TimeSlotLike,
  existing: T[],
  ignoreId?: string,
): T | undefined {
  return existing.find(
    (slot) => slot.id !== ignoreId && doSlotsOverlap(candidate, slot),
  );
}

/** `startMin`/`endMin` formam um intervalo válido dentro do dia? */
export function isValidTimeRange(startMin: number, endMin: number): boolean {
  return (
    Number.isInteger(startMin) &&
    Number.isInteger(endMin) &&
    startMin >= 0 &&
    endMin <= MINUTES_IN_DAY &&
    startMin < endMin
  );
}

/** Ainda é possível criar um court dado o limite do plano? */
export function canAddCourt(activeCount: number, maxCourts: number): boolean {
  return activeCount < maxCourts;
}

/** Há vaga na aula? `capacity` null/undefined = sem limite. */
export function hasCapacity(
  enrolledCount: number,
  capacity: number | null | undefined,
): boolean {
  if (capacity === null || capacity === undefined) return true;
  return enrolledCount < capacity;
}
