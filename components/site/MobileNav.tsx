"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { NavLink } from "./NavLink";

/** Menu mobile : vrai bouton, Escape, piège de focus, retour du focus, fond inerte. */
export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  // Fermeture lors d'un changement de page (ajustement d'état pendant le rendu, sans effet).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const main = document.getElementById("contenu");
    const footer = document.querySelector("footer");
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");
    const first = panelRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = [...panelRef.current.querySelectorAll<HTMLElement>("a, button")];
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
    };
  }, [open, close]);

  return (
    <div className="mobile-nav">
      <button
        ref={buttonRef}
        type="button"
        className="mobile-nav__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        <span>{open ? "Fermer" : "Menu"}</span>
      </button>
      <div id={panelId} ref={panelRef} className="mobile-nav__panel" data-open={open} hidden={!open}>
        <nav aria-label="Navigation mobile">
          <ul>
            {items.map((i) => (
              <li key={i.href}>
                <NavLink href={i.href} onNavigate={() => close(false)}>
                  {i.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
