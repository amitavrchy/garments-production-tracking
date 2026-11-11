import { describe, it, expect } from 'vitest';
import { efficiency, dhu, requiredMaterial, earnings, dhakaDate, csv } from '../src/domain/math';
import { canTransition } from '../src/domain/states';
import { allowed } from '../src/auth/permissions';
import { schemas } from '../src/domain/schemas';
describe('specification calculations', () => {
  it('matches the SMV efficiency fixture', () => expect(efficiency(200, 12, 40, 60)).toBe(100));
  it('counts overtime in the efficiency denominator', () =>
    expect(efficiency(200, 12, 40, 90)).toBeCloseTo(66.666666));
  it('does not divide by zero', () => {
    expect(efficiency(10, 5, 0)).toBe(0);
    expect(dhu(4, 0)).toBe(0);
  });
  it('counts defect occurrences rather than defective pieces', () =>
    expect(dhu(7, 200)).toBeCloseTo(3.5));
  it('applies BOM wastage in basis points', () =>
    expect(requiredMaterial(0.22, 10000, 500)).toBe(2310));
  it('preserves integer poisha', () => expect(earnings(323, 175)).toBe(56525));
  it('uses Dhaka date at the UTC day boundary', () =>
    expect(dhakaDate(new Date('2026-11-10T19:00:00Z'))).toBe('2026-11-11'));
  it('escapes CSV quotes and spreadsheet formula injection', () => {
    const out = csv([{ name: '=1+1', note: 'a"b' }], ['name', 'note']);
    expect(out).toContain('"\'=1+1"');
    expect(out).toContain('"a""b"');
  });
});
describe('workflow and permissions', () => {
  it('rejects skipping shipment packing', () =>
    expect(canTransition('shipments', 'PLANNED', 'DISPATCHED')).toBe(false));
  it('requires independent approval before payroll export', () => {
    expect(canTransition('payroll', 'CALCULATED', 'EXPORTED')).toBe(false);
    expect(canTransition('payroll', 'APPROVED', 'EXPORTED')).toBe(true);
  });
  it('restricts payroll mutation to accounts', () => {
    expect(allowed('QC', 'payroll')).toBe(false);
    expect(allowed('ACCOUNTS', 'payroll')).toBe(true);
  });
  it('restricts hourly production to floor roles', () => {
    expect(allowed('MERCHANDISER', 'production')).toBe(false);
    expect(allowed('SUPERVISOR', 'production')).toBe(true);
  });
  it('rejects invalid calendar dates', () =>
    expect(
      schemas.allocations.safeParse({ lineId: 'a', orderId: 'b', date: '2026-02-30', target: 10 })
        .success,
    ).toBe(false));
  it('rejects negative and fractional output', () => {
    const body = {
      lineId: 'l',
      orderId: 'o',
      color: 'Navy',
      size: 'M',
      date: '2026-11-11',
      hourStart: 8,
      inputPcs: 100,
      producedPcs: -1,
      operators: 30,
      availableMinutes: 60,
    };
    expect(schemas.production.safeParse(body).success).toBe(false);
    expect(schemas.production.safeParse({ ...body, producedPcs: 1.5 }).success).toBe(false);
  });
  it('rejects reversed payroll periods', () =>
    expect(
      schemas.payroll.safeParse({
        name: 'Week',
        periodStart: '2026-11-12',
        periodEnd: '2026-11-01',
      }).success,
    ).toBe(false));
});
