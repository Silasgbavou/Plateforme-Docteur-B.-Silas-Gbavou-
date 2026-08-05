'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Bureau de consultation — messagerie privée interne au site.
 * Le même composant sert le membre et l'administrateur (mode `admin`).
 */

interface ThreadSummary {
  id: string;
  subject: string;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  updatedAt: string;
  user?: { name: string; email: string };
  messages: { body: string; createdAt: string; authorRole: string }[];
  _count: { messages: number };
}

interface ThreadMessage {
  id: string;
  body: string;
  authorRole: 'MEMBER' | 'ADMIN';
  createdAt: string;
}

interface ThreadDetail extends Omit<ThreadSummary, 'messages'> {
  messages: ThreadMessage[];
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'En attente', className: 'text-amber-200 border-amber-300/25 bg-amber-300/10' },
  ANSWERED: { label: 'Répondu', className: 'text-emerald-200 border-emerald-300/25 bg-emerald-300/10' },
  CLOSED: { label: 'Clôturé', className: 'text-ivory-100/60 border-white/12 bg-white/5' },
};

export function ConsultationDesk({ admin = false }: { admin?: boolean }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [active, setActive] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const response = await fetch('/api/consultation');
      if (!response.ok) throw new Error('Chargement impossible.');
      const data = await response.json();
      setThreads(data.threads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  async function openThread(id: string) {
    setError(null);
    setComposing(false);
    try {
      const response = await fetch(`/api/consultation/${id}`);
      if (!response.ok) throw new Error('Consultation introuvable.');
      const data = await response.json();
      setActive(data.thread);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  async function createThread(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subject: form.get('subject'),
          message: form.get('message'),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Envoi impossible.');
      setComposing(false);
      await loadThreads();
      await openThread(data.thread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(status?: 'CLOSED') {
    if (!active || (!reply.trim() && !status)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/consultation/${active.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: reply.trim() || 'Consultation clôturée.',
          status,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Envoi impossible.');
      setReply('');
      await openThread(active.id);
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
      {/* Liste des consultations */}
      <aside className="surface-strong overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
          <h2 className="font-display text-lg text-ivory-50">
            {admin ? 'Consultations reçues' : 'Mes consultations'}
          </h2>
          {!admin && (
            <button
              type="button"
              onClick={() => {
                setComposing(true);
                setActive(null);
              }}
              className="btn-primary !px-3 !py-1.5 !text-[12px]"
            >
              Nouvelle
            </button>
          )}
        </div>

        <div className="scrollbar-slim max-h-[520px] overflow-y-auto">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-ivory-100/45">Chargement…</p>
          ) : threads.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ivory-100/45">
              {admin ? 'Aucune consultation pour l’instant.' : 'Ouvrez votre première consultation.'}
            </p>
          ) : (
            <ul className="divide-y divide-white/6">
              {threads.map((thread) => {
                const status = STATUS_LABEL[thread.status] ?? STATUS_LABEL.OPEN;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => void openThread(thread.id)}
                      className={`w-full px-4 py-3.5 text-left transition hover:bg-white/[0.04] ${
                        active?.id === thread.id ? 'bg-white/[0.06]' : ''
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-[14px] font-medium text-ivory-50">
                          {thread.subject}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </span>
                      {admin && thread.user && (
                        <span className="mt-1 block truncate text-[11.5px] text-gold-300/70">
                          {thread.user.name} · {thread.user.email}
                        </span>
                      )}
                      <span className="mt-1 block truncate text-[12px] text-ivory-100/45">
                        {thread.messages[0]?.body ?? ''}
                      </span>
                      <span className="mt-1 block text-[10.5px] text-ivory-100/30">
                        {formatDate(thread.updatedAt)} · {thread._count.messages} message
                        {thread._count.messages > 1 ? 's' : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Panneau de conversation */}
      <section className="surface-strong flex min-h-[520px] flex-col overflow-hidden">
        {composing ? (
          <form onSubmit={createThread} className="space-y-4 p-6">
            <h2 className="font-display text-xl text-ivory-50">Nouvelle consultation</h2>
            <p className="text-[13px] leading-relaxed text-ivory-100/55">
              Votre message est privé : il n’est lisible que par vous et par le ministère.
            </p>
            <div>
              <label className="label" htmlFor="subject">
                Objet
              </label>
              <input id="subject" name="subject" required maxLength={160} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="message">
                Votre message
              </label>
              <textarea id="message" name="message" required rows={8} className="field resize-y" />
            </div>
            {error && (
              <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? 'Envoi…' : 'Envoyer au Docteur'}
              </button>
              <button type="button" onClick={() => setComposing(false)} className="btn-ghost">
                Annuler
              </button>
            </div>
          </form>
        ) : active ? (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-4">
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl text-ivory-50">{active.subject}</h2>
                {admin && active.user && (
                  <p className="mt-0.5 text-[12.5px] text-gold-300/75">
                    {active.user.name} · {active.user.email}
                  </p>
                )}
              </div>
              {admin && active.status !== 'CLOSED' && (
                <button
                  type="button"
                  onClick={() => void sendReply('CLOSED')}
                  className="btn-quiet shrink-0 !px-3 !py-1.5 !text-[12px]"
                >
                  Clôturer
                </button>
              )}
            </header>

            <div className="scrollbar-slim flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {active.messages.map((message) => {
                const fromMinistry = message.authorRole === 'ADMIN';
                const mine = admin ? fromMinistry : !fromMinistry;
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                      <p
                        className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                          fromMinistry
                            ? 'rounded-bl-md border border-gold-300/20 bg-gold-300/10 text-ivory-50'
                            : 'rounded-br-md border border-white/8 bg-white/[0.04] text-ivory-100/90'
                        }`}
                      >
                        {message.body}
                      </p>
                      <p
                        className={`mt-1 text-[10.5px] text-ivory-100/35 ${mine ? 'text-right' : ''}`}
                      >
                        {fromMinistry ? 'Ministère' : 'Vous'} · {formatDate(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-4">
              {error && (
                <p className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-[12.5px] text-red-200">
                  {error}
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={2}
                  placeholder="Votre réponse…"
                  className="field max-h-40 flex-1 resize-y"
                  disabled={active.status === 'CLOSED' && !admin}
                />
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={busy || !reply.trim()}
                  className="btn-primary h-[46px]"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center px-6 py-16 text-center">
            <div className="max-w-sm">
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-gold-300/15 text-gold-200">
                ✉
              </span>
              <p className="text-[15px] text-ivory-100/70">
                {admin
                  ? 'Sélectionnez une consultation pour y répondre.'
                  : 'Sélectionnez une consultation ou ouvrez-en une nouvelle.'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
