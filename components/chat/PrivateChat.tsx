"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { apiFetch } from "@/lib/client/api";

interface Msg { id: string; senderRole: "lecteur" | "ministere"; body: string; createdAt: string; state?: "envoi" | "echec"; clientId?: string }

const DRAFT = "ms:discussion:brouillon";

export function PrivateChat() {
  const uid = useId();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const load = useCallback(async (before?: string) => {
    const res = await apiFetch<{ conversation: { displayName: string } | null; messages: Msg[]; nextCursor: string | null }>(
      `/api/messages${before ? `?avant=${encodeURIComponent(before)}` : ""}`,
    );
    if (!res.ok) {
      setLoadError(res.error.message);
      return;
    }
    setLoadError(null);
    setHasConversation(Boolean(res.data.conversation));
    setMessages((cur) => (before ? [...res.data.messages, ...cur] : res.data.messages));
    setCursor(res.data.nextCursor);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let draft = "";
    try { draft = sessionStorage.getItem(DRAFT) ?? ""; } catch { /* ignoré */ }
    /* eslint-disable react-hooks/set-state-in-effect -- chargement réseau (état mis à jour après réponse) et restauration du brouillon après hydratation */
    if (draft) setBody(draft);
    void load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT, body); } catch { /* ignoré */ }
  }, [body]);

  async function deliver(text: string, clientId: string) {
    setMessages((m) => [...m.filter((x) => x.clientId !== clientId), { id: clientId, clientId, senderRole: "lecteur", body: text, createdAt: new Date().toISOString(), state: "envoi" }]);
    const res = await apiFetch<{ message: Msg }>("/api/messages", {
      method: "POST",
      json: { body: text, clientId, ...(hasConversation ? {} : { displayName: name, contact }) },
    });
    if (res.ok) {
      setMessages((m) => m.map((x) => (x.clientId === clientId ? { ...res.data.message } : x)));
      setHasConversation(true);
      setError(null);
    } else {
      setMessages((m) => m.map((x) => (x.clientId === clientId ? { ...x, state: "echec" } : x)));
      setError(res.error.fields?.displayName ?? res.error.message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (!hasConversation && name.trim().length < 2) {
      setError("Indiquez votre nom pour ouvrir la consultation.");
      return;
    }
    setBody("");
    await deliver(text, crypto.randomUUID());
  }

  if (!loaded && !loadError) return <p className="subtle" role="status">Chargement de la conversation…</p>;

  return (
    <div className="chat">
      {loadError ? <p className="notice notice--error">{loadError} <button type="button" className="btn btn--ghost btn--small" onClick={() => void load()}>Réessayer</button></p> : null}
      {cursor ? (
        <button type="button" className="btn btn--ghost btn--small" onClick={() => void load(cursor)}>Afficher les messages plus anciens</button>
      ) : null}
      {messages.length ? (
        <ol className="chat__list" ref={listRef} aria-label="Messages">
          {messages.map((m) => (
            <li key={m.id} className={`chat__msg chat__msg--${m.senderRole}`}>
              <p className="chat__meta">
                {m.senderRole === "ministere" ? "Le ministère" : "Vous"} ·{" "}
                <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</time>
              </p>
              <p className="chat__body">{m.body}</p>
              {m.state === "envoi" ? <p className="subtle">Envoi…</p> : null}
              {m.state === "echec" ? (
                <p className="field__error">
                  Non envoyé.{" "}
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => void deliver(m.body, m.clientId!)}>Réessayer</button>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Aucun message pour l&apos;instant.</p>
      )}

      <form className="form chat__form" onSubmit={submit}>
        {!hasConversation ? (
          <div className="form__row">
            <div className="field">
              <label htmlFor={`${uid}-name`}>Votre nom <span className="field__req" aria-hidden="true">*</span></label>
              <input id={`${uid}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor={`${uid}-contact`}>WhatsApp ou email <span className="field__opt">(facultatif)</span></label>
              <input id={`${uid}-contact`} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={160} />
            </div>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor={`${uid}-body`}>Votre message</label>
          <textarea id={`${uid}-body`} rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
        </div>
        <div aria-live="polite">{error ? <p className="notice notice--error">{error}</p> : null}</div>
        <button type="submit" className="btn btn--solid" disabled={!body.trim()}>Envoyer au ministère</button>
      </form>
    </div>
  );
}
