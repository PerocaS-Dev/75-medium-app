import { useEffect, useState } from "react";

// `beforeinstallprompt` isn't in the standard DOM lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "installHintDismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Dismissible "add to home screen" nudge for the auth screen.
 * - Android / desktop Chrome: captures `beforeinstallprompt` → one-tap Install button.
 * - iOS Safari (no JS prompt exists): shows the manual Share → Add to Home Screen hint.
 * - Renders nothing when already installed, dismissed, or not installable.
 */
export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  const ios = isIos();
  // Only show when there's something actionable.
  if (!deferred && !ios) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
  };

  return (
    <div className="mt-6 rounded-xl border border-clay-200 bg-paper px-4 py-3 shadow-soft">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: "linear-gradient(150deg, var(--blush-400), var(--lilac-400))" }}
        >
          <span className="font-display text-base font-semibold text-white">75</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-clay-900">Add 75 Medium to your home screen</p>
          {deferred ? (
            <p className="mt-0.5 text-caption text-clay-500">
              One tap — it opens like a real app, ideal for the daily check-in.
            </p>
          ) : (
            <p className="mt-0.5 text-caption text-clay-500">
              Tap the Share icon, then <span className="font-semibold text-clay-700">Add to Home Screen</span>.
            </p>
          )}
          {deferred && (
            <button
              onClick={install}
              className="mt-2 h-9 rounded-pill bg-blush-500 px-4 text-sm font-bold text-clay-950 shadow-soft transition-colors hover:bg-blush-600"
            >
              Install
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-clay-400 transition-colors hover:text-clay-600"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
