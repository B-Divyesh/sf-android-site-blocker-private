import './styles.css';
import { clampDelay, defaultState, normalizeDomain, parseImport, scheduleActive, type QuietwallState, type Rule } from './domain';
import { isNativeAndroid, syncNativeVpn } from './native-vpn';
import { clearState, DEMO_DATABASE, loadState, REAL_DATABASE, saveState } from './storage';

const PRODUCT_URL = 'https://android-site-blocker-private.sociobot.in';
const BUILD_ID = 'polish-1';
const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('App root is missing.');

const demoMode = new URLSearchParams(location.search).get('demo') === '1' || location.pathname.replace(/\/$/, '') === '/demo';
const databaseName = demoMode ? DEMO_DATABASE : REAL_DATABASE;
let state: QuietwallState = defaultState();
let message = '';
let messageKind: 'ok' | 'error' = 'ok';
let removedRule: { rule: Rule; index: number } | null = null;
let storageError = false;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let reloadForUpdate = false;

const sampleState = (): QuietwallState => ({
  version: 1,
  protectionEnabled: false,
  unlockDelayMinutes: 15,
  unlockRequestedAt: null,
  unlockAt: null,
  scheduleEnabled: true,
  scheduleStart: '21:30',
  scheduleEnd: '07:00',
  rules: [
    { id: 'demo-news', pattern: 'news.example.com', enabled: true, createdAt: '2026-08-20T18:00:00.000Z' },
    { id: 'demo-social', pattern: '*.social.example', enabled: true, createdAt: '2026-08-21T18:00:00.000Z' },
    { id: 'demo-video', pattern: 'video.example', enabled: true, createdAt: '2026-08-22T18:00:00.000Z' },
    { id: 'demo-forum', pattern: 'forum.example', enabled: false, createdAt: '2026-08-23T18:00:00.000Z' }
  ],
  updatedAt: '2026-08-28T00:00:00.000Z'
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function remainingUnlock(): number {
  return state.unlockAt ? Math.max(0, new Date(state.unlockAt).getTime() - Date.now()) : 0;
}

function formatRemaining(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${(seconds % 60).toString().padStart(2, '0')}s` : `${seconds}s`;
}

function routeName(): 'home' | 'privacy' | 'terms' | 'offline' | 'not-found' {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/demo') return 'home';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path === '/offline.html' || path === '/offline') return 'offline';
  return 'not-found';
}

const routeMeta = {
  home: {
    title: demoMode ? 'Demo — Quietwall' : 'Quietwall — block websites on Android',
    description: demoMode ? 'Try Quietwall with an isolated sample block list.' : 'Block chosen websites across Android with a local DNS VPN and a block list you control.',
    canonical: demoMode ? '/?demo=1' : '/'
  },
  privacy: { title: 'Privacy — Quietwall', description: 'How Quietwall stores block lists and handles network traffic.', canonical: '/privacy/' },
  terms: { title: 'Terms — Quietwall', description: 'Terms and known limits for using Quietwall.', canonical: '/terms/' },
  offline: { title: 'Offline — Quietwall', description: 'Open Quietwall again when the app shell is cached.', canonical: '/offline.html' },
  'not-found': { title: 'Page not found — Quietwall', description: 'This Quietwall page does not exist.', canonical: '/404.html' }
} as const;

function setMetadata(route: keyof typeof routeMeta): void {
  const meta = routeMeta[route];
  document.title = meta.title;
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', meta.description);
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', meta.title);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `${PRODUCT_URL}${meta.canonical}`);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', `${PRODUCT_URL}${meta.canonical}`);
}

function header(): string {
  return `<header class="site-header"><a class="brand" href="/" aria-label="Quietwall home"><span class="brand-mark" aria-hidden="true">Q</span><span>QUIETWALL</span></a><nav class="site-nav" aria-label="Main navigation"><a href="/?demo=1" data-full-load>Demo</a><a href="/privacy/">Privacy</a></nav></header>`;
}

function footer(): string {
  return `<footer><div><a class="brand footer-brand" href="/"><span class="brand-mark" aria-hidden="true">Q</span><span>QUIETWALL</span></a><p>Configure a private Android block list.</p></div><nav aria-label="Footer navigation"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-android-site-blocker-private" rel="external">Source code on GitHub (external)</a></nav><p class="asset-note">Built by Param Factory · ${BUILD_ID} · Original pixel artwork.</p></footer><div class="toast" id="update-toast" hidden><span>Quietwall has an update.</span><button type="button" id="reload-update">Reload update</button></div>`;
}

function demoBanner(): string {
  if (!demoMode) return '';
  return `<aside class="demo-banner" aria-label="Demo status"><strong>Demo — sample data, nothing is saved to your real list</strong><span>Changes use isolated demo storage.</span><div><button class="text-button" id="reset-demo" type="button">Reset demo</button><a href="/" data-full-load>Start for real</a></div></aside>`;
}

function workbench(): string {
  const activeRules = state.rules.filter((rule) => rule.enabled).length;
  const pending = remainingUnlock();
  const native = isNativeAndroid();
  const blocking = native && state.protectionEnabled && scheduleActive(state) && activeRules > 0;
  const status = native ? (blocking ? 'BLOCKING IS ON' : state.protectionEnabled ? 'OUTSIDE FOCUS HOURS' : 'BLOCKING IS OFF') : state.rules.length ? 'LIST READY FOR ANDROID' : 'LIST NOT SAVED YET';
  const button = native ? (pending ? `PAUSE IN ${formatRemaining(pending)}` : state.protectionEnabled ? 'Request a pause' : 'Start blocking') : 'Save block list';
  return `<section class="workbench" id="configure" aria-labelledby="workbench-title"><div class="workbench-heading"><div><p class="eyebrow">SET UP YOUR BLOCK LIST</p><h2 id="workbench-title">Add domains for Android to block</h2></div><div class="save-state ${storageError ? 'danger' : ''}" aria-live="polite">${storageError ? '⚠ STORAGE ERROR' : demoMode ? '● DEMO STORAGE' : '● SAVED ON THIS DEVICE'}</div></div>
    <div class="engine ${blocking ? 'is-active' : ''}"><div class="engine-state"><span class="engine-icon" aria-hidden="true">${blocking ? '▣' : '□'}</span><div><p class="engine-label">${status}</p><p>${activeRules} enabled ${activeRules === 1 ? 'domain' : 'domains'} · ${state.scheduleEnabled ? `${state.scheduleStart}–${state.scheduleEnd}` : 'all day'}</p></div></div><button class="power-button ${state.protectionEnabled ? 'on' : ''}" id="power-button" type="button" ${pending ? 'disabled' : ''}><span aria-hidden="true"></span>${button}</button></div>
    ${native ? '' : '<p class="browser-limit">This website saves a block list for import. It does not block browser or device traffic.</p>'}<div id="message" class="message ${messageKind}" aria-live="polite">${escapeHtml(message)}</div>
    <div class="rule-builder"><form id="domain-form" novalidate><label for="domain">Domain to block</label><div class="input-row"><input id="domain" name="domain" inputmode="url" autocomplete="off" spellcheck="false" aria-describedby="domain-help domain-error" placeholder="example.com or *.example.com" /><button class="button primary" type="submit">Add domain</button></div><p class="field-help" id="domain-help"><code>example.com</code> also blocks its subdomains. <code>*.example.com</code> blocks subdomains, but not example.com.</p><p class="field-error" id="domain-error" aria-live="assertive"></p></form>
      <div class="rule-toolbar"><p><strong>${state.rules.length}</strong> ${state.rules.length === 1 ? 'domain' : 'domains'}</p><div><button class="button ghost" type="button" id="import-button">Import block list</button><button class="button ghost" type="button" id="export-button" ${state.rules.length ? '' : 'disabled'}>Export block list</button><input id="import-file" type="file" tabindex="-1" aria-label="Choose Quietwall export file" accept="application/json,.json" hidden /></div></div>
      <ul class="rule-list" aria-label="Block list">${state.rules.length ? state.rules.map((rule) => `<li data-id="${rule.id}" class="${rule.enabled ? '' : 'muted-rule'}"><label class="mini-switch"><input type="checkbox" data-action="toggle" ${rule.enabled ? 'checked' : ''} /><span aria-hidden="true"></span><span class="visually-hidden">${rule.enabled ? 'Pause' : 'Enable'} ${escapeHtml(rule.pattern)}</span></label><span class="domain-name">${escapeHtml(rule.pattern)}</span><button class="icon-button" type="button" data-action="remove" aria-label="Remove ${escapeHtml(rule.pattern)}">×</button></li>`).join('') : '<li class="empty-state"><span class="empty-pixel" aria-hidden="true">＋</span><div><strong>No domains yet</strong><p>Add a domain you want to block.</p></div></li>'}</ul></div>
    <details class="commitment" ${state.unlockDelayMinutes || state.scheduleEnabled ? 'open' : ''}><summary><span><span class="summary-icon" aria-hidden="true">⌛</span><strong>Focus controls</strong></span><span class="summary-hint">OPTIONAL</span></summary><div class="commitment-grid"><div class="setting"><label for="delay">Delay before pausing</label><div class="number-field"><input id="delay" type="number" min="0" max="1440" step="1" value="${state.unlockDelayMinutes}" /><span>minutes</span></div><p>The Android app waits this long before a pause starts.</p></div><div class="setting"><label class="check-row"><input id="schedule-enabled" type="checkbox" ${state.scheduleEnabled ? 'checked' : ''} /><span>Use focus hours</span></label><div class="time-row"><label>From<input id="schedule-start" type="time" value="${state.scheduleStart}" ${state.scheduleEnabled ? '' : 'disabled'} /></label><label>To<input id="schedule-end" type="time" value="${state.scheduleEnd}" ${state.scheduleEnabled ? '' : 'disabled'} /></label></div><p>Focus hours may cross midnight. Matching start and end times cover all day.</p></div></div></details></section>`;
}

function homePage(): string {
  return `${demoBanner()}${header()}<main id="main"><section class="hero" aria-labelledby="page-title"><div class="hero-copy"><p class="eyebrow">ANDROID WEBSITE BLOCKER</p><h1 id="page-title" tabindex="-1">Block websites across your Android device</h1><p class="lede">For Android users who want private, device-wide blocking without an account or subscription.</p><div class="hero-actions"><div><a class="button primary" href="/?demo=1" data-full-load>Try it with sample data</a><p>See four sample domains, focus hours, and a pause delay.</p></div><div><a class="button secondary" href="/downloads/quietwall.apk" download>Download the Android app</a><p>Install the signed preview APK. <a href="/downloads/quietwall.apk.sha256" download>Check its SHA-256</a>.</p></div></div><ul class="plain-facts" aria-label="Product facts"><li>Your block list stays on this device.</li><li>Works offline after the first visit.</li><li>Free to use. No account.</li></ul></div><figure class="hero-art"><img src="/assets/quietwall-gate.webp" width="900" height="600" alt="A pixel diagram shows an Android phone stopping selected domain requests at a local gate." fetchpriority="high" decoding="async" /><figcaption><span aria-hidden="true">■</span> Rules move from the local list to Android’s DNS filter.</figcaption></figure></section>${workbench()}
    <section class="walkthrough" aria-labelledby="walkthrough-title"><p class="eyebrow">HOW IT WORKS</p><h2 id="walkthrough-title">Set up blocking in three steps</h2><ol><li><img src="/assets/walkthrough-install.svg" width="360" height="480" alt="Quietwall Android install screen with an Install app button." /><h3>Install Quietwall</h3><p>Download the APK and allow installation from this source.</p></li><li><img src="/assets/walkthrough-add.svg" width="360" height="480" alt="Quietwall screen showing a domain being added to the block list." /><h3>Add domains</h3><p>Enter each domain and choose optional focus hours.</p></li><li><img src="/assets/walkthrough-start.svg" width="360" height="480" alt="Quietwall screen showing blocking on after Android VPN permission." /><h3>Start blocking</h3><p>Approve Android’s VPN prompt. A status notification appears while blocking runs.</p></li></ol></section>
    <section class="truth" aria-labelledby="truth-title"><div><p class="eyebrow">LIMITS</p><h2 id="truth-title">What Quietwall blocks and what can bypass it</h2></div><div class="truth-grid"><article><span>✓</span><h3>What Quietwall blocks</h3><p>The Android app handles standard domain requests and returns a not-found response for matching entries.</p></article><article><span>!</span><h3>What can bypass Quietwall</h3><p>Another VPN, encrypted DNS, direct IP links, or uninstalling the app can bypass this filter.</p></article><article><span>↯</span><h3>Where allowed requests go</h3><p>Allowed domain requests use the DNS service selected by your current network.</p></article></div><div class="android-note"><span class="pixel-phone" aria-hidden="true"></span><div><strong>Android asks for VPN permission before blocking starts.</strong><p>The website only prepares and exports your block list.</p></div></div></section></main>${footer()}`;
}

function legalPage(kind: 'privacy' | 'terms'): string {
  const privacy = kind === 'privacy';
  return `${header()}<main id="main" class="legal"><p class="eyebrow">${privacy ? 'PRIVACY' : 'TERMS'} · 28 AUGUST 2026</p><h1 id="page-title" tabindex="-1">${privacy ? 'How Quietwall handles your data' : 'Terms for using Quietwall'}</h1>${privacy ? `<p class="legal-lede">Quietwall stores your block list on your device. It has no account or analytics service.</p><h2>Data stored on your device</h2><p>The website stores rules and settings in browser storage. The Android app copies them to private app storage. Demo data uses a separate browser database.</p><h2>Network access</h2><p>The website loads app files from this site. The Android app sends allowed domain requests to your network’s DNS service. Quietwall does not send analytics or your block list to a company server.</p><h2>Your controls</h2><p>You can remove domains, reset the demo, export your block list, or clear site storage. We have no server copy to retrieve.</p><h2>Contact</h2><p>Use the public GitHub repository for privacy questions.</p>` : `<p class="legal-lede">Quietwall is free MIT-licensed software for managing your own block list.</p><h2>Known limits</h2><p>Quietwall is not parental control or a security guarantee. Another VPN, encrypted DNS, direct IP links, or uninstalling the app may bypass blocking. The website cannot block traffic.</p><h2>Your responsibility</h2><p>Use Quietwall only on a device you own or administer. You are responsible for the domains you add.</p><h2>Availability</h2><p>The software is provided “as is” without warranties. Features and availability may change.</p>`}</main>${footer()}`;
}

function simplePage(kind: 'offline' | 'not-found'): string {
  const offline = kind === 'offline';
  return `${header()}<main id="main" class="legal"><p class="eyebrow">${offline ? 'OFFLINE' : '404'}</p><h1 id="page-title" tabindex="-1">${offline ? 'Quietwall is offline' : 'Page not found'}</h1><p>${offline ? 'The network is unavailable. Open the cached app to manage your saved block list.' : 'This address does not point to a Quietwall page.'}</p><a class="button primary" href="/">${offline ? 'Open cached Quietwall' : 'Return to Quietwall'}</a></main>${footer()}`;
}

function renderRoute(focusHeading = false): void {
  const route = routeName(); setMetadata(route);
  app.innerHTML = route === 'home' ? homePage() : route === 'privacy' || route === 'terms' ? legalPage(route) : simplePage(route);
  bindNavigation(); if (route === 'home') bindWorkbench();
  if (serviceWorkerRegistration?.waiting && navigator.serviceWorker.controller) showUpdate(serviceWorkerRegistration);
  if (focusHeading) { document.querySelector<HTMLElement>('#page-title')?.focus({ preventScroll: true }); document.querySelector<HTMLElement>('#route-announcer')!.textContent = document.title; scrollTo({ top: 0, behavior: 'auto' }); }
}

async function persist(successMessage?: string): Promise<void> {
  try {
    await saveState(state, databaseName); storageError = false;
    if (isNativeAndroid() && !demoMode) {
      const native = await syncNativeVpn(state);
      if (native?.consentDenied) { state.protectionEnabled = false; await saveState(state, databaseName); message = 'Android VPN permission was not approved. Blocking remains off.'; messageKind = 'error'; }
    }
    if (successMessage) { message = successMessage; messageKind = 'ok'; }
  } catch (error) { storageError = true; message = error instanceof Error ? error.message : 'Changes could not be saved.'; messageKind = 'error'; }
  renderRoute();
}

function bindNavigation(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]:not([download]):not([data-full-load])').forEach((link) => link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href); if (url.origin !== location.origin || url.searchParams.has('demo')) return;
    event.preventDefault(); history.replaceState({ scrollY }, ''); history.pushState({ scrollY: 0 }, '', url.pathname); renderRoute(true);
  }));
}

function bindWorkbench(): void {
  document.querySelector<HTMLFormElement>('#domain-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const input = document.querySelector<HTMLInputElement>('#domain'); const error = document.querySelector<HTMLElement>('#domain-error'); if (!input || !error) return;
    try { const pattern = normalizeDomain(input.value); if (state.rules.some((rule) => rule.pattern === pattern)) throw new Error(`${pattern} is already in your block list.`); state.rules.unshift({ id: crypto.randomUUID(), pattern, enabled: true, createdAt: new Date().toISOString() }); await persist(`${pattern} added to the block list.`); document.querySelector<HTMLInputElement>('#domain')?.focus(); }
    catch (problem) { error.textContent = problem instanceof Error ? problem.message : 'That domain could not be added.'; input.setAttribute('aria-invalid', 'true'); input.focus(); }
  });
  document.querySelector('#power-button')?.addEventListener('click', async () => {
    if (!isNativeAndroid() || demoMode) { await persist('Saved for Android import. This browser is not blocking sites.'); return; }
    if (!state.protectionEnabled && !state.rules.some((rule) => rule.enabled)) { message = 'Add and enable a domain before starting blocking.'; messageKind = 'error'; renderRoute(); return; }
    if (state.protectionEnabled && state.unlockDelayMinutes > 0) { const now = new Date(); state.unlockRequestedAt = now.toISOString(); state.unlockAt = new Date(now.getTime() + state.unlockDelayMinutes * 60_000).toISOString(); await persist(`Pause requested. Blocking continues for ${state.unlockDelayMinutes} minutes.`); return; }
    state.protectionEnabled = !state.protectionEnabled; state.unlockAt = null; state.unlockRequestedAt = null; await persist(state.protectionEnabled ? 'Blocking started.' : 'Blocking stopped.');
  });
  document.querySelectorAll<HTMLElement>('.rule-list li[data-id]').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector<HTMLInputElement>('[data-action="toggle"]')?.addEventListener('change', async (event) => { const rule = state.rules.find((item) => item.id === id); if (!rule) return; rule.enabled = (event.currentTarget as HTMLInputElement).checked; await persist(`${rule.pattern} ${rule.enabled ? 'enabled' : 'paused'}.`); });
    row.querySelector('[data-action="remove"]')?.addEventListener('click', async () => { const index = state.rules.findIndex((item) => item.id === id); if (index < 0) return; const rule = state.rules[index]; if (!window.confirm(`Remove ${rule.pattern} from your block list?`)) return; removedRule = { rule, index }; state.rules.splice(index, 1); await persist(`${rule.pattern} removed.`); const region = document.querySelector('#message'); if (region && removedRule) { const undo = document.createElement('button'); undo.type = 'button'; undo.className = 'inline-action'; undo.textContent = 'Undo removal'; undo.addEventListener('click', async () => { if (!removedRule) return; state.rules.splice(removedRule.index, 0, removedRule.rule); const restored = removedRule.rule.pattern; removedRule = null; await persist(`${restored} restored.`); }); region.append(' ', undo); } });
  });
  document.querySelector('#export-button')?.addEventListener('click', () => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `quietwall-block-list-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); message = 'Block list exported as JSON.'; messageKind = 'ok'; renderRoute(); });
  document.querySelector('#import-button')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#import-file')?.click());
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', async (event) => { const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return; try { state = parseImport(JSON.parse(await file.text())); state.protectionEnabled = false; await persist(`${state.rules.length} domains imported.`); } catch (problem) { message = problem instanceof Error ? problem.message : 'The import could not be read.'; messageKind = 'error'; renderRoute(); } });
  document.querySelector<HTMLInputElement>('#delay')?.addEventListener('change', async (event) => { state.unlockDelayMinutes = clampDelay((event.currentTarget as HTMLInputElement).value); await persist('Pause delay saved.'); });
  document.querySelector<HTMLInputElement>('#schedule-enabled')?.addEventListener('change', async (event) => { state.scheduleEnabled = (event.currentTarget as HTMLInputElement).checked; await persist(state.scheduleEnabled ? 'Focus hours enabled.' : 'Focus hours disabled.'); });
  for (const key of ['start', 'end'] as const) document.querySelector<HTMLInputElement>(`#schedule-${key}`)?.addEventListener('change', async (event) => { state[key === 'start' ? 'scheduleStart' : 'scheduleEnd'] = (event.currentTarget as HTMLInputElement).value; await persist('Focus hours saved.'); });
  document.querySelector('#reset-demo')?.addEventListener('click', async () => { await clearState(DEMO_DATABASE); state = sampleState(); await saveState(state, DEMO_DATABASE); message = 'Demo reset to the original sample.'; messageKind = 'ok'; renderRoute(); });
}

async function boot(): Promise<void> {
  try { state = await loadState(databaseName); if (demoMode && state.rules.length === 0) { state = sampleState(); await saveState(state, DEMO_DATABASE); } await navigator.storage?.persist?.(); }
  catch (error) { storageError = true; message = error instanceof Error ? error.message : 'Local storage is unavailable.'; messageKind = 'error'; }
  history.replaceState({ scrollY }, '');
  renderRoute(); window.addEventListener('popstate', (event) => { renderRoute(true); requestAnimationFrame(() => scrollTo({ top: Number(event.state?.scrollY ?? 0), behavior: 'auto' })); });
}

function showUpdate(registration: ServiceWorkerRegistration): void {
  const toast = document.querySelector<HTMLElement>('#update-toast'); if (!toast) return;
  toast.hidden = false;
  document.querySelector('#reload-update')?.addEventListener('click', () => { reloadForUpdate = true; registration.waiting?.postMessage('SKIP_WAITING'); }, { once: true });
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').then((registration) => {
  serviceWorkerRegistration = registration;
  const check = () => { if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration); };
  check(); registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', check));
  window.addEventListener('focus', () => void registration.update().then(check).catch(() => { /* Stay usable offline. */ }));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadForUpdate) location.reload(); });
}).catch(() => { /* The app remains usable without install support. */ });
void boot();
