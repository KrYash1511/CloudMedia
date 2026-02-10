import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
]);

const isPublicApiRoute=createRouteMatcher([
  // No public API routes - all require authentication
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const currentUrl = new URL(req.url);
  const isApiRequest = currentUrl.pathname.startsWith("/api")

  if(userId && isPublicRoute(req)){
    return NextResponse.redirect(new URL("/home", req.url));
  }

  if(!userId ) //not logged in
  {
    if(!isPublicRoute(req) && !isPublicApiRoute(req))//if the user is not logged in and trying to access protected route
      {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    if(isApiRequest && !isPublicApiRoute(req))
      //if the request is for a protected api and the user is not logged in
    {
     return NextResponse.redirect(new URL("/sign-in", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};