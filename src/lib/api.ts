import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { AuthError } from '@/lib/auth';

/** Réponse JSON d'erreur normalisée pour toutes les routes API. */
export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Traduit les exceptions courantes en réponses HTTP propres. */
export function handleApiError(error: unknown) {
  if (error instanceof AuthError) return apiError(error.message, error.status);
  if (error instanceof ZodError) {
    return apiError('Données invalides.', 422, error.flatten().fieldErrors);
  }
  const message = error instanceof Error ? error.message : 'Erreur inattendue.';
  console.error('[api]', error);
  return apiError(message, 500);
}

/** Limitation de débit en mémoire (suffisante pour un serveur unique). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'inconnu';
}
