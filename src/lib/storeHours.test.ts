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

test('manual opening without expiry overrides closing hours and a normally closed day', () => {
  const settings = { temporarilyClosed: true, orderOverride: { mode: 'open' as const, expiresAt: null } };
  for (const when of ['2026-08-15T15:01:00', '2026-08-17T09:00:00', '2026-08-17T23:59:00']) {
    const status = calculateStoreStatus(settings, atRecife(when));
    assert.equal(status.isOpen, true);
    assert.equal(status.mode, 'open');
    assert.equal(status.expiresAt, null);
    assert.equal(status.label, 'ABERTO MANUALMENTE');
  }
});

test('persisted manual opening survives midnight and future dates without mutating the setting', () => {
  const persisted = { orderOverride: { mode: 'open' as const, expiresAt: null, updated_at: '2026-08-15T18:00:00Z' } };
  for (const when of ['2026-08-15T23:59:00', '2026-08-16T00:00:00', '2026-08-17T00:01:00', '2027-01-01T18:00:00']) {
    assert.equal(calculateStoreStatus(JSON.parse(JSON.stringify(persisted)), atRecife(when)).isOpen, true);
  }
  assert.equal(persisted.orderOverride.expiresAt, null);
  assert.equal(persisted.orderOverride.updated_at, '2026-08-15T18:00:00Z');
});

test('manual closure remains closed during scheduled opening and after midnight', () => {
  for (const when of ['2026-08-15T12:00:00', '2026-08-16T00:00:00', '2027-01-01T12:00:00']) {
    const status = calculateStoreStatus({ orderOverride: { mode: 'closed', expiresAt: null } }, atRecife(when));
    assert.equal(status.isOpen, false);
    assert.equal(status.mode, 'closed');
    assert.equal(status.label, 'FECHADO MANUALMENTE');
  }
});

test('standard mode immediately applies the configured schedule and clears a legacy closure', () => {
  const settings = { temporarilyClosed: true, orderOverride: { mode: 'automatic' as const, expiresAt: null },
    openingHours: { monday: { enabled: true, open: '09:00', close: '10:00' } } };
  assert.equal(calculateStoreStatus(settings, atRecife('2026-08-17T09:30:00')).isOpen, true);
  assert.equal(calculateStoreStatus(settings, atRecife('2026-08-17T10:00:00')).isOpen, false);
});

test('legacy finite openings retain their deadline; expired or malformed deadlines fail closed outside the schedule', () => {
  const settings = { orderOverride: { mode: 'open' as const, expiresAt: '2026-08-15T21:00:00Z' } };
  assert.equal(calculateStoreStatus(settings, atRecife('2026-08-15T17:59:00')).isOpen, true);
  assert.equal(calculateStoreStatus(settings, atRecife('2026-08-15T18:00:00')).isOpen, false);
  assert.equal(calculateStoreStatus({ orderOverride: { mode: 'open', expiresAt: 'invalid' } }, atRecife('2026-08-17T12:00:00')).isOpen, false);
  assert.equal(calculateStoreStatus({ orderOverride: { mode: 'open', expiresAt: '' } }, atRecife('2026-08-17T12:00:00')).isOpen, false);
});

