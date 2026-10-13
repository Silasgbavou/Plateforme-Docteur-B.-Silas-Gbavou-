"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { StudyAnswer, StudyExchange, StudySource } from "@/lib/domain/study-types";
import { CONTACTS } from "@/lib/domain/contacts";
import { apiFetch } from "@/lib/client/api";
import { AnswerText } from "./AnswerText";
import { readSse } from "./sse";
import { ArrowIcon, MailIcon, WhatsAppIcon } from "@/components/ui/icons";

interface Props {
  title: string;
  works: { id: string; title: string; theme: string | null; hasEdition: boolean }[];
  initialWorkId: string | null;
  initialQuestion: string;
  initialContext: "textes" | "predications";
  themes: string[];
}

interface LiveExchange extends StudyExchange {
  pending?: string; // message d'étape en cours
  error?: string;
}

interface EngineState {
  corpus: { textes: number; predications: number };
  synthese: boolean;
  semantique: boolean;
}

const THREAD_KEY = "ms:etude:fil";
const DRAFT_KEY = "ms:etude:brouillon";

const SECTION_TITLES: [keyof NonNullable<StudyAnswer["sections"]>, string][] = [
  ["fondement", "1. Fondement Théologique"],
  ["ecritures", "2. Appui des Écritures"],
  ["ancrage", "3. Ancrage dans le Corpus"],
  ["application", "4. Application Pratique & Exhortation Pastorale"],
];

export function StudyApp({ title, works, initialWorkId, initialQuestion, initialContext, themes }: Props) {
  const uid = useId();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<LiveExchange[]>([]);
  const [question, setQuestion] = useState(initialQuestion);
  const [context, setContext] = useState<"textes" | "predications">(initialContext);
  const [workId, setWorkId] = useState<string | null>(initialWorkId);
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [threads, setThreads] = useState<{ threadId: string; firstQuestion: string; lastAt: string; count: number }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  const loadThread = useCallback(async (id: string) => {
    const res = await apiFetch<{ exchanges: StudyExchange[] }>(`/api/etude/historique?fil=${id}`);
    if (res.ok) setExchanges(res.data.exchanges);
  }, []);

  const loadThreads = useCallback(async () => {
    const res = await apiFetch<{ threads: typeof threads }>("/api/etude/historique");
    if (res.ok) setThreads(res.data.threads);
  }, []);

  // Initialisation : fil courant (sessionStorage), brouillon, état du moteur.
  useEffect(() => {
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(THREAD_KEY);
      const draft = sessionStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restauration du brouillon après hydratation
      if (draft && !initialQuestion) setQuestion(draft);
    } catch {
      /* stockage indisponible */
    }
    if (!id) {
      id = crypto.randomUUID();
      try { sessionStorage.setItem(THREAD_KEY, id); } catch { /* ignoré */ }
    } else {
      void loadThread(id);
    }
    setThreadId(id);
    void apiFetch<EngineState>("/api/etude/etat").then((r) => r.ok && setEngine(r.data));
  }, [initialQuestion, loadThread]);

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, question); } catch { /* ignoré */ }
  }, [question]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!threadId || busy || q.length < 3) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setNotice("Vous êtes hors ligne. Votre question est conservée en brouillon ; l'étude nécessite une connexion.");
      return;
    }
    setNotice(null);
    setBusy(true);
    const localId = `local-${Date.now()}`;
    setExchanges((xs) => [...xs, { id: localId, question: q, createdAt: new Date().toISOString(), context, workId, sources: [], answer: null, status: "en_cours", pending: "Envoi…" }]);
    setQuestion("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const patch = (fn: (x: LiveExchange) => LiveExchange) => setExchanges((xs) => xs.map((x) => (x.id === localId ? fn(x) : x)));
    try {
      const res = await fetch("/api/etude", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, threadId, context, workId: context === "textes" ? workId : null }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        patch((x) => ({ ...x, pending: undefined, status: "erreur", error: body?.error?.message ?? "La requête a échoué." }));
        setQuestion(q);
        return;
      }
      let gotAnswer = false;
      for await (const ev of readSse(res)) {
        if (ev.event === "status") patch((x) => ({ ...x, pending: ev.data.message }));
        else if (ev.event === "sources") patch((x) => ({ ...x, sources: ev.data.sources }));
        else if (ev.event === "answer") {
          gotAnswer = true;
          patch((x) => ({ ...x, id: ev.data.exchangeId, answer: ev.data.answer, pending: undefined, status: ev.data.answer.kind }));
        } else if (ev.event === "error") patch((x) => ({ ...x, pending: undefined, status: "erreur", error: ev.data.message }));
      }
      if (!gotAnswer) patch((x) => (x.status === "en_cours" ? { ...x, pending: undefined, status: "erreur", error: "La connexion a été interrompue avant la fin. Vous pouvez reposer la question." } : x));
    } catch {
      if (ctrl.signal.aborted) patch((x) => ({ ...x, pending: undefined, status: "annule", error: "Recherche interrompue." }));
      else {
        patch((x) => ({ ...x, pending: undefined, status: "erreur", error: "La connexion a été interrompue. Votre question est remise dans la zone de saisie." }));
        setQuestion(q);
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
    }
  }, [threadId, busy, context, workId]);

  // Question transmise par l'URL (?q=) : envoyée une seule fois.
  useEffect(() => {
    if (threadId && initialQuestion && !autoSent.current) {
      autoSent.current = true;
      void send(initialQuestion);
    }
  }, [threadId, initialQuestion, send]);

  const newThread = () => {
    abortRef.current?.abort();
    const id = crypto.randomUUID();
    try { sessionStorage.setItem(THREAD_KEY, id); } catch { /* ignoré */ }
    setThreadId(id);
    setExchanges([]);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const openThread = (id: string) => {
    try { sessionStorage.setItem(THREAD_KEY, id); } catch { /* ignoré */ }
    setThreadId(id);
    void loadThread(id);
    setHistoryOpen(false);
  };

  const eraseAll = async () => {
    if (!window.confirm("Effacer tout votre historique d'étude ? Cette action est définitive.")) return;
    const res = await apiFetch<{ deleted: number }>("/api/etude/historique", { method: "DELETE" });
    if (res.ok) {
      setThreads([]);
      newThread();
      setNotice("Votre historique d'étude a été effacé.");
    }
  };

  const selectedWork = works.find((w) => w.id === workId);
  const corpusEmpty = engine && (context === "textes" ? engine.corpus.textes === 0 : engine.corpus.predications === 0);

  return (
    <div className="study__layout">
      <header className="study__head container container--wide">
        <div className="study__titles">
          <p className="kicker">Étude</p>
          <h1 className="study__title">{title}</h1>
        </div>
        <div className="study__controls">
          <fieldset className="segmented">
            <legend className="visually-hidden">Contexte de recherche</legend>
            <label>
              <input type="radio" name={`${uid}-ctx`} value="textes" checked={context === "textes"} onChange={() => setContext("textes")} />
              <span>Recherche Doctrinale &amp; Textes</span>
            </label>
            <label>
              <input type="radio" name={`${uid}-ctx`} value="predications" checked={context === "predications"} onChange={() => setContext("predications")} />
              <span>Prédications &amp; Transcriptions</span>
            </label>
          </fieldset>
          {context === "textes" ? (
            <div className="field field--inline">
              <label htmlFor={`${uid}-work`}>Ouvrage</label>
              <select id={`${uid}-work`} value={workId ?? ""} onChange={(e) => setWorkId(e.target.value || null)}>
                <option value="">Tous les ouvrages publiés</option>
                {works.map((w) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="study__toolbar">
            <EngineBadge engine={engine} context={context} />
            <button type="button" className="btn btn--ghost btn--small" aria-expanded={historyOpen} onClick={() => { setHistoryOpen((o) => !o); if (!historyOpen) void loadThreads(); }}>
              Historique
            </button>
            <button type="button" className="btn btn--ghost btn--small" onClick={newThread}>Nouveau fil</button>
          </div>
        </div>
        {selectedWork && context === "textes" ? (
          <p className="subtle study__scope">
            Recherche limitée à « {selectedWork.title} ». <Link href={`/ouvrages/${selectedWork.id}`}>Retour à l&apos;ouvrage</Link>
          </p>
        ) : null}
      </header>

      {historyOpen ? (
        <section className="container container--reading study__history" aria-label="Historique d'étude">
          <p className="subtle">
            Votre historique est rattaché à ce navigateur (cookie). Le ministère peut consulter les échanges pour veiller à la
            fidélité pédagogique. <Link href="/confidentialite">En savoir plus</Link>
          </p>
          {threads.length === 0 ? <p className="muted">Aucun fil enregistré.</p> : (
            <ul className="history-list">
              {threads.map((t) => (
                <li key={t.threadId}>
                  <button type="button" className="history-list__item" onClick={() => openThread(t.threadId)} aria-current={t.threadId === threadId ? "true" : undefined}>
                    <span>{t.firstQuestion}</span>
                    <span className="subtle">{new Date(t.lastAt).toLocaleDateString("fr-FR")} · {t.count} question{t.count > 1 ? "s" : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {threads.length ? <button type="button" className="btn btn--ghost btn--small btn--danger" onClick={eraseAll}>Effacer tout mon historique</button> : null}
        </section>
      ) : null}

      <div className="container container--reading study__thread" aria-live="polite" aria-busy={busy}>
        {notice ? <p className="notice" role="status">{notice}</p> : null}
        {exchanges.length === 0 ? (
          <div className="study__welcome">
            <p className="lead">
              Posez une question sur l&apos;enseignement du Docteur B. Silas Gbavou. Les réponses s&apos;appuient uniquement sur les
              ouvrages publiés et les prédications transcrites, avec la page ou le repère de chaque source.
            </p>
            {corpusEmpty ? (
              <p className="notice">
                {context === "textes"
                  ? "Aucun ouvrage n'est encore indexé pour l'étude : le ministère doit d'abord publier les éditions numériques."
                  : "Aucune prédication transcrite n'est encore publiée."}
              </p>
            ) : null}
            {themes.length && context === "textes" ? (
              <div className="suggestions">
                <p className="subtle">Pistes :</p>
                <ul>
                  {themes.slice(0, 5).map((t) => (
                    <li key={t}>
                      <button type="button" className="chip chip--small" onClick={() => { setQuestion(`Que disent les ouvrages sur le thème « ${t} » ?`); inputRef.current?.focus(); }}>
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <ol className="exchanges">
            {exchanges.map((x) => (
              <li key={x.id} className="exchange">
                <Exchange x={x} onFollowUp={(q) => void send(q)} busy={busy} />
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(question);
        }}
      >
        <div className="composer__inner container container--reading">
          <label htmlFor={`${uid}-q`} className="visually-hidden">Votre question</label>
          <textarea
            id={`${uid}-q`}
            ref={inputRef}
            value={question}
            rows={1}
            maxLength={1200}
            placeholder="Votre question…"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(question);
              }
            }}
          />
          {busy ? (
            <button type="button" className="btn btn--line" onClick={() => abortRef.current?.abort()}>Arrêter</button>
          ) : (
            <button type="submit" className="btn btn--solid" disabled={question.trim().length < 3}>Envoyer</button>
          )}
        </div>
      </form>
    </div>
  );
}

function EngineBadge({ engine, context }: { engine: EngineState | null; context: "textes" | "predications" }) {
  if (!engine) return <span className="badge">État du moteur…</span>;
  const count = context === "textes" ? engine.corpus.textes : engine.corpus.predications;
  if (count === 0) return <span className="badge badge--warn">Corpus vide</span>;
  return (
    <span className="badge" title={`${count} passages consultables`}>
      {engine.synthese ? "Recherche et synthèse sourcée" : "Recherche documentaire (synthèse non activée)"}
    </span>
  );
}

function Exchange({ x, onFollowUp, busy }: { x: LiveExchange; onFollowUp: (q: string) => void; busy: boolean }) {
  const prefix = `ex-${x.id}`;
  const a = x.answer;
  const byRef = new Map(x.sources.map((s) => [s.ref, s]));
  return (
    <article aria-label={`Question : ${x.question}`}>
      <p className="exchange__question">{x.question}</p>
      {x.pending ? <p className="exchange__pending" role="status"><span className="dot" aria-hidden="true" />{x.pending}</p> : null}
      {x.error ? <p className="notice notice--error">{x.error}</p> : null}

      {a ? (
        <div className="answer">
          {a.notice ? <p className="answer__notice">{a.notice}</p> : null}
          {a.kind === "reponse" && a.suffisance === "partielle" ? (
            <p className="answer__notice">Les sources ne couvrent qu&apos;une partie de la question.</p>
          ) : null}
          {a.sections
            ? SECTION_TITLES.filter(([k]) => a.sections![k]).map(([k, label]) => (
                <section key={k} className="answer__section">
                  <h2 className="answer__heading">{label}</h2>
                  <AnswerText text={a.sections![k]} anchorPrefix={prefix} />
                </section>
              ))
            : null}
          {a.citations?.length ? (
            <section className="answer__section">
              <h2 className="answer__heading">Extraits cités</h2>
              {a.citations.map((c, i) => {
                const s = byRef.get(c.source);
                return (
                  <figure key={i} className="citation">
                    <blockquote><p>« {c.extrait} »</p></blockquote>
                    {s ? <figcaption><a href={s.href}>{s.title} — {s.location}</a></figcaption> : null}
                  </figure>
                );
              })}
            </section>
          ) : null}
          {a.limites ? <p className="answer__limits"><strong>Limites :</strong> {a.limites}</p> : null}
          {a.kind === "insuffisant" || a.kind === "indisponible" ? <Orientation /> : null}
          {a.relances?.length ? (
            <div className="answer__followups">
              <p className="subtle">Pour approfondir :</p>
              <ul>
                {a.relances.map((r) => (
                  <li key={r.question}>
                    <button type="button" className="followup" disabled={busy} onClick={() => onFollowUp(r.question)}>
                      {r.question} <ArrowIcon size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {x.sources.length ? (
        <details className="sources" open={!a || a.kind !== "reponse"}>
          <summary>Sources consultées ({x.sources.length})</summary>
          <ol>
            {x.sources.map((s) => (
              <SourceItem key={s.ref} s={s} id={`${prefix}-${s.ref}`} />
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}

function SourceItem({ s, id }: { s: StudySource; id: string }) {
  const excerpt = s.text.length > 420 ? `${s.text.slice(0, 420).replace(/\s+\S*$/, "")} …` : s.text;
  return (
    <li id={id} className="source">
      <span className="source__ref">{s.ref}</span>
      <div>
        <a className="source__title" href={s.href}>{s.title}</a>
        <p className="subtle">{s.location}</p>
        <p className="source__text">{excerpt}</p>
      </div>
    </li>
  );
}

function Orientation() {
  return (
    <div className="orientation">
      <p>Pour une question qui dépasse les sources disponibles, vous pouvez, si vous le souhaitez :</p>
      <ul>
        <li><Link href="/discussion">écrire au ministère en consultation privée</Link></li>
        <li><a href={CONTACTS.whatsapp} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={16} /> WhatsApp</a></li>
        <li><a href={CONTACTS.email}><MailIcon size={16} /> {CONTACTS.emailDisplay}</a></li>
      </ul>
    </div>
  );
}
