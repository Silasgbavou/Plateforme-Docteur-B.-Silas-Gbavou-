/**
 * Amorçage de la base :
 *   1. les 3 piliers et leurs sous-rubriques (arborescence fondamentale) ;
 *   2. le compte administrateur ;
 *   3. un fonds initial de versets et de citations ;
 *   4. deux enseignements écrits de démonstration, indexés pour l'IA.
 *
 * Le script est idempotent : il peut être relancé sans créer de doublons.
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

import { PILLARS } from '../src/lib/taxonomy';

const prisma = new PrismaClient();

async function main() {
  console.log('→ Arborescence des 3 piliers…');
  for (const [pillarIndex, pillar] of PILLARS.entries()) {
    const record = await prisma.pillar.upsert({
      where: { key: pillar.key },
      update: {
        slug: pillar.slug,
        title: pillar.title,
        tagline: pillar.tagline,
        description: pillar.description,
        accent: pillar.accent,
        order: pillarIndex,
      },
      create: {
        key: pillar.key,
        slug: pillar.slug,
        title: pillar.title,
        tagline: pillar.tagline,
        description: pillar.description,
        accent: pillar.accent,
        order: pillarIndex,
      },
    });

    for (const [subIndex, sub] of pillar.subRubrics.entries()) {
      await prisma.subRubric.upsert({
        where: { pillarId_slug: { pillarId: record.id, slug: sub.slug } },
        update: {
          title: sub.title,
          description: sub.description,
          keywords: sub.keywords.join(', '),
          order: subIndex,
        },
        create: {
          pillarId: record.id,
          slug: sub.slug,
          title: sub.title,
          description: sub.description,
          keywords: sub.keywords.join(', '),
          order: subIndex,
        },
      });
    }
    console.log(`   ✓ ${pillar.title} — ${pillar.subRubrics.length} sous-rubriques`);
  }

  console.log('→ Compte administrateur…');
  const adminEmail = (process.env.ADMIN_EMAIL || 'Silasgbavou@gmail.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangezCeMotDePasse2024!';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      name: process.env.ADMIN_NAME || 'Docteur B. Silas Gbavou',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
    },
  });
  console.log(`   ✓ ${admin.email}`);
  if (adminPassword === 'ChangezCeMotDePasse2024!') {
    console.warn('   ⚠ Mot de passe administrateur par défaut — changez ADMIN_PASSWORD.');
  }

  console.log('→ Versets et citations…');
  const existingDaily = await prisma.dailyItem.count();
  if (existingDaily === 0) {
    await prisma.dailyItem.createMany({
      data: [
        ...VERSES.map((v) => ({ kind: 'VERSE', text: v.text, reference: v.reference, date: '' })),
        ...QUOTES.map((q) => ({
          kind: 'QUOTE',
          text: q,
          author: 'Dr B. Silas Gbavou',
          date: '',
        })),
      ],
    });
    console.log(`   ✓ ${VERSES.length} versets, ${QUOTES.length} citations`);
  } else {
    console.log(`   • ${existingDaily} éléments déjà présents, aucun ajout`);
  }

  console.log('→ Enseignements de démonstration…');
  for (const article of DEMO_ARTICLES) {
    const existing = await prisma.content.findUnique({ where: { slug: article.slug } });
    if (existing) {
      console.log(`   • ${article.slug} existe déjà`);
      continue;
    }
    const pillar = await prisma.pillar.findUnique({
      where: { key: article.pillarKey },
      include: { subRubrics: true },
    });
    if (!pillar) continue;

    await prisma.content.create({
      data: {
        type: 'ARTICLE',
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        body: article.body,
        pillarId: pillar.id,
        subRubricId: pillar.subRubrics.find((s) => s.slug === article.subRubricSlug)?.id ?? null,
        tags: article.tags,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    console.log(`   ✓ ${article.title}`);
  }

  console.log('\n✔ Amorçage terminé.');
  console.log('  Indexez le corpus pour l’assistant IA : npm run rag:reindex');
}

const VERSES = [
  {
    text: "Ainsi en est-il de ma parole, qui sort de ma bouche : elle ne retourne point à moi sans effet, sans avoir exécuté ma volonté et accompli mes desseins.",
    reference: 'Ésaïe 55.11',
  },
  {
    text: "Car le Seigneur, l’Éternel, ne fait rien sans avoir révélé son secret à ses serviteurs les prophètes.",
    reference: 'Amos 3.7',
  },
  {
    text: "Que ce livre de la loi ne s’éloigne point de ta bouche ; médite-le jour et nuit, pour agir fidèlement selon tout ce qui y est écrit.",
    reference: 'Josué 1.8',
  },
  {
    text: "Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.",
    reference: 'Psaumes 119.105',
  },
  {
    text: "Efforce-toi de te présenter devant Dieu comme un homme éprouvé, un ouvrier qui n’a point à rougir, qui dispense droitement la parole de la vérité.",
    reference: '2 Timothée 2.15',
  },
  {
    text: "Bien-aimés, n’ajoutez pas foi à tout esprit ; mais éprouvez les esprits, pour savoir s’ils sont de Dieu.",
    reference: '1 Jean 4.1',
  },
  {
    text: "Vous êtes une race élue, un sacerdoce royal, une nation sainte, un peuple acquis.",
    reference: '1 Pierre 2.9',
  },
];

const QUOTES = [
  "La révélation ne dispense jamais du caractère : DIEU forme l’homme avant de confier le message.",
  "Une doctrine saine n’est pas une doctrine froide ; c’est une doctrine qui tient debout quand l’épreuve vient.",
  "Le prophétique authentique conduit toujours à CHRIST, jamais au prophète.",
  "On ne dispense pas les mystères de DIEU par curiosité, mais par obéissance.",
  "L’autel précède l’onction : ce qui n’a pas été consacré ne peut pas être oint.",
  "Le jeûne ne change pas DIEU ; il change celui qui jeûne, afin qu’il puisse recevoir.",
];

const DEMO_ARTICLES = [
  {
    slug: 'reconnaitre-la-voix-de-dieu-fondements',
    title: 'Reconnaître la voix de DIEU : les fondements',
    summary:
      "Comment distinguer la voix de l'Esprit de celle de l'âme, et pourquoi l'Écriture demeure le crible permanent de toute impression intérieure.",
    pillarKey: 'PROPHETIQUE' as const,
    subRubricSlug: 'la-voix-de-dieu',
    tags: 'voix de Dieu, discernement, écoute, obéissance',
    body: `## Une question préalable : qui écoute ?

Avant de demander « comment reconnaître la voix de DIEU ? », il faut poser une question plus dérangeante : **qui écoute ?** Un cœur encombré entend mal. Un cœur pressé entend ce qu'il souhaite entendre. L'écoute juste suppose d'abord une disposition juste.

L'Écriture ne présente jamais l'audition de la voix divine comme une technique. Elle la présente comme le fruit d'une relation : « Mes brebis entendent ma voix » (Jean 10.27). La reconnaissance précède l'audition, et non l'inverse.

## Trois voix se disputent l'oreille du croyant

- **La voix de l'Esprit** : elle édifie, elle exhorte, elle console, et elle conduit toujours vers CHRIST.
- **La voix de l'âme** : nos désirs, nos peurs, nos ambitions. Elle parle fort, surtout quand elle est contrariée.
- **La voix de l'ennemi** : elle accuse, elle presse, elle isole, elle installe la confusion.

Le discernement ne consiste pas à faire taire les deux dernières, mais à apprendre à les identifier sans se troubler.

## Les critères permanents

### 1. La conformité à l'Écriture

Aucune impression, aussi forte soit-elle, ne peut contredire la Parole écrite. DIEU ne se divise pas contre lui-même. Ce critère est le premier, et il n'est jamais négociable.

### 2. La paix intérieure durable

La voix de DIEU laisse une paix qui tient dans le temps. L'excitation retombe ; la paix demeure.

### 3. La confirmation

DIEU confirme. Il n'a aucune difficulté à redire ce qu'il a dit, par l'Écriture, par les circonstances, par le conseil de serviteurs éprouvés.

### 4. Le fruit

> Vous les reconnaîtrez à leurs fruits.

Une conduite reçue de DIEU produit, à terme, ce que DIEU produit : sainteté, humilité, amour, édification.

## L'école du silence

Beaucoup veulent entendre sans jamais apprendre à se taire. Or l'oreille spirituelle se forme dans le silence : dans la lecture lente, dans la prière sans agenda, dans la patience.

**Celui qui n'a pas appris à attendre DIEU finira par entendre sa propre voix et l'appeler « prophétie ».**`,
  },
  {
    slug: 'le-jeune-finalites-et-conduite',
    title: 'Le jeûne : finalités et conduite saine',
    summary:
      "Ce que le jeûne accomplit réellement, les formes qu'il prend dans l'Écriture, et les dérives à éviter pour qu'il demeure un acte de foi et non de performance.",
    pillarKey: 'SPIRITUEL' as const,
    subRubricSlug: 'le-jeune',
    tags: 'jeûne, consécration, prière, discipline',
    body: `## Le jeûne ne change pas DIEU

Il faut lever d'emblée un malentendu tenace : le jeûne n'est pas un levier pour contraindre DIEU. Il ne le fléchit pas, il ne l'achète pas, il ne l'oblige à rien. **Le jeûne change celui qui jeûne.**

En privant volontairement le corps, le croyant réordonne ses priorités : ce qui gouvernait passe au second plan, et l'esprit retrouve la première place.

## Les finalités bibliques

1. **L'humiliation devant DIEU** — reconnaître sa dépendance (Psaume 35.13).
2. **La recherche d'une direction** — chercher la face de DIEU avant une décision (Actes 13.2-3).
3. **La consécration à une mission** — se mettre à part pour une charge.
4. **L'intercession** — porter une situation, un peuple, une famille.
5. **La rupture d'un joug** — Ésaïe 58 lie explicitement le jeûne agréé à la libération de l'opprimé.

## Les formes

- **Le jeûne normal** : abstention de nourriture, l'eau étant maintenue.
- **Le jeûne partiel** : renoncement à certains aliments, sur une durée plus longue.
- **Le jeûne absolu** : sans eau, exceptionnel et bref, jamais entrepris à la légère.

## Trois dérives à éviter

### La performance

Le jeûne qui se compte, se compare et se raconte a déjà reçu sa récompense (Matthieu 6.16-18).

### La négligence du corps

Le corps est le temple du Saint-Esprit. Un jeûne conduit sans sagesse — durée démesurée, état de santé ignoré, reprise alimentaire brutale — n'honore pas DIEU.

### Le jeûne sans justice

> Voici le jeûne auquel je prends plaisir : détache les chaînes de la méchanceté.

Un jeûne accompagné de dureté envers son prochain est un jeûne que DIEU ne reçoit pas.

## Conduite pratique

- Commencer par des durées courtes et régulières plutôt que par des exploits isolés.
- Fixer une intention claire, et l'écrire.
- Consacrer le temps libéré à la prière et à la Parole — sans quoi le jeûne devient un simple régime.
- Reprendre l'alimentation progressivement.
- Rendre grâces, quelle que soit la réponse reçue.`,
  },
];

main()
  .catch((error) => {
    console.error('✗ Échec de l’amorçage :', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
