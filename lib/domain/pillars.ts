/**
 * Les trois piliers canoniques. Libellés EXACTS exigés par le propriétaire :
 * ne jamais les reformuler, ne jamais ajouter de quatrième pilier.
 * Les formats (livre, vidéo, audio, écrit) sont un axe distinct.
 */
export const PILLARS = [
  { id: "prophetique", number: "01.", label: "Enseignements Prophétiques" },
  { id: "spirituel", number: "02.", label: "Enseignements Spirituels" },
  { id: "doctrinal", number: "03.", label: "Enseignements Doctrinaux" },
] as const;

export type PillarId = (typeof PILLARS)[number]["id"];

export const PILLAR_IDS = PILLARS.map((p) => p.id) as [PillarId, ...PillarId[]];

export function getPillar(id: string) {
  return PILLARS.find((p) => p.id === id);
}

export const FORMATS = ["livre", "video", "audio", "ecrit"] as const;
export type ResourceFormat = (typeof FORMATS)[number];
