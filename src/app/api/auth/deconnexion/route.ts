import { apiOk, handleApiError } from '@/lib/api';
import { destroySessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await destroySessionCookie();
    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
