'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Item {
  id: string;
  kind: string;
  text: string;
  reference: string | null;
  author: string | null;
  date: string;
  active: boolean;
  createdAt: string;
}

export function DailyManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<'VERSE' | 'QUOTE'>('VERSE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/quotidien', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          text: form.get('text'),
          reference: form.get('reference'),
          author: form.get('author'),
          date: form.get('date') ?? '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Ajout impossible.');
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Supprimer cet élément ?')) return;
    await fetch(`/api/admin/quotidien?id=${id}`, { method: 'DELETE' });
    router.refresh();
  }

  const verses = items.filter((i) => i.kind === 'VERSE');
  const quotes = items.filter((i) => i.kind === 'QUOTE');

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
      <form onSubmit={add} className="surface-strong space-y-4 p-5">
        <div className="flex gap-2">
          {(['VERSE', 'QUOTE'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-[13px] transition ${
                kind === value
                  ? 'border-gold-300/50 bg-gold-300/10 text-gold-100'
                  : 'border-white/12 text-ivory-100/70'
              }`}
            >
              {value === 'VERSE' ? 'Verset' : 'Citation'}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="daily-text">
            Texte
          </label>
          <textarea id="daily-text" name="text" required rows={4} className="field resize-y" />
        </div>

        {kind === 'VERSE' ? (
          <div>
            <label className="label" htmlFor="daily-reference">
              Référence biblique
            </label>
            <input
              id="daily-reference"
              name="reference"
              placeholder="Ésaïe 55.11"
              className="field"
            />
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="daily-author">
              Auteur
            </label>
            <input
              id="daily-author"
              name="author"
              placeholder="Dr B. Silas Gbavou"
              className="field"
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="daily-date">
            Date de diffusion <span className="normal-case opacity-60">(vide = rotation)</span>
          </label>
          <input id="daily-date" name="date" type="date" className="field" />
        </div>

        {error && (
          <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-[12.5px] text-red-200">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Ajout…' : 'Ajouter'}
        </button>
      </form>

      <div className="space-y-6">
        <ItemList title="Versets" items={verses} onRemove={remove} />
        <ItemList title="Citations" items={quotes} onRemove={remove} />
      </div>
    </div>
  );
}

function ItemList({
  title,
  items,
  onRemove,
}: {
  title: string;
  items: Item[];
  onRemove: (id: string) => void;
}) {
  return (
    <section className="surface-strong overflow-hidden">
      <div className="border-b border-white/10 px-5 py-3.5">
        <h3 className="font-display text-lg text-ivory-50">
          {title} <span className="text-[13px] text-ivory-100/40">({items.length})</span>
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ivory-100/45">Aucun élément.</p>
      ) : (
        <ul className="scrollbar-slim max-h-[420px] divide-y divide-white/6 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-[14px] leading-relaxed text-ivory-100/85">« {item.text} »</p>
                <p className="mt-1 text-[11.5px] text-gold-300/70">
                  {item.reference || item.author || '—'}
                  {item.date ? ` · programmé le ${item.date}` : ' · rotation'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="shrink-0 text-[11.5px] text-red-300/70 transition hover:text-red-200"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
