import { DailyManager } from '@/components/admin/daily-manager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDailyPage() {
  const items = await prisma.dailyItem.findMany({
    orderBy: [{ kind: 'asc' }, { date: 'desc' }, { createdAt: 'desc' }],
    take: 300,
  });

  return (
    <div>
      <div className="mb-7 max-w-3xl">
        <h2 className="font-display text-2xl text-ivory-50">Verset et citation du jour</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ivory-100/55">
          Deux modes possibles : une date précise pour programmer un contenu, ou aucune date pour
          l’ajouter au pool de rotation — un élément différent est alors mis en avant chaque jour, de
          façon identique pour tous les visiteurs.
        </p>
      </div>

      <DailyManager
        items={items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
      />
    </div>
  );
}
