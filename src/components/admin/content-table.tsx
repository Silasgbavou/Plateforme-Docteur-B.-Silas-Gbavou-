'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PILLARS } from '@/lib/taxonomy';

interface Row {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  indexedAt: string | null;
  autoClassified: boolean;
  classificationNote: string | null;
  hasTranscript: boolean;
  pillar: { key: string; title: string };
  subRubric: { slug: string; title: string } | null;
  _count: { chunks: number };
}

export function ContentTable({ contents }: { contents: Row[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');

  const rows = contents.filter((row) => filter === 'ALL' || row.status === filter);

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/contenus/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Action impossible.');
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: Row) {
    if (!window.confirm(`Supprimer définitivement « ${row.title} » ? Cette action est irréversible.`)) {
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/contenus/${row.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Suppression impossible.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'DRAFT', 'PUBLISHED'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${
              filter === value
                ? 'border-gold-300/50 bg-gold-300/10 text-gold-100'
                : 'border-white/12 text-ivory-100/70 hover:border-white/25'
            }`}
          >
            {value === 'ALL' ? 'Tous' : value === 'DRAFT' ? 'Brouillons' : 'Publiés'}
            <span className="ml-1.5 opacity-60">
              {value === 'ALL'
                ? contents.length
                : contents.filter((c) => c.status === value).length}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {error}
        </p>
      )}

      <div className="surface-strong overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ivory-100/45">Aucun contenu.</p>
        ) : (
          <ul className="divide-y divide-white/6">
            {rows.map((row) => (
              <li key={row.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-white/12 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ivory-100/55">
                        {row.type}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          row.status === 'PUBLISHED'
                            ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200'
                            : row.status === 'ARCHIVED'
                              ? 'border-white/12 bg-white/5 text-ivory-100/50'
                              : 'border-amber-300/25 bg-amber-300/10 text-amber-200'
                        }`}
                      >
                        {row.status === 'PUBLISHED'
                          ? 'Publié'
                          : row.status === 'ARCHIVED'
                            ? 'Archivé'
                            : 'Brouillon'}
                      </span>
                      {!row.hasTranscript && ['VIDEO', 'AUDIO'].includes(row.type) && (
                        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                          Sans transcription
                        </span>
                      )}
                      {row.autoClassified && (
                        <span
                          className="rounded-full border border-white/12 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ivory-100/50"
                          title={row.classificationNote ?? undefined}
                        >
                          Classé IA
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-[15px] font-medium text-ivory-50">{row.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-ivory-100/45">
                      {row.pillar.title}
                      {row.subRubric ? ` › ${row.subRubric.title}` : ' › (aucune sous-rubrique)'} ·{' '}
                      {row._count.chunks} fragment{row._count.chunks > 1 ? 's' : ''} indexé
                      {row._count.chunks > 1 ? 's' : ''}
                    </p>
                    {row.classificationNote && (
                      <p className="mt-1 text-[11px] italic text-ivory-100/35">
                        {row.classificationNote}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={row.type === 'BOOK' ? `/livres/${row.slug}` : `/contenus/${row.slug}`}
                      target="_blank"
                      className="btn-quiet !px-2.5 !py-1.5 !text-[12px]"
                    >
                      Voir
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditing(editing?.id === row.id ? null : row)}
                      className="btn-quiet !px-2.5 !py-1.5 !text-[12px]"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() =>
                        void patch(row.id, {
                          status: row.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                        })
                      }
                      className="btn-ghost !px-2.5 !py-1.5 !text-[12px]"
                    >
                      {row.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void patch(row.id, { reindex: true })}
                      className="btn-quiet !px-2.5 !py-1.5 !text-[12px]"
                      title="Recalculer les fragments et vecteurs pour l’assistant IA"
                    >
                      Réindexer
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void remove(row)}
                      className="btn-quiet !px-2.5 !py-1.5 !text-[12px] text-red-300/80 hover:text-red-200"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {editing?.id === row.id && (
                  <EditPanel row={row} busy={busyId === row.id} onSave={(payload) => patch(row.id, payload)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditPanel({
  row,
  busy,
  onSave,
}: {
  row: Row;
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [pillarKey, setPillarKey] = useState(row.pillar.key);
  const [subRubricSlug, setSubRubricSlug] = useState(row.subRubric?.slug ?? '');
  const [title, setTitle] = useState(row.title);
  const [transcript, setTranscript] = useState('');
  const pillar = PILLARS.find((p) => p.key === pillarKey);

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`title-${row.id}`}>
            Titre
          </label>
          <input
            id={`title-${row.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="field"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor={`pillar-${row.id}`}>
              Pilier
            </label>
            <select
              id={`pillar-${row.id}`}
              value={pillarKey}
              onChange={(event) => {
                setPillarKey(event.target.value);
                setSubRubricSlug('');
              }}
              className="field"
            >
              {PILLARS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.title.replace("L'Enseignement ", '')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`sub-${row.id}`}>
              Sous-rubrique
            </label>
            <select
              id={`sub-${row.id}`}
              value={subRubricSlug}
              onChange={(event) => setSubRubricSlug(event.target.value)}
              className="field"
            >
              <option value="">Aucune</option>
              {pillar?.subRubrics.map((sub) => (
                <option key={sub.slug} value={sub.slug}>
                  {sub.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {['VIDEO', 'AUDIO', 'BOOK'].includes(row.type) && (
        <div>
          <label className="label" htmlFor={`transcript-${row.id}`}>
            {row.type === 'BOOK' ? 'Texte intégral' : 'Transcription'}{' '}
            <span className="normal-case opacity-60">
              — remplace le texte existant, laisser vide pour ne pas modifier
            </span>
          </label>
          <textarea
            id={`transcript-${row.id}`}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={6}
            className="field resize-y font-mono text-[12.5px]"
            placeholder={
              row.hasTranscript
                ? 'Une transcription est déjà enregistrée.'
                : 'Aucune transcription : l’assistant ne peut pas exploiter ce contenu.'
            }
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              title,
              pillarKey,
              subRubricSlug: subRubricSlug || null,
              ...(transcript.trim() ? { transcript: transcript.trim() } : {}),
            })
          }
          className="btn-primary !px-4 !py-2 !text-[13px]"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave({ reclassify: true, reindex: true })}
          className="btn-ghost !px-4 !py-2 !text-[13px]"
          title="Demander à l’IA de reclasser ce contenu dans l’arborescence"
        >
          Reclasser par l’IA
        </button>
      </div>
    </div>
  );
}
