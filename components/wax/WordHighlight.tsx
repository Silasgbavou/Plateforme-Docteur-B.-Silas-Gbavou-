"use client";
import { useEffect, useRef } from "react";

/**
 * Moment « word-highlight » (tirage Taste) : la phrase repose à demi-encre (lisible, ~4:1) et passe
 * à l'encre mot à mot lorsqu'elle traverse le milieu de l'écran ; un mot fort prend l'accent.
 * Elle revient en arrière quand on remonte. Mouvement réduit ou sans script : toute la phrase à l'encre.
 */
export function WordHighlight({ text, strong }: { text: string; strong?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(/\s+/);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = [...el.querySelectorAll<HTMLSpanElement>(".wh__w")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spans.forEach((s) => s.classList.add("is-on"));
      return;
    }
    el.classList.add("is-live");
    let shown = -1;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.45;
      const t = Math.min(1, Math.max(0, (start - r.top) / Math.max(1, start - end + r.height)));
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const k = atEnd ? spans.length : Math.round(t * spans.length);
      if (k === shown) return;
      shown = k;
      spans.forEach((s, i) => s.classList.toggle("is-on", i < k));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <p ref={ref} className="wh" data-moment="word-highlight">
      {words.map((w, i) => (
        <span key={i}>
          <span className={`wh__w${strong && w.replace(/[,.;]/g, "") === strong ? " wh__w--strong" : ""}`}>{w}</span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
