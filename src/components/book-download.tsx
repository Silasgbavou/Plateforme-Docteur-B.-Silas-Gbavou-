'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * Téléchargement sous licence personnelle.
 *
 * L'internaute doit accepter explicitement les conditions ; le serveur émet
 * alors un exemplaire nominatif filigrané, enregistré au registre des licences.
 */
export function BookDownload({
  contentId,
  title,
  isAuthenticated,
  allowDownload,
}: {
  contentId: string;
  title: string;
  isAuthenticated: boolean;
  allowDownload: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [license, setLicense] = useState<string | null>(null);

  if (!allowDownload) {
    return (
      <div className="surface p-5 text-[13.5px] leading-relaxed text-ivory-100/60">
        Cet ouvrage est disponible en lecture en ligne uniquement. Le téléchargement n’a pas été
        autorisé par l’auteur pour ce titre.
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="surface space-y-4 p-5">
        <p className="text-[13.5px] leading-relaxed text-ivory-100/65">
          Le téléchargement nécessite un compte : chaque exemplaire est nominatif et enregistré au
          registre des licences du ministère.
        </p>
        <div className="flex gap-2">
          <Link href="/inscription" className="btn-primary !text-[13px]">
            Créer mon compte
          </Link>
          <Link href="/connexion" className="btn-ghost !text-[13px]">
            Me connecter
          </Link>
        </div>
      </div>
    );
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/livres/${contentId}/telechargement`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acceptLicense: true }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Téléchargement impossible.');
      }

      const code = response.headers.get('x-license-code');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug(title)}-${code ?? 'licence'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setLicense(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface space-y-4 p-5">
      <p className="eyebrow">Exemplaire personnel</p>

      <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ivory-100/70">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-gold-400"
        />
        <span>
          Je m’engage à un usage strictement personnel. Je m’interdis toute revente, location,
          monétisation ou rediffusion de cet ouvrage, en tout ou partie.{' '}
          <Link href="/droits-d-auteur" className="text-gold-300/80 hover:text-gold-200">
            Lire les conditions
          </Link>
        </span>
      </label>

      <button
        type="button"
        onClick={() => void download()}
        disabled={!accepted || busy}
        className="btn-primary w-full"
      >
        {busy ? 'Préparation de votre exemplaire…' : 'Télécharger mon exemplaire'}
      </button>

      {license && (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-[12.5px] text-emerald-200">
          Exemplaire délivré. Votre licence : <strong>{license}</strong>. Elle est inscrite dans le
          document et au registre du ministère.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[12.5px] text-red-200">
          {error}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-ivory-100/40">
        Le fichier délivré porte votre nom, votre adresse e-mail et un code de licence unique, sur la
        page de garde et en filigrane de chaque page.
      </p>
    </div>
  );
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
