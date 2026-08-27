import './styles.css';
import { clampDelay, defaultState, normalizeDomain, parseImport, scheduleActive, type QuietwallState, type Rule } from './domain';
import { loadState, saveState } from './storage';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('App root is missing.');

let state: QuietwallState = defaultState();
let message = '';
let messageKind: 'ok' | 'error' = 'ok';
let removedRule: { rule: Rule; index: number } | null = null;
let installPrompt: InstallPrompt | null = null;
let storageError = false;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function remainingUnlock(): number {
  return state.unlockAt ? Math.max(0, new Date(state.unlockAt).getTime() - Date.now()) : 0;
}

function formatRemaining(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}m ${rest.toString().padStart(2, '0')}s` : `${rest}s`;
}

function protectionIsActive(): boolean {
  return state.protectionEnabled && scheduleActive(state) && state.rules.some((rule) => rule.enabled);
}

function render(): void {
  const activeRules = state.rules.filter((rule) => rule.enabled).length;
  const pending = remainingUnlock();
  const isActive = protectionIsActive();
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Quietwall home"><span class="brand-mark" aria-hidden="true">Q</span><span>QUIETWALL</span></a>
      <div class="header-status"><span class="status-dot" aria-hidden="true"></span><span id="network-label">NO CLOUD · LOCAL ONLY</span></div>
    </header>
    <main id="main">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">ANDROID SITE BLOCKER / ZERO TELEMETRY</p>
          <h1 id="hero-title">Your block list.<br><span>Nobody else’s business.</span></h1>
          <p class="lede">A plain domain wall designed to run on your Android device. No account, no browsing log, no subscription—and no server to phone home to.</p>
          <div class="proof-row" aria-label="Privacy promises">
            <span>01 · DEVICE-LOCAL</span><span>02 · OPEN EXPORT</span><span>03 · NO SDKs</span>
          </div>
        </div>
        <figure class="hero-art">
          <img src="/assets/quietwall-gate.webp" width="900" height="600" alt="Pixel-art diagram of a phone routing domain requests through a local gate that stops blocked packets" fetchpriority="high" decoding="async" />
          <figcaption><span aria-hidden="true">■</span> A closed loop: rules stay between you and your phone.</figcaption>
        </figure>
      </section>

      <section class="workbench" aria-labelledby="workbench-title">
        <div class="workbench-heading">
          <div><p class="eyebrow">LOCAL CONFIGURATOR</p><h2 id="workbench-title">Build your wall</h2></div>
          <div class="save-state ${storageError ? 'danger' : ''}" aria-live="polite">${storageError ? '⚠ STORAGE ERROR' : '● SAVED ON DEVICE'}</div>
        </div>

        <div class="engine ${isActive ? 'is-active' : ''}">
          <div class="engine-state">
            <span class="engine-icon" aria-hidden="true">${isActive ? '▣' : '□'}</span>
            <div><p class="engine-label">${isActive ? 'RULES ARMED' : state.protectionEnabled ? 'OUTSIDE SCHEDULE' : 'RULES PAUSED'}</p><p>${activeRules} active ${activeRules === 1 ? 'domain' : 'domains'} · ${state.scheduleEnabled ? `${state.scheduleStart}–${state.scheduleEnd}` : 'all day'}</p></div>
          </div>
          <button class="power-button ${state.protectionEnabled ? 'on' : ''}" id="power-button" type="button" aria-pressed="${state.protectionEnabled}" ${pending ? 'disabled' : ''}>
            <span aria-hidden="true"></span>${pending ? `UNLOCKS IN ${formatRemaining(pending)}` : state.protectionEnabled ? 'PAUSE RULES' : 'ARM RULES'}
          </button>
        </div>

        <div id="message" class="message ${messageKind}" aria-live="polite">${escapeHtml(message)}</div>

        <div class="rule-builder">
          <form id="domain-form" novalidate>
            <label for="domain">Domain to block</label>
            <div class="input-row"><input id="domain" name="domain" inputmode="url" autocomplete="off" spellcheck="false" aria-describedby="domain-help domain-error" placeholder="example.com or *.example.com" /><button class="button primary" type="submit">Add domain</button></div>
            <p class="field-help" id="domain-help">A bare domain blocks it and its subdomains. Use <code>*.example.com</code> to make the wildcard explicit.</p>
            <p class="field-error" id="domain-error" aria-live="assertive"></p>
          </form>
          <div class="rule-toolbar">
            <p><strong>${state.rules.length}</strong> ${state.rules.length === 1 ? 'rule' : 'rules'}</p>
            <div><button class="button ghost" type="button" id="import-button">Import</button><button class="button ghost" type="button" id="export-button" ${state.rules.length ? '' : 'disabled'}>Export</button><input class="visually-hidden" id="import-file" type="file" aria-label="Choose Quietwall export file" accept="application/json,.json" /></div>
          </div>
          <ul class="rule-list" aria-label="Blocked domains">
            ${state.rules.length ? state.rules.map((rule) => `
              <li data-id="${rule.id}" class="${rule.enabled ? '' : 'muted-rule'}">
                <label class="mini-switch"><input type="checkbox" data-action="toggle" ${rule.enabled ? 'checked' : ''} /><span aria-hidden="true"></span><span class="visually-hidden">${rule.enabled ? 'Disable' : 'Enable'} ${escapeHtml(rule.pattern)}</span></label>
                <span class="domain-name">${escapeHtml(rule.pattern)}</span>
                <button class="icon-button" type="button" data-action="remove" aria-label="Remove ${escapeHtml(rule.pattern)}">×</button>
              </li>`).join('') : `
              <li class="empty-state"><span class="empty-pixel" aria-hidden="true">＋</span><div><strong>No domains yet</strong><p>Add the site that steals the most time. Your list never leaves this device.</p></div></li>`}
          </ul>
        </div>

        <details class="commitment" ${state.unlockDelayMinutes || state.scheduleEnabled ? 'open' : ''}>
          <summary><span><span class="summary-icon" aria-hidden="true">⌛</span><strong>Commitment controls</strong></span><span class="summary-hint">OPTIONAL</span></summary>
          <div class="commitment-grid">
            <div class="setting"><label for="delay">Delay before pausing</label><div class="number-field"><input id="delay" type="number" min="0" max="1440" step="1" value="${state.unlockDelayMinutes}" /><span>minutes</span></div><p>Once armed, a pause request waits this long. Uninstalling still bypasses it.</p></div>
            <div class="setting"><label class="check-row"><input id="schedule-enabled" type="checkbox" ${state.scheduleEnabled ? 'checked' : ''} /><span>Use focus hours</span></label><div class="time-row"><label>From<input id="schedule-start" type="time" value="${state.scheduleStart}" ${state.scheduleEnabled ? '' : 'disabled'} /></label><label>To<input id="schedule-end" type="time" value="${state.scheduleEnd}" ${state.scheduleEnabled ? '' : 'disabled'} /></label></div><p>Overnight ranges work. Equal times means all day.</p></div>
          </div>
        </details>
      </section>

      <section class="truth" aria-labelledby="truth-title">
        <div><p class="eyebrow">THREAT MODEL</p><h2 id="truth-title">Small surface. Honest limits.</h2></div>
        <div class="truth-grid">
          <article><span>✓</span><h3>What it blocks</h3><p>Domains in apps and browsers when the future Android VPN service is active and DNS is visible.</p></article>
          <article><span>!</span><h3>What can bypass it</h3><p>Another VPN, encrypted DNS configured by an app, or uninstalling Quietwall. This is commitment—not parental control.</p></article>
          <article><span>↯</span><h3>Network promise</h3><p>The configurator makes no third-party requests. Rules are stored in IndexedDB and exports are made in your browser.</p></article>
        </div>
        <div class="android-note"><span class="pixel-phone" aria-hidden="true"></span><div><strong>Android VPN engine is the next native build step.</strong><p>This work order delivers the installable, offline configurator and Capacitor shell. This web build does not claim to intercept device traffic.</p></div></div>
      </section>
    </main>
    <footer>
      <div><a class="brand footer-brand" href="/"><span class="brand-mark" aria-hidden="true">Q</span><span>QUIETWALL</span></a><p>Private by construction. Free and open source.</p></div>
      <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-android-site-blocker-private">Source code</a></nav>
      <p class="asset-note">Original pixel artwork; no user or browsing data is collected.</p>
    </footer>
    <div class="toast" id="toast" hidden><span>Update ready.</span><button type="button" id="update-button">Reload</button></div>`;
  bindEvents();
}

async function persist(successMessage?: string): Promise<void> {
  try {
    await saveState(state);
    storageError = false;
    if (successMessage) { message = successMessage; messageKind = 'ok'; }
  } catch (error) {
    storageError = true;
    message = error instanceof Error ? error.message : 'Changes could not be saved.';
    messageKind = 'error';
  }
  render();
}

function bindEvents(): void {
  document.querySelector<HTMLFormElement>('#domain-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('#domain');
    const error = document.querySelector<HTMLElement>('#domain-error');
    if (!input || !error) return;
    try {
      const pattern = normalizeDomain(input.value);
      if (state.rules.some((rule) => rule.pattern === pattern)) throw new Error(`${pattern} is already in your wall.`);
      state.rules.unshift({ id: crypto.randomUUID(), pattern, enabled: true, createdAt: new Date().toISOString() });
      input.value = '';
      await persist(`${pattern} added.`);
      document.querySelector<HTMLInputElement>('#domain')?.focus();
    } catch (problem) {
      error.textContent = problem instanceof Error ? problem.message : 'That domain could not be added.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
  });

  document.querySelector('#power-button')?.addEventListener('click', async () => {
    if (!state.protectionEnabled && !state.rules.some((rule) => rule.enabled)) {
      message = 'Add and enable at least one domain before arming rules.'; messageKind = 'error'; render(); return;
    }
    if (state.protectionEnabled && state.unlockDelayMinutes > 0) {
      const now = new Date();
      state.unlockRequestedAt = now.toISOString();
      state.unlockAt = new Date(now.getTime() + state.unlockDelayMinutes * 60_000).toISOString();
      await persist(`Pause requested. Rules remain armed for ${state.unlockDelayMinutes} minutes.`);
      return;
    }
    state.protectionEnabled = !state.protectionEnabled;
    state.unlockAt = null; state.unlockRequestedAt = null;
    await persist(state.protectionEnabled ? 'Rules armed on this device.' : 'Rules paused.');
  });

  document.querySelectorAll<HTMLElement>('.rule-list li[data-id]').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector<HTMLInputElement>('[data-action="toggle"]')?.addEventListener('change', async (event) => {
      const rule = state.rules.find((item) => item.id === id);
      if (rule) { rule.enabled = (event.currentTarget as HTMLInputElement).checked; await persist(`${rule.pattern} ${rule.enabled ? 'enabled' : 'paused'}.`); }
    });
    row.querySelector('[data-action="remove"]')?.addEventListener('click', async () => {
      const index = state.rules.findIndex((item) => item.id === id);
      if (index < 0) return;
      const rule = state.rules[index];
      if (!window.confirm(`Remove ${rule.pattern} from your wall?`)) return;
      removedRule = { rule, index }; state.rules.splice(index, 1);
      await persist(`${rule.pattern} removed. Use Undo to restore it.`);
      const region = document.querySelector('#message');
      if (region && removedRule) {
        const undo = document.createElement('button'); undo.type = 'button'; undo.className = 'inline-action'; undo.textContent = 'Undo';
        undo.addEventListener('click', async () => { if (!removedRule) return; state.rules.splice(removedRule.index, 0, removedRule.rule); const restored = removedRule.rule.pattern; removedRule = null; await persist(`${restored} restored.`); });
        region.append(' ', undo);
      }
    });
  });

  document.querySelector('#export-button')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `quietwall-rules-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
    message = 'Export created. Keep it somewhere you control.'; messageKind = 'ok'; render();
  });
  document.querySelector('#import-button')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#import-file')?.click());
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return;
    try { state = parseImport(JSON.parse(await file.text())); await persist(`${state.rules.length} rules imported.`); }
    catch (problem) { message = problem instanceof Error ? problem.message : 'The import could not be read.'; messageKind = 'error'; render(); }
  });

  document.querySelector<HTMLInputElement>('#delay')?.addEventListener('change', async (event) => { state.unlockDelayMinutes = clampDelay((event.currentTarget as HTMLInputElement).value); await persist('Unlock delay saved.'); });
  document.querySelector<HTMLInputElement>('#schedule-enabled')?.addEventListener('change', async (event) => { state.scheduleEnabled = (event.currentTarget as HTMLInputElement).checked; await persist(state.scheduleEnabled ? 'Focus hours enabled.' : 'Focus hours disabled.'); });
  for (const key of ['start', 'end'] as const) document.querySelector<HTMLInputElement>(`#schedule-${key}`)?.addEventListener('change', async (event) => { state[key === 'start' ? 'scheduleStart' : 'scheduleEnd'] = (event.currentTarget as HTMLInputElement).value; await persist('Focus hours saved.'); });
}

async function boot(): Promise<void> {
  try { state = await loadState(); await navigator.storage?.persist?.(); }
  catch (error) { storageError = true; message = error instanceof Error ? error.message : 'Local storage is unavailable.'; messageKind = 'error'; }
  if (state.unlockAt && remainingUnlock() <= 0) { state.protectionEnabled = false; state.unlockAt = null; state.unlockRequestedAt = null; await saveState(state); }
  render();
  window.addEventListener('online', () => { sessionStorage.removeItem('quietwall-offline'); updateNetworkLabel(); });
  window.addEventListener('offline', () => { sessionStorage.setItem('quietwall-offline', '1'); updateNetworkLabel(); });
  updateNetworkLabel();
}

function updateNetworkLabel(): void {
  const label = document.querySelector('#network-label');
  const offline = !navigator.onLine || sessionStorage.getItem('quietwall-offline') === '1';
  if (label) label.textContent = offline ? 'OFFLINE · RULES AVAILABLE' : 'NO CLOUD · LOCAL ONLY';
}

window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event as InstallPrompt; void installPrompt; });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    if (registration.waiting) showUpdate(registration);
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => {
      if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration);
    }));
  }).catch(() => { /* App remains fully usable without install support. */ });
}

function showUpdate(registration: ServiceWorkerRegistration): void {
  const toast = document.querySelector<HTMLElement>('#toast'); if (!toast) return; toast.hidden = false;
  document.querySelector('#update-button')?.addEventListener('click', () => registration.waiting?.postMessage('SKIP_WAITING'));
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
}

setInterval(async () => {
  if (!state.unlockAt) return;
  if (remainingUnlock() <= 0) { state.protectionEnabled = false; state.unlockAt = null; state.unlockRequestedAt = null; await persist('Unlock delay finished. Rules are paused.'); }
  else { const button = document.querySelector('#power-button'); if (button) button.textContent = `UNLOCKS IN ${formatRemaining(remainingUnlock())}`; }
}, 1000);

void boot();
