'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Filtres de bibliothèque : recherche plein texte + filtre par pilier. */
export function LibraryFilters({
  pillars,
}: {
  pillars: { slug: string; title: string; count: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const activePillar = searchParams.get('pilier') ?? '';

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  function apply(next: { q?: string; pilier?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-9 space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: query.trim() });
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un enseignement, un thème, un mot-clé…"
          className="field flex-1"
          aria-label="Rechercher"
        />
        <button type="submit" className="btn-ghost">
          Rechercher
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={!activePillar} onClick={() => apply({ pilier: '' })}>
          Tous les piliers
        </FilterChip>
        {pillars.map((pillar) => (
          <FilterChip
            key={pillar.slug}
            active={activePillar === pillar.slug}
            onClick={() => apply({ pilier: pillar.slug })}
          >
            {pillar.title.replace("L'Enseignement ", '')}
            <span className="ml-1.5 text-[11px] opacity-60">{pillar.count}</span>
          </FilterChip>
        ))}
        {(activePillar || searchParams.get('q')) && (
          <Link href={pathname} className="btn-quiet !px-3 !py-1.5 !text-[12.5px]">
            Réinitialiser
          </Link>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
        active
          ? 'border-gold-300/60 bg-gold-300/15 text-gold-100'
          : 'border-white/12 bg-white/5 text-ivory-100/70 hover:border-white/25 hover:text-ivory-50'
      }`}
    >
      {children}
    </button>
  );
}
