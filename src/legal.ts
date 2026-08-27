import './styles.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('App root is missing.');
const page = root.dataset.page;
const privacy = page === 'privacy';

root.innerHTML = `
  <header class="site-header"><a class="brand" href="/" aria-label="Quietwall home"><span class="brand-mark" aria-hidden="true">Q</span><span>QUIETWALL</span></a><a class="back-link" href="/">← Back to app</a></header>
  <main id="main" class="legal">
    <p class="eyebrow">${privacy ? 'PRIVACY' : 'TERMS'} / VERSION 1.0</p>
    <h1>${privacy ? 'Nothing to hide in the fine print.' : 'Simple terms for a simple tool.'}</h1>
    ${privacy ? `
      <p class="legal-lede">Quietwall is designed so there is almost nothing to say here: your domain rules stay on your device.</p>
      <h2>Data we collect</h2><p>None. This static app has no analytics, advertising, telemetry, account system, remote API, or crash-reporting SDK. We do not receive your block list or browsing activity.</p>
      <h2>Data stored on your device</h2><p>Your rules, schedule, and commitment settings are saved in your browser’s IndexedDB. They remain until you clear site data or uninstall the app. Export creates a JSON file only when you request one.</p>
      <h2>Network access</h2><p>The PWA fetches its own files from this website during installation and updates. Once installed, its app shell works offline. The future Android VPN component will process DNS on-device and will not send logs to us.</p>
      <h2>Your control</h2><p>You can remove individual rules, export your complete configuration, or clear this site’s storage in Android settings. There is no server-side copy for us to retrieve or delete.</p>
      <h2>Contact</h2><p>Open an issue in the public source repository for privacy questions. Last updated: 27 August 2026.</p>` : `
      <p class="legal-lede">Quietwall is free, open-source software for personal commitment—not a parental-control or security guarantee.</p>
      <h2>Use and availability</h2><p>You may use, modify, and redistribute Quietwall under the MIT License. The software is provided “as is,” without warranties. Features may change and availability is not guaranteed.</p>
      <h2>Known limitations</h2><p>Another VPN, encrypted DNS inside an app, Android settings, or uninstalling Quietwall can bypass blocking. The web configurator does not itself intercept traffic. Do not rely on Quietwall for safety-critical filtering or supervision.</p>
      <h2>Your responsibility</h2><p>You are responsible for the domains you add and for complying with laws and workplace or device policies. Do not use the app to interfere with a device you do not own or administer.</p>
      <h2>No payment or account</h2><p>Version 1 is free. There is no account, subscription, or purchase in this release. Last updated: 27 August 2026.</p>`}
  </main>
  <footer><p>Quietwall · private by construction</p><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav></footer>`;
