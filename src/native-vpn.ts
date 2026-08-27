import { Capacitor, registerPlugin } from '@capacitor/core';
import type { QuietwallState } from './domain';

type QuietwallVpnPlugin = {
  apply(options: {
    protectionEnabled: boolean;
    rules: string[];
    scheduleEnabled: boolean;
    scheduleStart: string;
    scheduleEnd: string;
    unlockAtEpochMs: number;
  }): Promise<{ enabled: boolean; consentDenied: boolean }>;
  status(): Promise<{ enabled: boolean; consentDenied: boolean; blockingActive: boolean }>;
};

const QuietwallVpn = registerPlugin<QuietwallVpnPlugin>('QuietwallVpn');

export function isNativeAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** No-op in a browser/PWA. Native calls contain configuration only, never DNS activity. */
export async function syncNativeVpn(state: QuietwallState): Promise<{ enabled: boolean; consentDenied: boolean } | null> {
  if (!isNativeAndroid()) return null;
  return QuietwallVpn.apply({
    protectionEnabled: state.protectionEnabled,
    rules: state.rules.filter((rule) => rule.enabled).map((rule) => rule.pattern),
    scheduleEnabled: state.scheduleEnabled,
    scheduleStart: state.scheduleStart,
    scheduleEnd: state.scheduleEnd,
    unlockAtEpochMs: state.unlockAt ? new Date(state.unlockAt).getTime() : 0
  });
}
