"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

interface Props {
  workId: string;
  editionId: string;
  fileUrl: string;
  initialPage: number;
  pageCount: number;
  watermark: string;
  title: string;
}

type LoadState = { kind: "chargement"; percent: number | null } | { kind: "pret" } | { kind: "erreur"; message: string };

const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5];
const BOOKS_CACHE = "ms-livres-v1";

/** Livre gardé hors ligne par choix explicite du lecteur (jamais préchargé). */
async function cachedBook(url: string): Promise<Uint8Array | null> {
  if (typeof caches === "undefined") return null;
  try {
    const hit = await (await caches.open(BOOKS_CACHE)).match(url);
    return hit ? new Uint8Array(await hit.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * Liseuse : PDF.js chargé à la demande (hors bundle initial), requêtes Range,
 * une seule page rendue à la fois (mémoire bornée), couche texte sélectionnable,
 * filigrane d'affichage, page synchronisée dans l'URL (?page=N).
 */
export function PdfReader({ workId, editionId, fileUrl, initialPage, pageCount, watermark, title }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [state, setState] = useState<LoadState>({ kind: "chargement", percent: null });
  const [page, setPage] = useState(initialPage);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [textOpen, setTextOpen] = useState(false);
  const [pageText, setPageText] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [offline, setOffline] = useState<"inconnu" | "absent" | "present" | "enregistrement">("inconnu");
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const total = doc?.numPages ?? pageCount;

  // Chargement du document.
  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const local = await cachedBook(fileUrl);
        if (!cancelled) setOffline(local ? "present" : "absent");
        const task = (loadingTask = local
          ? pdfjs.getDocument({ data: local })
          : pdfjs.getDocument({ url: fileUrl, rangeChunkSize: 262_144, disableAutoFetch: true, disableStream: false }));
        task.onProgress = ({ loaded: l, total: t }: { loaded: number; total: number }) => {
          if (!cancelled && t) setState({ kind: "chargement", percent: Math.min(100, Math.round((l / t) * 100)) });
        };
        const loaded = await task.promise;
        if (cancelled) return;
        setDoc(loaded);
        setState({ kind: "pret" });
      } catch (e) {
        if (!cancelled) {
          const name = (e as Error)?.name;
          setState({
            kind: "erreur",
            message:
              name === "InvalidPDFException"
                ? "Le fichier de cet ouvrage est illisible ou corrompu. Le ministère en a été informé par le journal d'erreurs."
                : name === "MissingPDFException" || name === "ResponseException"
                  ? "Le fichier de cet ouvrage est introuvable pour le moment."
                  : "Impossible de charger l'ouvrage. Vérifiez votre connexion puis réessayez.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [fileUrl]);

  // Rendu de la page courante.
  const render = useCallback(async () => {
    if (!doc || !canvasRef.current || !stageRef.current) return;
    renderTaskRef.current?.cancel();
    const pdfjs = await import("pdfjs-dist");
    const p = await doc.getPage(page);
    const base = p.getViewport({ scale: 1 });
    const available = Math.max(280, stageRef.current.clientWidth - 2);
    const scale = fitWidth ? Math.min(available / base.width, 2.5) : ZOOMS[zoomIndex]!;
    const viewport = p.getViewport({ scale });
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = canvasRef.current;
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const task = p.render({ canvas, canvasContext: ctx, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch {
      return; // rendu annulé par une page plus récente
    }
    // Filigrane dessiné dans le rendu (affichage seulement : ne protège pas le fichier).
    ctx.save();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = "#0b2545";
    ctx.font = `${Math.max(12, viewport.width / 26)}px "Cormorant Garamond", Georgia, serif`;
    ctx.translate(viewport.width / 2, viewport.height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = "center";
    ctx.fillText(watermark, 0, 0);
    ctx.restore();
    // Couche texte (sélection, recherche du navigateur, lecteurs d'écran).
    const layer = textLayerRef.current;
    if (layer) {
      layer.replaceChildren();
      layer.style.width = `${Math.floor(viewport.width)}px`;
      layer.style.height = `${Math.floor(viewport.height)}px`;
      layer.style.setProperty("--scale-factor", String(scale));
      try {
        const tl = new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: layer, viewport });
        await tl.render();
      } catch {
        /* couche texte facultative */
      }
    }
    p.cleanup();
  }, [doc, page, zoomIndex, fitWidth, watermark]);

  useEffect(() => {
    void render();
  }, [render]);

  // Re-rendu en largeur ajustée lors d'un redimensionnement.
  useEffect(() => {
    if (!fitWidth || !stageRef.current) return;
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => void render(), 150);
    });
    ro.observe(stageRef.current);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [fitWidth, render]);

  // Synchronisation de l'URL (remplacement, pas d'empilement d'historique).
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(page));
    window.history.replaceState(window.history.state, "", url);
  }, [page]);
  const [shownPage, setShownPage] = useState(page);
  if (shownPage !== page) {
    setShownPage(page);
    setPageInput(String(page));
    setPageText(null);
  }

  // Texte de la page à la demande.
  useEffect(() => {
    if (!textOpen || pageText !== null) return;
    let cancelled = false;
    fetch(`/api/page-text?edition=${encodeURIComponent(editionId)}&page=${page}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: { text: string } } | null) => {
        if (!cancelled) setPageText(j?.data?.text ?? "");
      })
      .catch(() => !cancelled && setPageText(""));
    return () => {
      cancelled = true;
    };
  }, [textOpen, pageText, editionId, page]);

  const keepOffline = async () => {
    if (typeof caches === "undefined") return setOfflineMsg("Votre navigateur ne permet pas de garder ce livre hors ligne.");
    setOffline("enregistrement");
    try {
      const est = await navigator.storage?.estimate?.();
      if (est?.quota && est.usage !== undefined && est.quota - est.usage < 60 * 1024 * 1024) {
        setOffline("absent");
        return setOfflineMsg("Espace de stockage insuffisant sur cet appareil.");
      }
      await navigator.storage?.persist?.().catch(() => false);
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(String(res.status));
      await (await caches.open(BOOKS_CACHE)).put(fileUrl, res);
      setOffline("present");
      setOfflineMsg("Ce livre est gardé sur cet appareil. Le navigateur peut toutefois l'effacer s'il manque d'espace.");
    } catch {
      setOffline("absent");
      setOfflineMsg("L'enregistrement hors ligne a échoué.");
    }
  };

  const removeOffline = async () => {
    try {
      await (await caches.open(BOOKS_CACHE)).delete(fileUrl);
    } catch {
      /* ignoré */
    }
    setOffline("absent");
    setOfflineMsg("Le livre a été retiré de cet appareil.");
  };

  const go = useCallback((n: number) => setPage((cur) => (Number.isFinite(n) ? Math.min(Math.max(1, n), total || cur) : cur)), [total]);

  // Clavier : ←/→ pages, +/- zoom (hors champs de saisie).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(page + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(page - 1);
      else if (e.key === "+" || e.key === "=") {
        setFitWidth(false);
        setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1));
      } else if (e.key === "-") {
        setFitWidth(false);
        setZoomIndex((z) => Math.max(0, z - 1));
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, page]);

  return (
    <section className="reader" aria-label={`Liseuse : ${title}`}>
      <div className="reader__toolbar" role="toolbar" aria-label="Commandes de lecture">
        <div className="reader__group">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => go(page - 1)} disabled={page <= 1}>
            ← <span className="reader__label">Précédente</span>
          </button>
          <form
            className="reader__goto"
            onSubmit={(e) => {
              e.preventDefault();
              go(Number.parseInt(pageInput, 10));
            }}
          >
            <label htmlFor="reader-page" className="visually-hidden">Numéro de page</label>
            <input id="reader-page" inputMode="numeric" pattern="[0-9]*" value={pageInput} onChange={(e) => setPageInput(e.target.value)} onBlur={() => go(Number.parseInt(pageInput, 10))} />
            <span className="subtle">/ {total || "…"}</span>
          </form>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => go(page + 1)} disabled={!!total && page >= total}>
            <span className="reader__label">Suivante</span> →
          </button>
        </div>
        <div className="reader__group">
          <button type="button" className="btn btn--ghost btn--small" aria-label="Réduire" onClick={() => { setFitWidth(false); setZoomIndex((z) => Math.max(0, z - 1)); }}>−</button>
          <button type="button" className="btn btn--ghost btn--small" aria-pressed={fitWidth} onClick={() => setFitWidth((f) => !f)}>
            {fitWidth ? "Largeur" : `${Math.round(ZOOMS[zoomIndex]! * 100)} %`}
          </button>
          <button type="button" className="btn btn--ghost btn--small" aria-label="Agrandir" onClick={() => { setFitWidth(false); setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1)); }}>+</button>
          <button type="button" className="btn btn--ghost btn--small" aria-expanded={textOpen} onClick={() => setTextOpen((o) => !o)}>
            Texte
          </button>
          <Link className="btn btn--ghost btn--small" href={`/etude?ouvrage=${workId}`}>Étudier</Link>
          {offline === "present" ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={removeOffline}>Retirer de l&apos;appareil</button>
          ) : offline !== "inconnu" ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={keepOffline} disabled={offline === "enregistrement"}>
              {offline === "enregistrement" ? "Enregistrement…" : "Garder hors ligne"}
            </button>
          ) : null}
        </div>
      </div>

      <p className="visually-hidden" aria-live="polite">Page {page} sur {total}</p>
      {offlineMsg ? <p className="notice container container--reading" role="status">{offlineMsg}</p> : null}

      {state.kind === "erreur" ? (
        <div className="container container--reading empty" role="alert">
          <p className="empty__title">{state.message}</p>
          <Link className="btn btn--line" href={`/ouvrages/${workId}`}>Retour à l&apos;ouvrage</Link>
        </div>
      ) : (
        <div className="reader__stage" ref={stageRef}>
          {state.kind === "chargement" ? (
            <p className="reader__loading" role="status">Chargement de l&apos;ouvrage{state.percent !== null ? ` — ${state.percent} %` : "…"}</p>
          ) : null}
          <div className="reader__page" data-ready={state.kind === "pret"}>
            <canvas ref={canvasRef} aria-hidden="true" />
            <div ref={textLayerRef} className="textLayer" />
            <span className="reader__watermark" aria-hidden="true">{watermark}</span>
          </div>
        </div>
      )}

      {textOpen ? (
        <aside className="reader__text container container--reading" aria-label={`Texte de la page ${page}`}>
          <h2 className="reader__text-title">Texte extrait — page {page} du fichier</h2>
          {pageText === null ? <p className="subtle">Chargement…</p> : pageText ? <p className="reader__text-body">{pageText}</p> : <p className="subtle">Cette page n&apos;a pas de couche texte exploitable (image numérisée) : seul le rendu visuel est disponible.</p>}
        </aside>
      ) : null}
      <p className="reader__rights subtle container container--wide">{watermark}. Le filigrane accompagne l&apos;affichage ; il ne remplace pas le respect des droits de l&apos;auteur.</p>
    </section>
  );
}
