'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Assistant IA pédagogique — présent dans chaque rubrique du site.
 *
 * Le composant est volontairement autonome (scope + suggestions injectés en
 * props) afin d'être posé tel quel sur une page pilier, une sous-rubrique,
 * une vidéo, un audio, un livre ou un article.
 */

export type AssistantScope = 'GLOBAL' | 'PILLAR' | 'SUBRUBRIC' | 'CONTENT';

export interface AssistantSource {
  id: string;
  title: string;
  slug: string;
  type: string;
  pillarSlug: string;
  score: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: AssistantSource[];
  pending?: boolean;
}

interface Props {
  scope?: AssistantScope;
  scopeId?: string;
  /** Titre affiché dans l'en-tête du panneau. */
  title?: string;
  /** Phrase qui précise le périmètre interrogé. */
  contextLabel?: string;
  suggestions?: string[];
  /** Variante compacte pour les colonnes latérales. */
  compact?: boolean;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Fais-moi une synthèse de cet enseignement.",
  "Quels sont les points essentiels à retenir ?",
  "Propose-moi un parcours d’étude sur ce thème.",
];

export function AiAssistant({
  scope = 'GLOBAL',
  scopeId,
  title = 'Assistant pédagogique',
  contextLabel,
  suggestions = DEFAULT_SUGGESTIONS,
  compact = false,
  className = '',
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setError(null);
    setInput('');
    const history = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages([...history, { role: 'assistant', content: '', pending: true }]);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: trimmed,
          scope,
          scopeId,
          history: history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "L'assistant est momentanément indisponible.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      let sources: AssistantSource[] = [];

      // Flux ligne à ligne au format JSON Lines.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: { type: string; text?: string; sources?: AssistantSource[]; message?: string };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === 'sources' && event.sources) {
            sources = event.sources;
          } else if (event.type === 'delta' && event.text) {
            answer += event.text;
          } else if (event.type === 'error') {
            throw new Error(event.message ?? 'Erreur du service IA.');
          }
          setMessages([...history, { role: 'assistant', content: answer, sources }]);
        }
      }

      setMessages([...history, { role: 'assistant', content: answer, sources }]);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Erreur inattendue.';
      setError(message);
      setMessages(history);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const empty = messages.length === 0;

  return (
    <section
      className={`surface-strong flex flex-col overflow-hidden shadow-elevated ${className}`}
      aria-label="Assistant pédagogique"
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-gold-300 to-gold-600 text-night-950">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
              </svg>
            </span>
            <h2 className="truncate font-display text-lg text-ivory-50">{title}</h2>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ivory-100/50">
            {contextLabel ??
              "Répond uniquement à partir des enseignements du Docteur B. Silas Gbavou."}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            className="shrink-0 text-[11px] uppercase tracking-wider text-ivory-100/45 transition hover:text-gold-200"
          >
            Effacer
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className={`scrollbar-slim flex-1 space-y-4 overflow-y-auto px-5 py-5 ${
          compact ? 'max-h-[380px] min-h-[220px]' : 'max-h-[560px] min-h-[300px]'
        }`}
      >
        {empty ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ivory-100/65">
              Posez votre question sur les enseignements. L’assistant s’appuie exclusivement sur le
              corpus du Docteur (écrits, transcriptions vidéo, audios et livres) et cite ses sources.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[12.5px] text-ivory-100/80 transition hover:border-gold-300/50 hover:text-gold-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, i) => (
            <MessageBubble key={i} message={message} />
          ))
        )}

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="border-t border-white/10 p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Votre question sur les enseignements…"
            className="field max-h-32 min-h-[46px] flex-1 resize-y"
            disabled={busy}
            aria-label="Votre question"
          />
          <button
            type="submit"
            className="btn-primary h-[46px] !px-5"
            disabled={busy || input.trim().length === 0}
          >
            {busy ? <Spinner /> : 'Envoyer'}
          </button>
        </div>
        <p className="px-1 pt-2 text-[10.5px] leading-relaxed text-ivory-100/35">
          Outil d’étude fondé sur le corpus du ministère. Pour une question personnelle, écrivez au{' '}
          <Link href="/consultation" className="text-gold-300/80 hover:text-gold-200">
            Bureau de consultation
          </Link>
          .
        </p>
      </form>
    </section>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gold-300/15 px-4 py-2.5 text-[14px] leading-relaxed text-ivory-50">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="max-w-full rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.03] px-4 py-3">
        {message.content ? (
          <div className="space-y-2.5 text-[14px] leading-[1.75] text-ivory-100/88">
            {renderMarkdownLite(message.content)}
          </div>
        ) : (
          <TypingDots />
        )}
      </div>

      {message.sources && message.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pl-1">
          <span className="text-[10.5px] uppercase tracking-wider text-ivory-100/40">Sources</span>
          {message.sources.slice(0, 5).map((source) => (
            <Link
              key={source.id}
              href={`/contenus/${source.slug}`}
              className="rounded-full border border-gold-300/25 bg-gold-300/10 px-2.5 py-1 text-[11.5px] text-gold-100/90 transition hover:border-gold-300/60"
            >
              {source.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Rendu léger : titres, listes, gras. Suffisant pour les réponses de l'IA. */
function renderMarkdownLite(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split('\n');

    if (/^#{1,4}\s/.test(block)) {
      return (
        <p key={i} className="pt-1 font-display text-[16px] font-semibold text-gold-100">
          {inline(block.replace(/^#{1,4}\s*/, ''))}
        </p>
      );
    }

    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      return (
        <ul key={i} className="ml-4 list-disc space-y-1 marker:text-gold-400/70">
          {lines.map((line, j) => (
            <li key={j}>{inline(line.replace(/^\s*[-*•]\s+/, ''))}</li>
          ))}
        </ul>
      );
    }

    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      return (
        <ol key={i} className="ml-4 list-decimal space-y-1 marker:text-gold-400/70">
          {lines.map((line, j) => (
            <li key={j}>{inline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>
          ))}
        </ol>
      );
    }

    return <p key={i}>{inline(block)}</p>;
  });
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ivory-50">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1.5 py-1" aria-label="L’assistant rédige">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-300/70"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
