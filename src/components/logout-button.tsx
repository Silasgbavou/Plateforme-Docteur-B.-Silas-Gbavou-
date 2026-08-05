'use client';

import { useState } from 'react';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/auth/deconnexion', { method: 'POST' });
        // Rechargement complet : le layout racine doit être re-rendu côté
        // serveur pour que l'en-tête repasse en état « déconnecté ».
        window.location.assign('/');
      }}
      className="btn-quiet !px-4 !py-2 !text-[13px]"
    >
      {busy ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  );
}
