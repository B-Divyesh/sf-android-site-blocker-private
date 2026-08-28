import { describe, expect, it } from 'vitest';
import { defaultState, domainMatches, normalizeDomain, parseImport, scheduleActive } from './domain';

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
  it('@claim:focus-hours handles daytime, overnight, and all-day schedules', () => {
    const state = { ...defaultState(), scheduleEnabled: true, scheduleStart: '22:00', scheduleEnd: '07:00' };
    expect(scheduleActive(state, new Date(2026, 1, 1, 23, 0))).toBe(true);
    expect(scheduleActive(state, new Date(2026, 1, 1, 6, 59))).toBe(true);
    expect(scheduleActive(state, new Date(2026, 1, 1, 7, 0))).toBe(false);
    expect(scheduleActive(state, new Date(2026, 1, 1, 12, 0))).toBe(false);
    const allDay = { ...state, scheduleStart: '08:00', scheduleEnd: '08:00' };
    expect(scheduleActive(allDay, new Date(2026, 1, 1, 12, 0))).toBe(true);
  });
});

describe('block-list matching', () => {
  it('@claim:domain-matching applies bare and wildcard entries as described', () => {
    expect(domainMatches('example.com', 'example.com')).toBe(true);
    expect(domainMatches('deep.news.example.com', 'example.com')).toBe(true);
    expect(domainMatches('news.example.com', '*.example.com')).toBe(true);
    expect(domainMatches('example.com', '*.example.com')).toBe(false);
    expect(domainMatches('notexample.com', 'example.com')).toBe(false);
  });
});
