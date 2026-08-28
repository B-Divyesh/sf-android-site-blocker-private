import { rm } from 'node:fs/promises';

// The public website offers the APK, but embedding that APK inside itself would
// make every native rebuild grow recursively. Capacitor receives the web app
// without the website-only download directory.
await rm(new URL('../dist/downloads/', import.meta.url), { recursive: true, force: true });
