import { prisma } from '@/lib/prisma';

/**
 * Contenus du jour : verset et citation.
 *
 * Deux modes cohabitent :
 *   - programmation à date fixe (champ `date` = AAAA-MM-JJ) ;
 *   - pool de rotation (champ `date` vide) : un élément est choisi de façon
 *     déterministe à partir du jour, afin que tous les visiteurs voient le même
 *     contenu et que la rotation soit stable au fil de la journée.
 */

export interface DailyContent {
  id: string;
  text: string;
  reference: string | null;
  author: string | null;
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function dayIndex(key: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

async function pick(kind: 'VERSE' | 'QUOTE', key: string): Promise<DailyContent | null> {
  const scheduled = await prisma.dailyItem.findFirst({
    where: { kind, date: key, active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (scheduled) {
    return {
      id: scheduled.id,
      text: scheduled.text,
      reference: scheduled.reference,
      author: scheduled.author,
    };
  }

  const pool = await prisma.dailyItem.findMany({
    where: { kind, date: '', active: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, text: true, reference: true, author: true },
  });
  if (pool.length === 0) return null;
  return pool[dayIndex(`${kind}:${key}`, pool.length)];
}

export async function getDaily(date = new Date()): Promise<{
  date: string;
  verse: DailyContent | null;
  quote: DailyContent | null;
}> {
  const key = todayKey(date);
  const [verse, quote] = await Promise.all([pick('VERSE', key), pick('QUOTE', key)]);
  return { date: key, verse, quote };
}
