'use client';

import { useState } from 'react';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = mode === 'login' ? '/api/auth/connexion' : '/api/auth/inscription';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const details = data.details as Record<string, string[]> | undefined;
        const first = details ? Object.values(details).flat()[0] : undefined;
        throw new Error(first ?? data.error ?? 'Une erreur est survenue.');
      }

      // Navigation complète plutôt que router.push : la session vient de
      // changer, et le cache client du layout racine conserverait sinon
      // l'en-tête « déconnecté » jusqu'au prochain rechargement.
      window.location.assign(data.role === 'ADMIN' ? '/admin' : '/consultation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface-strong space-y-4 p-6">
      {mode === 'signup' && (
        <div>
          <label className="label" htmlFor="name">
            Nom complet
          </label>
          <input id="name" name="name" required minLength={2} className="field" autoComplete="name" />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          Adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="field"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === 'signup' ? 8 : 1}
          className="field"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
        {mode === 'signup' && (
          <p className="mt-1.5 text-[11.5px] text-ivory-100/40">8 caractères minimum.</p>
        )}
      </div>

      {mode === 'signup' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="city">
              Ville <span className="normal-case opacity-60">(facultatif)</span>
            </label>
            <input id="city" name="city" className="field" autoComplete="address-level2" />
          </div>
          <div>
            <label className="label" htmlFor="country">
              Pays <span className="normal-case opacity-60">(facultatif)</span>
            </label>
            <input id="country" name="country" className="field" autoComplete="country-name" />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Un instant…' : mode === 'login' ? 'Me connecter' : 'Créer mon compte'}
      </button>
    </form>
  );
}
