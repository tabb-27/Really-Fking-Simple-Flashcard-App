import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ADMIN_COOKIE_NAME,
  createSessionCookieValue,
  isAdminAuthenticated,
  verifyPasscode,
} from '@/lib/auth';

export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  return NextResponse.json({ isAdmin });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { passcode?: string };
    const passcode = typeof body.passcode === 'string' ? body.passcode : '';

    const verification = verifyPasscode(passcode);
    if (!verification.ok) {
      return NextResponse.json(
        { error: verification.error ?? 'Invalid passcode.' },
        { status: 401 }
      );
    }

    const token = createSessionCookieValue();
    if (!token) {
      return NextResponse.json(
        { error: 'ADMIN_CODE is not configured on the server.' },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ isAdmin: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ isAdmin: false });
}
