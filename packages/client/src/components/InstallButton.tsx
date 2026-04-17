import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Capture the prompt event as early as possible — browsers fire it once
// and only offer `prompt()` if we have a reference.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

export default function InstallButton() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    // Poll briefly — the event may fire after the component mounts.
    setCanPrompt(!!deferredPrompt);
    const t = setInterval(() => setCanPrompt(!!deferredPrompt), 500);
    const onInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearInterval(t);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstalled(true);
        }
      } catch {
        /* prompt already consumed or blocked */
      }
      deferredPrompt = null;
      setCanPrompt(false);
    } else if (isIOS()) {
      setShowIosTip(true);
    }
  };

  // If the browser never offered install and we're not on iOS, hide the button
  // entirely — tapping it would do nothing.
  if (!canPrompt && !isIOS()) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full py-2.5 rounded-xl bg-white/5 text-white/70 font-medium text-sm border border-white/15 hover:bg-white/10 hover:text-white active:scale-[0.97] transition-all flex items-center justify-center gap-2"
      >
        <span>📱</span>
        <span>App installieren</span>
      </button>

      {showIosTip && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowIosTip(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#2a1810] to-[#1b0f0a] border border-gold/30 shadow-2xl p-5 mb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-gold font-black text-lg mb-2">Auf iPhone installieren</h3>
            <ol className="text-white/80 text-sm space-y-2 leading-relaxed">
              <li>
                1. Tippe auf <span className="font-bold">Teilen</span> ⬆️ in Safari
              </li>
              <li>
                2. Waehle <span className="font-bold">Zum Home-Bildschirm</span>
              </li>
              <li>
                3. Tippe <span className="font-bold">Hinzufuegen</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIosTip(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-felt-dark font-bold text-sm"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
}
