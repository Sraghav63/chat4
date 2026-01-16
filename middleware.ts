import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/ping',
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Playwright starts the dev server and requires a 200 status to begin the tests
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Protect all other routes
  const { userId } = await auth();
  
  if (!userId && !isPublicRoute(request)) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth pages
  if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
