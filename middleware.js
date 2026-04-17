import { NextResponse } from 'next/server';

const ROLE_HOME = {
    registration: '/',
    nurse: '/dashboard',
    doctor: '/doctor',
    manager: '/manager',
};

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('session')?.value;

  // 1. Allow public files and API routes
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // 2. Handle Login page accessibility
  if (pathname === '/login') {
    if (session) {
      // If session exists, try to send them somewhere useful
      // We don't know their role yet from just the cookie presence,
      // so we go to the general root which AuthContext will refine.
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 3. Protect all other routes
  if (!session) {
    // No session? Send to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
