import { SignJWT, jwtVerify, errors } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'ebookforge_session';
const ALGORITHM = 'HS256';

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not configured');
  }
  return new TextEncoder().encode(secret);
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is not configured');
  }
  return password;
}

export interface SessionPayload {
  isAdmin: boolean;
  loginTime: number;
  [key: string]: unknown;
}

export async function createSession(): Promise<string> {
  const payload: SessionPayload = {
    isAdmin: true,
    loginTime: Date.now(),
  };

  const secretKey = getSecretKey();
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [ALGORITHM],
    });
    return payload as SessionPayload;
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      return null;
    }
    if (error instanceof errors.JWTInvalid) {
      return null;
    }
    console.error('Session verification error:', error);
    return null;
  }
}

export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  const adminPassword = getAdminPassword();

  if (password === adminPassword) {
    return { success: true };
  }

  return { success: false, error: 'Invalid password' };
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.isAdmin === true;
}

export async function checkEnvironmentVariables(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET is not configured. Please set this in your environment variables.');
  }

  if (!process.env.ADMIN_PASSWORD) {
    errors.push('ADMIN_PASSWORD is not configured. Please set this in your environment variables.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function middleware(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Allow public access to login page and API routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return null;
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Note: Full JWT verification happens in the route handlers
    // The middleware just checks for the presence of the token
    return null;
  }

  return null;
}
