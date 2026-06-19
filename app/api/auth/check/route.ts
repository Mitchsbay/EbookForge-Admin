import { NextResponse } from 'next/server';
import { getSession, checkEnvironmentVariables } from '@/lib/auth';

export async function GET() {
  try {
    const envCheck = await checkEnvironmentVariables();
    if (!envCheck.valid) {
      return NextResponse.json({
        authenticated: false,
        configured: false,
        errors: envCheck.errors,
      });
    }

    const session = await getSession();

    return NextResponse.json({
      authenticated: session !== null,
      configured: true,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      configured: false,
      errors: ['Failed to check authentication status'],
    });
  }
}
