import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'ebookforge_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to login page
  if (pathname === '/login' || pathname === '/') {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      // If already logged in, redirect to admin
      const adminUrl = new URL('/admin', request.url);
      return NextResponse.redirect(adminUrl);
    }
    return NextResponse.next();
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
