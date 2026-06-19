import { NextRequest, NextResponse } from 'next/server';
import { login, createSession, setSessionCookie, checkEnvironmentVariables } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    const envCheck = await checkEnvironmentVariables();
    if (!envCheck.valid) {
      return NextResponse.json(
        { error: 'Server configuration error', details: envCheck.errors },
        { status: 500 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await login(parsed.data.password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid password' },
        { status: 401 }
      );
    }

    const token = await createSession();
    await setSessionCookie(token);

    return NextResponse.json({ success: true, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
