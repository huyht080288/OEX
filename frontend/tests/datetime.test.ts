import { describe, expect, it } from 'vitest';
import {
  datetimeLocalToIso,
  formatDateTime,
  isoToDatetimeLocal,
} from '@/utils/datetime';

describe('datetime utilities', () => {
  it('formats an ISO value for a datetime-local input', () => {
    const iso = '2026-07-17T10:05:00.000Z';
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, '0');
    const expected =
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`;

    expect(isoToDatetimeLocal(iso)).toBe(expected);
  });

  it('converts a datetime-local value to ISO', () => {
    const local = '2026-07-17T10:05';

    expect(datetimeLocalToIso(local)).toBe(new Date(local).toISOString());
  });

  it('formats a human-readable date and time', () => {
    const formatted = formatDateTime('2026-07-17T10:05:00.000Z');

    expect(formatted).toContain('2026');
    expect(formatted.length).toBeGreaterThan(8);
  });
});
