/**
 * Arborescence fondamentale — la règle des 3 piliers.
 *
 * Aucun contenu ne peut exister hors de ces trois grandes rubriques.
 * Les thématiques spécifiques (prière, jeûne, sainteté…) sont des
 * sous-rubriques obligatoirement imbriquées dans l'un des trois piliers.
 *
 * Ce fichier est la source de vérité : le seed et le classificateur IA
 * s'y réfèrent tous les deux.
 */

export type PillarKey = 'PROPHETIQUE' | 'SPIRITUEL' | 'DOCTRINAL';

export interface SubRubricSeed {
  slug: string;
  title: string;
  description: string;
  /** Mots-clés qui guident la classification automatique des transcriptions. */
  keywords: string[];
}

export interface PillarSeed {
  key: PillarKey;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  accent: string;
  subRubrics: SubRubricSeed[];
}

export const PILLARS: PillarSeed[] = [
  {
    key: 'PROPHETIQUE',
    slug: 'enseignement-prophetique',
    title: "L'Enseignement Prophétique",
    tagline: "La voix, la vision et le discernement de l'Esprit",
    description:
      "Le ministère prophétique dans sa dimension biblique et sacerdotale : entendre la voix de DIEU, discerner les temps, recevoir et rendre le message avec justesse, former des serviteurs éprouvés dans le prophétique.",
    accent: 'gold',
    subRubrics: [
      {
        slug: 'la-voix-de-dieu',
        title: 'La voix de DIEU',
        description:
          "Reconnaître, éprouver et obéir à la voix de DIEU ; distinguer la voix de l'Esprit de celle de l'âme.",
        keywords: ['voix de Dieu', 'entendre', 'écouter', 'obéissance', 'appel', 'oreille spirituelle'],
      },
      {
        slug: 'visions-et-songes',
        title: 'Visions, songes et révélations',
        description:
          "Les modes de révélation : visions, songes, extases, paroles de connaissance ; leur interprétation ordonnée.",
        keywords: ['vision', 'songe', 'rêve', 'révélation', 'extase', 'interprétation', 'symbole'],
      },
      {
        slug: 'discernement-des-esprits',
        title: 'Le discernement des esprits',
        description:
          "Éprouver les esprits, démasquer la contrefaçon, protéger l'Église de la fausse prophétie.",
        keywords: ['discernement', 'esprits', 'éprouver', 'faux prophète', 'séduction', 'contrefaçon'],
      },
      {
        slug: 'formation-au-prophetique',
        title: 'La formation au prophétique',
        description:
          "École du prophète : caractère, maturité, protocole de la parole, gestion du don, école des fils.",
        keywords: ['formation', 'école', 'disciple', 'mentorat', 'don', 'maturité', 'caractère'],
      },
      {
        slug: 'intercession-prophetique',
        title: "L'intercession prophétique",
        description:
          "Se tenir sur la brèche, porter les nations et les générations, prier selon la révélation reçue.",
        keywords: ['intercession', 'brèche', 'veilleur', 'sentinelle', 'nations', 'combat'],
      },
      {
        slug: 'temps-et-saisons',
        title: 'Les temps et les saisons',
        description:
          "Comprendre les temps de DIEU, les saisons spirituelles, l'agenda prophétique des nations.",
        keywords: ['temps', 'saison', 'kairos', 'agenda', 'prophétie', 'nation', 'génération'],
      },
    ],
  },
  {
    key: 'SPIRITUEL',
    slug: 'enseignement-spirituel',
    title: "L'Enseignement Spirituel",
    tagline: "La vie intérieure, la croissance et les réalités du sacerdoce",
    description:
      "La marche quotidienne avec DIEU : prière, jeûne, sainteté, combat spirituel, réalités spirituelles du sacerdoce en CHRIST et formation du caractère du serviteur.",
    accent: 'night',
    subRubrics: [
      {
        slug: 'la-priere',
        title: 'La prière',
        description:
          "L'école de la prière : adoration, supplication, prière persévérante, prière dans l'Esprit.",
        keywords: ['prière', 'prier', 'adoration', 'supplication', 'oraison', 'genoux', 'requête'],
      },
      {
        slug: 'le-jeune',
        title: 'Le jeûne',
        description:
          "Les types de jeûne, leurs finalités, leur conduite saine et les fruits qu'ils produisent.",
        keywords: ['jeûne', 'jeûner', 'abstinence', 'privation', 'consécration alimentaire'],
      },
      {
        slug: 'la-saintete',
        title: 'La sainteté',
        description:
          "La séparation pour DIEU, la pureté du cœur, la sanctification progressive du serviteur.",
        keywords: ['sainteté', 'pureté', 'sanctification', 'consécration', 'séparation', 'intégrité'],
      },
      {
        slug: 'combat-spirituel',
        title: 'Le combat spirituel',
        description:
          "L'armure de DIEU, la délivrance, l'autorité du croyant, la victoire acquise à la croix.",
        keywords: ['combat', 'guerre', 'délivrance', 'démon', 'autorité', 'armure', 'victoire', 'lier'],
      },
      {
        slug: 'sacerdoce-en-christ',
        title: 'Le sacerdoce en CHRIST',
        description:
          "Les réalités spirituelles du sacerdoce : l'ordre de Melchisédek, le service devant DIEU, les vases d'honneur.",
        keywords: ['sacerdoce', 'sacrificateur', 'Melchisédek', 'autel', 'service', 'onction', 'huile'],
      },
      {
        slug: 'vie-de-l-esprit',
        title: "La vie de l'Esprit",
        description:
          "Le fruit de l'Esprit, la conduite par l'Esprit, l'intimité avec le Saint-Esprit.",
        keywords: ['Saint-Esprit', 'fruit', 'intimité', 'communion', 'conduite', 'onction', 'esprit'],
      },
      {
        slug: 'louange-et-adoration',
        title: 'La louange et l\'adoration',
        description:
          "Le culte en esprit et en vérité, la place de la louange dans l'édification du croyant.",
        keywords: ['louange', 'adoration', 'culte', 'cantique', 'psaume', 'chant', 'harpe'],
      },
    ],
  },
  {
    key: 'DOCTRINAL',
    slug: 'enseignement-doctrinal',
    title: "L'Enseignement Doctrinal",
    tagline: "La saine doctrine et les mystères de DIEU",
    description:
      "Le fondement de la foi : les grandes doctrines bibliques, l'ecclésiologie, l'eschatologie, l'herméneutique et la dispensation des mystères de DIEU dans la saine doctrine.",
    accent: 'night',
    subRubrics: [
      {
        slug: 'les-fondements-de-la-foi',
        title: 'Les fondements de la foi',
        description:
          "Repentance, foi en DIEU, baptêmes, imposition des mains, résurrection, jugement éternel.",
        keywords: ['fondement', 'repentance', 'foi', 'baptême', 'imposition des mains', 'doctrine élémentaire'],
      },
      {
        slug: 'christologie',
        title: 'La personne de CHRIST',
        description:
          "L'identité, l'œuvre et la seigneurie de JÉSUS-CHRIST : incarnation, croix, résurrection, intercession.",
        keywords: ['Christ', 'Jésus', 'croix', 'résurrection', 'incarnation', 'seigneurie', 'rédemption'],
      },
      {
        slug: 'salut-et-grace',
        title: 'Le salut et la grâce',
        description:
          "Justification, régénération, adoption, œuvre de la grâce et responsabilité du croyant.",
        keywords: ['salut', 'grâce', 'justification', 'régénération', 'adoption', 'œuvre', 'péché'],
      },
      {
        slug: 'ecclesiologie',
        title: "L'Église et les ministères",
        description:
          "La nature de l'Église, les cinq ministères, l'ordre et la gouvernance selon les Écritures.",
        keywords: ['église', 'ministère', 'apôtre', 'pasteur', 'ancien', 'gouvernance', 'corps de Christ'],
      },
      {
        slug: 'eschatologie',
        title: "Les temps de la fin",
        description:
          "Retour de CHRIST, enlèvement, jugements, règne millénaire et éternité.",
        keywords: ['fin des temps', 'retour', 'enlèvement', 'antéchrist', 'millénium', 'jugement', 'éternité'],
      },
      {
        slug: 'mysteres-de-dieu',
        title: 'Les mystères de DIEU',
        description:
          "La dispensation des mystères : typologie, alliances, révélation progressive du dessein éternel.",
        keywords: ['mystère', 'dispensation', 'alliance', 'typologie', 'dessein', 'révélation', 'secret'],
      },
      {
        slug: 'hermeneutique',
        title: "L'étude et l'interprétation des Écritures",
        description:
          "Méthode d'étude, herméneutique saine, exégèse fidèle et défense contre les déviations doctrinales.",
        keywords: ['écriture', 'bible', 'exégèse', 'herméneutique', 'interprétation', 'étude', 'hérésie'],
      },
    ],
  },
];

export const PILLAR_BY_KEY: Record<PillarKey, PillarSeed> = Object.fromEntries(
  PILLARS.map((p) => [p.key, p]),
) as Record<PillarKey, PillarSeed>;

export function pillarBySlug(slug: string): PillarSeed | undefined {
  return PILLARS.find((p) => p.slug === slug);
}

/** Rendu compact de l'arborescence, injecté dans les prompts de classification. */
export function taxonomyOutline(): string {
  return PILLARS.map((p) => {
    const subs = p.subRubrics
      .map((s) => `    - ${s.slug} — ${s.title} (${s.keywords.join(', ')})`)
      .join('\n');
    return `- ${p.key} — ${p.title}\n${subs}`;
  }).join('\n');
}

export const CONTENT_TYPES = ['ARTICLE', 'AUDIO', 'VIDEO', 'BOOK'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  ARTICLE: 'Enseignement écrit',
  AUDIO: 'Enseignement audio',
  VIDEO: 'Enseignement vidéo',
  BOOK: 'Livre PDF',
};
