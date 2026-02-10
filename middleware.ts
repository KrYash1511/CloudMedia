import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// With Firebase, auth is handled client-side via AuthProvider
// and server-side in API routes via firebase-admin token verification.
// Middleware just passes requests through.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};