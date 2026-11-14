import { z } from "zod";

export const CONSENT_VERSION = "2026-10-13";

export const DISCOVERY_OPTIONS = [
  "Facebook",
  "TikTok",
  "WhatsApp",
  "Église locale",
  "Recommandation d'un proche",
  "Enseignement ou conférence",
  "Autre",
] as const;

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} est requis.` })
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min, `${label} est requis.`).max(max, `${label} : ${max} caractères maximum.`));

/** Numéro WhatsApp international : « + » puis 8 à 15 chiffres (espaces tolérés). */
export const whatsappSchema = z
  .string({ error: "Le numéro WhatsApp est requis." })
  .transform((s) => s.replace(/[\s.()-]/g, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{7,14}$/, "Numéro WhatsApp invalide : indiquez l'indicatif, par ex. +229 01 67 96 00 94."))
  .transform((s) => (s.startsWith("+") ? s : `+${s}`));

export const downloadRequestSchema = z.object({
  workId: z.string().regex(/^[a-z0-9-]{2,80}$/),
  idempotencyKey: z.string().uuid(),
  lastName: trimmed(1, 80, "Le nom"),
  firstName: trimmed(1, 80, "Le prénom"),
  church: trimmed(2, 140, "L'église locale"),
  whatsapp: whatsappSchema,
  email: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.union([z.literal(""), z.string().email("Adresse email invalide.").max(160)]))
    .transform((s) => (s === "" ? null : s.toLowerCase()))
    .optional()
    .transform((s) => s ?? null),
  motivation: trimmed(10, 1500, "La motivation").refine((s) => s.length >= 10, "Quelques mots de motivation (10 caractères minimum)."),
  discovery: z.enum(DISCOVERY_OPTIONS, { error: "Indiquez comment vous avez connu le ministère." }),
});

export type DownloadRequestInput = z.input<typeof downloadRequestSchema>;
