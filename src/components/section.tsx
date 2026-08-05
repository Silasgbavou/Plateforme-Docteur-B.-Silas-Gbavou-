import Link from 'next/link';

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  align?: 'left' | 'center';
}) {
  return (
    <div
      className={`mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
        align === 'center' ? 'text-center sm:flex-col sm:items-center sm:text-center' : ''
      }`}
    >
      <div className={align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-balance font-display text-3xl leading-tight text-ivory-50 sm:text-[34px]">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-[15px] leading-relaxed text-ivory-100/60">{description}</p>
        )}
      </div>
      {action && (
        <Link href={action.href} className="btn-ghost shrink-0 !px-4 !py-2 !text-[13px]">
          {action.label}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-white/8 bg-gradient-to-b from-white/[0.03] to-transparent">
      <div className="container-page py-14 sm:py-20">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="max-w-4xl text-balance font-display text-4xl leading-[1.1] text-ivory-50 sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-ivory-100/65">
            {description}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="mb-6 flex flex-wrap items-center gap-1.5 text-[12.5px]">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-ivory-100/25">›</span>}
          {item.href ? (
            <Link href={item.href} className="text-ivory-100/55 transition hover:text-gold-200">
              {item.label}
            </Link>
          ) : (
            <span className="text-gold-200/90">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
