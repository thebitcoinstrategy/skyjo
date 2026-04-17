import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 60_000;
const VERSION_ENDPOINT_INTERVAL_MS = 60_000;

/**
 * Install the service-worker update flow so new deploys take over without
 * the user having to clear site data:
 *
 *   1. Register with immediate=true so the SW checks for updates on load.
 *   2. Poll the registration every 60 s and on window focus so a PWA that
 *      stayed foregrounded also catches the new version.
 *   3. When a new SW is ready, updateSW(true) skip-waits + reloads.
 *   4. Belt-and-suspenders: poll /api/version and reload if the server
 *      reports a newer build than the one currently running.
 */
export function setupServiceWorkerUpdates(): void {
  if (typeof window === 'undefined') return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // New SW installed and waiting — activate + reload right now.
      updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const poll = () => {
        registration.update().catch(() => { /* network hiccup — try again later */ });
      };
      setInterval(poll, UPDATE_CHECK_INTERVAL_MS);
      window.addEventListener('focus', poll);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') poll();
      });
    },
  });

  // Fallback version check: if the server reports a different build than
  // the one we booted with, force-reload. This catches cases where the SW
  // failed to update for any reason.
  let lastKnownBuild: string | null = null;
  const checkVersion = async () => {
    try {
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { version: string; build: string };
      if (lastKnownBuild === null) {
        lastKnownBuild = data.build;
        return;
      }
      if (data.build !== lastKnownBuild) {
        // New deploy detected — unregister SW caches and reload.
        try {
          const regs = await navigator.serviceWorker?.getRegistrations?.();
          await Promise.all((regs ?? []).map((r) => r.update()));
        } catch { /* ignore */ }
        window.location.reload();
      }
    } catch {
      // Network error — not a real mismatch, don't reload.
    }
  };
  setTimeout(checkVersion, 5_000);
  setInterval(checkVersion, VERSION_ENDPOINT_INTERVAL_MS);
  window.addEventListener('focus', checkVersion);
}
