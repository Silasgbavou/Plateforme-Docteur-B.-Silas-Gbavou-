import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

export class AiUnavailableError extends Error {
  constructor() {
    super(
      "L'assistant est momentanément indisponible : la clé ANTHROPIC_API_KEY n'est pas configurée sur le serveur.",
    );
    this.name = 'AiUnavailableError';
  }
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailableError();
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 2,
    });
  }
  return client;
}

/**
 * Appel non diffusé, utilisé pour les tâches courtes et structurées
 * (classification, titres, résumés). Le streaming est réservé au chat.
 */
export async function completeText(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
}): Promise<string> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 2000,
    system: params.system,
    thinking: { type: 'adaptive' },
    output_config: { effort: params.effort ?? 'medium' },
    messages: [{ role: 'user', content: params.prompt }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error("La requête a été déclinée par les protections du modèle.");
  }

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/** Variante structurée : la réponse est contrainte par un schéma JSON. */
export async function completeJson<T>(params: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
}): Promise<T> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 2000,
    system: params.system,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: params.effort ?? 'medium',
      format: { type: 'json_schema', schema: params.schema },
    },
    messages: [{ role: 'user', content: params.prompt }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error("La requête a été déclinée par les protections du modèle.");
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  return JSON.parse(text) as T;
}
