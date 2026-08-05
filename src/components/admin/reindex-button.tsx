'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Relance l'indexation complète du corpus publié (embeddings + chunks). */
export function ReindexButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/index', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Échec de l’indexation.');
      setResult(
        `${data.chunks} fragments produits à partir de ${data.contents} contenus (moteur : ${data.model}).`,
      );
      router.refresh();
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Erreur inattendue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => void run()} disabled={busy} className="btn-ghost w-full">
        {busy ? 'Indexation en cours…' : 'Réindexer tout le corpus'}
      </button>
      {result && <p className="text-[12px] leading-relaxed text-ivory-100/60">{result}</p>}
    </div>
  );
}
