'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/auth/deconnexion', { method: 'POST' });
        router.refresh();
        router.push('/');
      }}
      className="btn-quiet !px-4 !py-2 !text-[13px]"
    >
      {busy ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  );
}
