import type { PillarId } from "./pillars";

/**
 * Catalogue initial. Source : dossier de transmission du 13 octobre 2026
 * (catalogue local audité, classifications validées) et inventaire du dossier
 * Drive autorisé « Livre du Docteur B. Silas Gbavou » (métadonnées uniquement).
 *
 * - Les identifiants historiques sont conservés pour que /lecture/[id] reste valide.
 * - pageCountCatalog = nombre de pages déclaré par l'ancien catalogue, À VÉRIFIER
 *   contre chaque fichier ; le nombre réel est mesuré à l'import d'une édition.
 * - Les deux titres présents dans Drive mais absents du catalogue ne reçoivent
 *   AUCUN pilier : ils restent en statut "a_classer" et non publiés.
 * - Aucun texte d'auteur, résumé ou citation n'est inventé ici.
 */
export interface WorkSeed {
  id: string;
  title: string;
  pillar: PillarId | null;
  theme: string | null;
  status: "publie" | "a_classer";
  pageCountCatalog: number | null;
  drive: { fileId: string; name: string; sizeBytes: number; modifiedTime: string };
}

export const AUTHOR = "Docteur B. Silas Gbavou";

export const WORK_SEEDS: WorkSeed[] = [
  {
    id: "introduction-mouvement-prophetique",
    title: "Introduction au Mouvement Prophétique",
    pillar: "prophetique",
    theme: "Mouvement prophétique",
    status: "publie",
    pageCountCatalog: 374,
    drive: { fileId: "1SQb6jTZ36D6RfUEP3QFdT3x1xFxRQHTb", name: "Introduction au Mouvement Prophétique - Docteur B. Silas Gbavou.pdf", sizeBytes: 4841079, modifiedTime: "2026-09-13T03:12:10.648Z" },
  },
  {
    id: "ruach-naba",
    title: "Dispensation prophétique et surnaturelle de l'Esprit — Ruach Naba",
    pillar: "prophetique",
    theme: "Dispensation de l'Esprit",
    status: "publie",
    pageCountCatalog: 259,
    drive: { fileId: "1aw2qPD8zIyNTM-GkjRYUrSB11FtOj7hc", name: "Dispensation Prophétique et Surnaturelle de L'ESPRIT - Ruach Naba/ Docteur B. Silas Gbavou", sizeBytes: 4695515, modifiedTime: "2026-09-18T01:09:34.277Z" },
  },
  {
    id: "la-priere-qui-engendre",
    title: "La Prière qui engendre les mouvements de Dieu",
    pillar: "spirituel",
    theme: "Prière",
    status: "publie",
    pageCountCatalog: 143,
    drive: { fileId: "1go6NJ-jAbsIJ8alJz668pX5uzh0KGsUr", name: "La Prière qui Engendre les Mouvements de Dieu Docteur B Silas Gbavou.pdf", sizeBytes: 2864489, modifiedTime: "2026-09-13T03:18:25.223Z" },
  },
  {
    id: "eglise-glorieuse",
    title: "L'Église glorieuse du temps de la fin",
    pillar: "doctrinal",
    theme: "Église",
    status: "publie",
    pageCountCatalog: 151,
    drive: { fileId: "1xpXRK2__cftZx_QfnaDoro6CIsjkKcBV", name: "L'église glorieuse du temps de la fin-Docteur B. Silas Gbavou.pdf", sizeBytes: 1572603, modifiedTime: "2026-08-21T23:13:54.049Z" },
  },
  {
    id: "fondements-legaux-priere",
    title: "Les Fondements légaux de la Prière dans le règne spirituel",
    pillar: "doctrinal",
    theme: "Fondements de la prière",
    status: "publie",
    pageCountCatalog: 211,
    drive: { fileId: "1rGpB5YcHsUldbr8__6pisYfUoN216iGp", name: "Les fondements légaux de la Prière dans le règne Spirituel Docteur B. Silas Gbavou.pdf", sizeBytes: 1641399, modifiedTime: "2026-08-04T11:39:53.494Z" },
  },
  {
    id: "royaume-puissance",
    title: "Introduction au Royaume de la Puissance",
    pillar: "spirituel",
    theme: "Puissance",
    status: "publie",
    pageCountCatalog: 191,
    drive: { fileId: "1LJX-rqBbisYIdn36dR1v6USEBfFYp7wf", name: "Introduction au Royaume de la Puissance Docteur B. Silas Gbavou ", sizeBytes: 1245927, modifiedTime: "2026-07-29T14:13:08.956Z" },
  },
  {
    id: "realites-redemption",
    title: "Les Réalités spirituelles de la Rédemption",
    pillar: "doctrinal",
    theme: "Rédemption",
    status: "publie",
    pageCountCatalog: 118,
    drive: { fileId: "1OEujYPrKMJpK8MvYEDxRwng93zYMFkg0", name: "Les Réalités Spirituelles de la Rédemption Docteur B Silas Gbavou.pdf", sizeBytes: 2596982, modifiedTime: "2026-07-29T14:11:06.118Z" },
  },
  {
    id: "sept-montagnes",
    title: "Les Sept Montagnes d'une ville",
    pillar: "spirituel",
    theme: "Territoires spirituels",
    status: "publie",
    pageCountCatalog: 53,
    drive: { fileId: "1KpKckrVHy5WxQ992tWxDI50jyBbMNaRM", name: "Les Sept montagnes d'une ville Docteur B. Silas Gbavou.pdf", sizeBytes: 262358, modifiedTime: "2026-07-29T14:13:27.266Z" },
  },
  {
    id: "partenaires-de-dieu",
    title: "Les Partenaires de Dieu",
    pillar: null,
    theme: null,
    status: "a_classer",
    pageCountCatalog: null,
    drive: { fileId: "1ivpj1VwtLaPepjuygJMBSfEYDLL8r3up", name: "Les Partenaires de Dieu - Docteur B. Silas Gbavou.pdf", sizeBytes: 3979263, modifiedTime: "2026-09-25T12:36:16.004Z" },
  },
  {
    id: "porteurs-mobiles-divinite",
    title: "Les Porteurs Mobiles de la Divinité",
    pillar: null,
    theme: null,
    status: "a_classer",
    pageCountCatalog: null,
    drive: { fileId: "19cU_0R7QIgTNmXsm-sLFpSUzPwYBVq4Z", name: "Les Porteurs Mobiles de la Divinité - Docteur B. Silas Gbavou.pdf", sizeBytes: 4962357, modifiedTime: "2026-10-03T04:29:27.438Z" },
  },
];
