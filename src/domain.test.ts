import { describe, expect, it } from 'vitest';
import { defaultState, normalizeDomain, parseImport, scheduleActive } from './domain';

describe('normalizeDomain', () => {
  it('normalizes common URL input', () => expect(normalizeDomain('https://www.Example.com')).toBe('example.com'));
  it('preserves an explicit wildcard', () => expect(normalizeDomain('*.news.example.com')).toBe('*.news.example.com'));
  it.each(['', 'localhost', 'bad domain.com', '-bad.example', 'example.com/path'])('rejects invalid domain %s', (value) => expect(() => normalizeDomain(value)).toThrow());
});

describe('imports', () => {
  it('accepts and normalizes a versioned export', () => {
    const imported = parseImport({ version: 1, rules: [{ pattern: 'WWW.EXAMPLE.COM', enabled: true }] });
    expect(imported.rules[0].pattern).toBe('example.com');
  });
  it('rejects duplicated normalized domains', () => expect(() => parseImport({ version: 1, rules: [{ pattern: 'example.com' }, { pattern: 'www.example.com' }] })).toThrow(/more than once/));
  it('rejects unknown export versions', () => expect(() => parseImport({ version: 4, rules: [] })).toThrow(/version/));
});

describe('focus hours', () => {
  it('handles an overnight schedule', () => {
    const state = { ...defaultState(), scheduleEnabled: true, scheduleStart: '22:00', scheduleEnd: '07:00' };
    expect(scheduleActive(state, new Date(2026, 1, 1, 23, 0))).toBe(true);
    expect(scheduleActive(state, new Date(2026, 1, 1, 12, 0))).toBe(false);
  });
  it('treats equal times as all day', () => {
    const state = { ...defaultState(), scheduleEnabled: true, scheduleStart: '08:00', scheduleEnd: '08:00' };
    expect(scheduleActive(state, new Date(2026, 1, 1, 12, 0))).toBe(true);
  });
});
