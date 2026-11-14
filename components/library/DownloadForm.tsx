"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DISCOVERY_OPTIONS, downloadRequestSchema } from "@/lib/domain/download-schema";
import { apiFetch } from "@/lib/client/api";

type Values = {
  lastName: string; firstName: string; church: string; whatsapp: string; email: string; motivation: string; discovery: string;
};
const EMPTY: Values = { lastName: "", firstName: "", church: "", whatsapp: "", email: "", motivation: "", discovery: "" };
const REQUIRED: (keyof Values)[] = ["lastName", "firstName", "church", "whatsapp", "motivation", "discovery"];
const LABELS: Record<keyof Values, string> = {
  lastName: "Nom", firstName: "Prénom", church: "Église locale", whatsapp: "Numéro WhatsApp",
  email: "Email", motivation: "Motivation", discovery: "Comment avez-vous connu le ministère ?",
};

type Phase = { name: "saisie" } | { name: "envoi" } | { name: "succes"; url: string } | { name: "echec"; message: string; retryable: boolean };

/**
 * Parcours « Recevoir cet ouvrage » : intégré à la fiche (pas de pop-up), labels permanents,
 * validation identique au serveur, clé d'idempotence conservée pour la reprise après coupure.
 * Les données personnelles ne sont gardées qu'en sessionStorage (effacé à la fermeture de l'onglet).
 */
export function DownloadForm({ workId, title }: { workId: string; title: string }) {
  const uid = useId();
  const storageKey = `ms:telechargement:${workId}`;
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>({ name: "saisie" });
  const [idemKey, setIdemKey] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Restauration après hydratation : sessionStorage n'existe pas côté serveur.
  useEffect(() => {
    let saved: { values?: Values; key?: string; url?: string } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    } catch {
      /* stockage indisponible : formulaire vierge */
    }
    /* eslint-disable react-hooks/set-state-in-effect -- synchronisation unique depuis un stockage externe au rendu serveur */
    if (saved?.values) setValues({ ...EMPTY, ...saved.values });
    if (saved?.url) setPhase({ name: "succes", url: saved.url });
    setIdemKey(saved?.key ?? crypto.randomUUID());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storageKey]);

  const persist = (patch: Record<string, unknown>) => {
    try {
      const cur = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}");
      sessionStorage.setItem(storageKey, JSON.stringify({ ...cur, ...patch }));
    } catch {
      /* ignoré */
    }
  };

  const parsed = useMemo(
    () => downloadRequestSchema.safeParse({ ...values, workId, idempotencyKey: idemKey ?? "00000000-0000-4000-8000-000000000000" }),
    [values, workId, idemKey],
  );
  const clientErrors = useMemo(() => {
    const out: Partial<Record<keyof Values, string>> = {};
    if (!parsed.success) for (const i of parsed.error.issues) out[i.path[0] as keyof Values] ??= i.message;
    return out;
  }, [parsed]);
  const missing = REQUIRED.filter((k) => clientErrors[k]);
  const errorFor = (k: keyof Values) => serverErrors[k] ?? (touched[k] ? clientErrors[k] : undefined);

  const update = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    setServerErrors((s) => ({ ...s, [k]: undefined as unknown as string }));
    persist({ values: next, key: idemKey });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (!parsed.success || !idemKey || phase.name === "envoi") return;
    setPhase({ name: "envoi" });
    const res = await apiFetch<{ downloadUrl: string }>("/api/download", {
      method: "POST",
      json: { ...values, workId, idempotencyKey: idemKey },
    });
    if (res.ok) {
      persist({ url: res.data.downloadUrl, values: undefined, key: idemKey });
      setPhase({ name: "succes", url: res.data.downloadUrl });
    } else {
      if (res.error.fields) setServerErrors(res.error.fields);
      setPhase({ name: "echec", message: res.error.message, retryable: res.error.retryable });
    }
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  if (phase.name === "succes") {
    return (
      <div className="receive__success" ref={statusRef} tabIndex={-1} role="status">
        <p className="receive__success-title">Votre demande est enregistrée.</p>
        <p>Vous pouvez maintenant télécharger « {title} ». Merci de le garder pour votre usage personnel.</p>
        <div className="actions">
          <a className="btn btn--solid" href={phase.url} download>
            Télécharger le PDF
          </a>
          <Link className="btn btn--line" href={`/lecture/${workId}?page=1`}>
            Lire en ligne
          </Link>
        </div>
      </div>
    );
  }

  const field = (k: keyof Values, input: React.ReactNode, hint?: string) => {
    const err = errorFor(k);
    return (
      <div className={`field${err ? " field--error" : ""}`}>
        <label htmlFor={`${uid}-${k}`}>
          {LABELS[k]}
          {REQUIRED.includes(k) ? <span className="field__req" aria-hidden="true"> *</span> : <span className="field__opt"> (facultatif)</span>}
        </label>
        {hint ? <p className="field__hint" id={`${uid}-${k}-hint`}>{hint}</p> : null}
        {input}
        {err ? <p className="field__error" id={`${uid}-${k}-err`}>{err}</p> : null}
      </div>
    );
  };
  const aria = (k: keyof Values, hint = false) => ({
    id: `${uid}-${k}`,
    name: k,
    value: values[k],
    onChange: update(k),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    "aria-invalid": Boolean(errorFor(k)) || undefined,
    "aria-describedby": [hint ? `${uid}-${k}-hint` : "", errorFor(k) ? `${uid}-${k}-err` : ""].filter(Boolean).join(" ") || undefined,
    required: REQUIRED.includes(k),
  });

  return (
    <form className="form" noValidate onSubmit={submit} aria-describedby={`${uid}-privacy`}>
      <div className="form__row">
        {field("lastName", <input type="text" autoComplete="family-name" maxLength={80} {...aria("lastName")} />)}
        {field("firstName", <input type="text" autoComplete="given-name" maxLength={80} {...aria("firstName")} />)}
      </div>
      {field("church", <input type="text" autoComplete="organization" maxLength={140} {...aria("church")} />)}
      <div className="form__row">
        {field("whatsapp", <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+229 …" {...aria("whatsapp", true)} />, "Avec l'indicatif du pays.")}
        {field("email", <input type="email" inputMode="email" autoComplete="email" spellCheck={false} maxLength={160} {...aria("email")} />)}
      </div>
      {field("motivation", <textarea rows={4} maxLength={1500} {...aria("motivation", true)} />, "Ce qui vous conduit vers cet ouvrage, en quelques mots.")}
      {field(
        "discovery",
        <select {...aria("discovery")}>
          <option value="">Choisir…</option>
          {DISCOVERY_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>,
      )}

      <p className="form__privacy" id={`${uid}-privacy`}>
        Ces informations sont enregistrées par le ministère, avec l&apos;édition reçue, afin de connaître les lecteurs de ses ouvrages.
        Elles ne sont ni vendues ni publiées. En cliquant sur « Enregistrer et obtenir le livre », vous acceptez cet enregistrement.{" "}
        <Link href="/confidentialite">Confidentialité et droits</Link>
      </p>

      <div ref={statusRef} tabIndex={-1} aria-live="polite" className="form__status">
        {phase.name === "echec" ? (
          <p className="notice notice--error">
            {phase.message} {phase.retryable ? "Vos saisies sont conservées." : ""}
          </p>
        ) : null}
        {phase.name === "saisie" && missing.length ? (
          <p className="subtle">À compléter : {missing.map((k) => LABELS[k]).join(", ")}.</p>
        ) : null}
      </div>

      <button type="submit" className="btn btn--solid" disabled={!parsed.success || phase.name === "envoi"} aria-busy={phase.name === "envoi"}>
        {phase.name === "envoi" ? "Enregistrement…" : "Enregistrer et obtenir le livre"}
      </button>
    </form>
  );
}
