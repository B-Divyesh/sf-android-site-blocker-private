# Quietwall demo sandbox

- Demo URL: `https://android-site-blocker-private.sociobot.in/?demo=1`
- Alias: `/demo/`
- Sample: three enabled domains, one paused domain, overnight focus hours, and a 15-minute pause delay.
- First view: demo routes skip the landing hero, focus **Try a sample Android block list**, and show all sample values within 390 × 844.
- Storage: IndexedDB database `quietwall-demo`, key `current` in store `state`.
- Real storage: IndexedDB database `quietwall-local`. Demo code never opens it.
- Reset: select **Reset demo** in the persistent amber banner.
- Exit: select **Start for real**. The page reloads at `/` and reads only real storage.
- Offline: visit the demo once, wait for the service worker, then reload with the network disabled.
- Verification: `one click opens visible sample data in the first mobile viewport` checks the CTA, focus, banner, values, and viewport boundary.
