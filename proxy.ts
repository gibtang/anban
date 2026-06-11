import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/join',
  '/approve',
  '/card',
  '/skill.md',
  '/about',
  '/privacy',
  '/terms',
  '/delete-account',
  '/robots.txt',
  '/sitemap.xml',
  '/api/firebase-config',
  '/api/auth',
  '/api/board-access/board',
  '/api/board-access/request',
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Content negotiation for /join/[token]: return JSON for curl/AI agents
  const joinMatch = pathname.match(/^\/join\/([^/]+)$/);
  if (joinMatch) {
    const accept = request.headers.get('accept') || '';
    if (!accept.includes('text/html')) {
      const token = joinMatch[1];
      const url = request.nextUrl.clone();
      url.pathname = '/api/board-access/join-info';
      url.searchParams.set('shareToken', token);
      return NextResponse.rewrite(url);
    }
  }

  // Check if auth is disabled via environment variable
  const authDisabled = process.env.DISABLE_AUTH === 'true';

  if (authDisabled) {
    // Auth disabled - allow all requests through
    return NextResponse.next();
  }

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => {
    if (route.endsWith('*')) {
      const prefix = route.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return pathname === route || pathname.startsWith(route + '/');
  });

  // Public routes pass through
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protected routes require firebase-auth-token cookie
  const token = request.cookies.get('firebase-auth-token')?.value;

  if (!token) {
    // Redirect to login if no token is present
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Valid token, allow access
  return NextResponse.next();
}

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