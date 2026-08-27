export type Rule = {
  id: string;
  pattern: string;
  enabled: boolean;
  createdAt: string;
};

export type QuietwallState = {
  version: 1;
  protectionEnabled: boolean;
  unlockDelayMinutes: number;
  unlockRequestedAt: string | null;
  unlockAt: string | null;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
  rules: Rule[];
  updatedAt: string;
};

export const defaultState = (): QuietwallState => ({
  version: 1,
  protectionEnabled: false,
  unlockDelayMinutes: 0,
  unlockRequestedAt: null,
  unlockAt: null,
  scheduleEnabled: false,
  scheduleStart: '22:00',
  scheduleEnd: '07:00',
  rules: [],
  updatedAt: new Date().toISOString()
});

export function normalizeDomain(raw: string): string {
  let input = raw.trim().toLowerCase();
  if (!input) throw new Error('Enter a domain, such as example.com.');
  const wildcard = input.startsWith('*.');
  if (wildcard) input = input.slice(2);
  if (/^[a-z]+:\/\//.test(input)) {
    try {
      input = new URL(input).hostname;
    } catch {
      throw new Error('That web address could not be read.');
    }
  }
  input = input.replace(/^www\./, '').replace(/\.$/, '');
  if (input.includes('/') || input.includes(':')) {
    throw new Error('Use a domain only—leave out pages and port numbers.');
  }
  if (input.length > 253 || !input.includes('.') || !/^[a-z0-9.-]+$/.test(input)) {
    throw new Error('Use a valid domain, such as example.com or *.example.com.');
  }
  const labels = input.split('.');
  if (labels.some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) {
    throw new Error('This domain has an invalid label. Check the dots and hyphens.');
  }
  return wildcard ? `*.${input}` : input;
}

export function parseImport(value: unknown): QuietwallState {
  if (!value || typeof value !== 'object') throw new Error('This file is not a Quietwall export.');
  const candidate = value as Partial<QuietwallState>;
  if (candidate.version !== 1 || !Array.isArray(candidate.rules)) {
    throw new Error('This export version is not supported.');
  }
  const patterns = new Set<string>();
  const rules = candidate.rules.map((rule) => {
    if (!rule || typeof rule !== 'object') throw new Error('One of the imported rules is invalid.');
    const source = rule as Partial<Rule>;
    const pattern = normalizeDomain(String(source.pattern ?? ''));
    if (patterns.has(pattern)) throw new Error(`The import contains ${pattern} more than once.`);
    patterns.add(pattern);
    return {
      id: typeof source.id === 'string' ? source.id : crypto.randomUUID(),
      pattern,
      enabled: source.enabled !== false,
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : new Date().toISOString()
    };
  });
  const base = defaultState();
  return {
    ...base,
    protectionEnabled: Boolean(candidate.protectionEnabled),
    unlockDelayMinutes: clampDelay(candidate.unlockDelayMinutes),
    scheduleEnabled: Boolean(candidate.scheduleEnabled),
    scheduleStart: validTime(candidate.scheduleStart) ? candidate.scheduleStart : base.scheduleStart,
    scheduleEnd: validTime(candidate.scheduleEnd) ? candidate.scheduleEnd : base.scheduleEnd,
    rules,
    updatedAt: new Date().toISOString()
  };
}

export function clampDelay(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(1440, Math.max(0, Math.round(parsed)));
}

export function scheduleActive(state: QuietwallState, date = new Date()): boolean {
  if (!state.scheduleEnabled) return true;
  const now = date.getHours() * 60 + date.getMinutes();
  const [startHour, startMinute] = state.scheduleStart.split(':').map(Number);
  const [endHour, endMinute] = state.scheduleEnd.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (start === end) return true;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
