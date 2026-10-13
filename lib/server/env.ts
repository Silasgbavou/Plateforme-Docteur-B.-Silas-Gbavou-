import "server-only";
import { z } from "zod";

const csv = z
  .string()
  .optional()
  .transform((v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  SITE_AUDIENCE: z.enum(["private", "public"]).default("private"),
  DATABASE_PATH: z.string().default("./data/ministere.sqlite"),
  STORAGE_DIR: z.string().default("./storage"),
  SESSION_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  LLM_PROVIDER: z.enum(["gemini", "openai", "none"]).default("none"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODELS: csv,
  GEMINI_API_BASE: z.string().url().default("https://generativelanguage.googleapis.com/v1beta"),
  OPENAI_API_BASE: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODELS: csv,
  LLM_CROSS_PROVIDER_FALLBACK: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(45000),
  LLM_GLOBAL_RPM: z.coerce.number().int().min(1).max(10000).default(30),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  DRIVE_FOLDER_ID: z.string().regex(/^[A-Za-z0-9_-]{10,}$/).default("1eVNAgUtMHp8Op2qvXdseVWWVFIt0ggxI"),
  EMBEDDING_PROVIDER: z.enum(["gemini", "openai", "none"]).default("none"),
  EMBEDDING_MODEL: z.string().optional(),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().min(8).max(4096).default(768),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Ne jamais afficher les valeurs : seulement les noms de variables fautives.
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Configuration invalide : ${names}`);
  }
  cached = parsed.data;
  return cached;
}

/** Secret de session. En production, absence = erreur explicite (pas de valeur par défaut). */
export function sessionSecret(): string {
  const s = env().SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (env().NODE_ENV === "production") {
    throw new Error("SESSION_SECRET manquant ou trop court (>= 32 caractères requis).");
  }
  return "dev-only-insecure-session-secret-change-me-0000";
}
