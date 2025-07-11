import { NextResponse } from "next/server";
import { getSecurityHeaders } from "./utils/security";

export function middleware(request) {
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
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Authentication check for protected routes
  const { pathname } = request.nextUrl;
  const protectedRoutes = ["/hosts", "/settings"];
  const authRoutes = ["/auth/signin", "/auth/signup"];
  const publicRoutes = ["/", "/join"];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (isProtectedRoute && !sessionToken) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Update Content Security Policy for WebSocket connections
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' ws: wss: wss://aduionize-socket.onrender.com;"
  );

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
