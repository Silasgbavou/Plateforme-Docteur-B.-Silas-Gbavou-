import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/publier', label: 'Publier' },
  { href: '/admin/contenus', label: 'Contenus' },
  { href: '/admin/quotidien', label: 'Verset & citation' },
  { href: '/admin/messages', label: 'Consultations' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/consultation');

  return (
    <div className="container-page py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="eyebrow mb-1">Administration du ministère</p>
          <h1 className="font-display text-2xl text-ivory-50">{user.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="btn-ghost !px-4 !py-2 !text-[13px]">
            Voir le site
          </Link>
          <LogoutButton />
        </div>
      </header>

      <nav className="mb-9 flex flex-wrap gap-1.5" aria-label="Navigation administration">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[13px] font-medium text-ivory-100/80 transition hover:border-gold-300/40 hover:text-gold-200"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
