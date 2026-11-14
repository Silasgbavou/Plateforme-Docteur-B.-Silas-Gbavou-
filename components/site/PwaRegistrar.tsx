"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Enregistre le service worker et annonce une nouvelle version SANS recharger d'office :
 * le lecteur choisit le moment (brouillons conservés en stockage local par les formulaires).
 */
export function PwaRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [installEvent, setInstallEvent] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Rechargement UNIQUEMENT après demande explicite : la première installation du service worker
  // (clients.claim) déclenche aussi « controllerchange » et ne doit jamais recharger la page.
  const updateRequested = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing || !updateRequested.current) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
        });
      });
    }).catch(() => undefined);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (waiting) {
    return (
      <div className="toast" role="status">
        <p>Une nouvelle version du site est disponible.</p>
        <div className="toast__actions">
          <button type="button" className="btn btn--line btn--small" onClick={() => setWaiting(null)}>Plus tard</button>
          <button type="button" className="btn btn--solid btn--small" onClick={() => {
              updateRequested.current = true;
              waiting.postMessage({ type: "SKIP_WAITING" });
            }}>
            Mettre à jour
          </button>
        </div>
      </div>
    );
  }
  if (installEvent && !dismissed) {
    return (
      <div className="toast" role="status">
        <p>Installer la bibliothèque du ministère sur cet appareil ?</p>
        <div className="toast__actions">
          <button type="button" className="btn btn--line btn--small" onClick={() => setDismissed(true)}>Non merci</button>
          <button
            type="button"
            className="btn btn--solid btn--small"
            onClick={async () => {
              await installEvent.prompt().catch(() => undefined);
              setInstallEvent(null);
            }}
          >
            Installer
          </button>
        </div>
      </div>
    );
  }
  return null;
}
