import { NextResponse } from "next/server";
import { getSecurityHeaders } from "./utils/security";

export function middleware(request) {
  // Get the response
  const response = NextResponse.next();

  // Add security headers to all responses
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Additional security measures
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Authentication check for protected routes
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ["/hosts", "/settings"];
  const authRoutes = ["/auth/signin", "/auth/signup"];

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/join"];

  // Check if user is accessing protected routes
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  // Get session token from cookies
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  // Redirect to sign-in if accessing protected route without session
  if (isProtectedRoute && !sessionToken) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect to home if accessing auth routes with valid session
  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
