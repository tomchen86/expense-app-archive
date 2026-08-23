import {
  allocateEqualShares,
  formatLocalCalendarDate,
  parseDecimalToMinorUnits,
  parseLocalCalendarDate,
} from '../money';

describe('canonical money and calendar values', () => {
  it.each([
    ['12.34', 'USD', 1234],
    ['12.3', 'AUD', 1230],
    ['12', 'JPY', 12],
    ['1.234', 'KWD', 1234],
  ])('parses %s %s into integer minor units', (input, currency, expected) => {
    expect(parseDecimalToMinorUnits(input, currency)).toBe(expected);
  });

  it.each([
    ['12abc', 'USD'],
    ['10.999', 'USD'],
    ['1.0', 'JPY'],
    ['0', 'USD'],
    ['-1', 'USD'],
    ['1e3', 'USD'],
    ['Infinity', 'USD'],
    ['', 'USD'],
  ])('rejects invalid amount %s for %s', (input, currency) => {
    expect(parseDecimalToMinorUnits(input, currency)).toBeNull();
  });

  it('allocates equal integer shares deterministically with no lost cent', () => {
    expect(allocateEqualShares(1000, ['alice', 'bob', 'chris'])).toEqual([
      { participantId: 'alice', amountMinor: 334 },
      { participantId: 'bob', amountMinor: 333 },
      { participantId: 'chris', amountMinor: 333 },
    ]);
  });

  it('formats the local calendar fields without converting through UTC', () => {
    const localDate = new Date(2026, 7, 13, 0, 0, 0);
    expect(formatLocalCalendarDate(localDate)).toBe('2026-08-13');
  });

  it('parses a calendar-only route value into local fields in any Jest timezone', () => {
    const parsed = parseLocalCalendarDate('2025-01-01');

    expect(parsed).not.toBeNull();
    expect([
      parsed!.getFullYear(),
      parsed!.getMonth(),
      parsed!.getDate(),
    ]).toEqual([2025, 0, 1]);
  });
});
