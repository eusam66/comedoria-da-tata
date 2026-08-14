import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStoreStatus } from './storeHours.ts';

const atRecife = (isoWithoutZone: string) => new Date(`${isoWithoutZone}-03:00`);

test('official schedule boundaries and next openings', () => {
  assert.equal(calculateStoreStatus({}, atRecife('2026-08-14T10:59:00')).isOpen, false);
  assert.equal(calculateStoreStatus({}, atRecife('2026-08-14T10:59:00')).label, 'Abre hoje às 11h');
  assert.equal(calculateStoreStatus({}, atRecife('2026-08-14T11:00:00')).isOpen, true);
  assert.equal(calculateStoreStatus({}, atRecife('2026-08-14T13:30:00')).isOpen, true);
  assert.equal(calculateStoreStatus({}, atRecife('2026-08-14T15:00:00')).isOpen, false);
  assert.equal(calculateStoreStatus({}, atRecife('2026-08-16T12:00:00')).isOpen, true);
  assert.equal(calculateStoreStatus({}, atRecife('2026-08-16T15:01:00')).label, 'Fechado • Abrimos sexta às 11h');
  assert.equal(calculateStoreStatus({}, atRecife('2026-08-17T12:00:00')).label, 'Fechado • Abrimos sexta às 11h');
});

test('temporary closure overrides an open schedule', () => {
  const status = calculateStoreStatus({ temporarilyClosed: true }, atRecife('2026-08-15T12:00:00'));
  assert.equal(status.isOpen, false);
  assert.equal(status.temporarilyClosed, true);
  assert.equal(status.label, 'Fechado temporariamente');
});

test('custom admin schedule is honored', () => {
  const status = calculateStoreStatus({ openingHours: { monday: { enabled: true, open: '09:00', close: '10:00' } } }, atRecife('2026-08-17T09:30:00'));
  assert.equal(status.isOpen, true);
});

