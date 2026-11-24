import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'flashcard_admin_session';
const SESSION_PAYLOAD = 'admin_authenticated_v1';

function getAdminSecret(): string | null {
  const code = process.env.ADMIN_CODE;
  return code && code.trim().length > 0 ? code.trim() : null;
}

function signToken(secret: string): string {
  return createHmac('sha256', secret).update(SESSION_PAYLOAD).digest('hex');
}

export function verifyPasscode(input: string): { ok: boolean; error?: string } {
  const secret = getAdminSecret();
  if (!secret) {
    return {
      ok: false,
      error: 'ADMIN_CODE is not configured on the server.',
    };
  }

  const expectedBuf = Buffer.from(secret, 'utf8');
  const providedBuf = Buffer.from(input.trim(), 'utf8');

  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, error: 'Invalid passcode.' };
  }

  const match = timingSafeEqual(expectedBuf, providedBuf);
  return match ? { ok: true } : { ok: false, error: 'Invalid passcode.' };
}

export function createSessionCookieValue(): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;
  return signToken(secret);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return false;

  const expected = signToken(secret);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(cookie.value, 'utf8');

  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
