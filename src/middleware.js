import { NextResponse } from "next/server";
import { getSecurityHeaders } from "./utils/security";

const express = require("express");
const http = require("http");
const { Server: IOServer } = require("socket.io");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  path: "/socket.io",
  cors: {
    origin: "*", // You can restrict this to your frontend domain in production
    methods: ["GET", "POST"],
  },
});
const wss = new WebSocket.Server({ server, path: "/ws" });

const PORT = process.env.PORT || 4000;
const sessions = {}; // { sessionCode: { host, clients, audioUrl, ... } }

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// --- WebSocket (LAN) ---
wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }
    if (data.type === "join") {
      ws.session = data.session;
      ws.role = data.role;
      sessions[data.session] = sessions[data.session] || {
        clients: [],
        host: null,
      };
      if (data.role === "host") sessions[data.session].host = ws;
      else sessions[data.session].clients.push(ws);
    }
    if (data.type === "sync" && ws.session) {
      const session = sessions[ws.session];
      if (session) {
        (session.clients || []).forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN)
            client.send(msg);
        });
      }
    }
  });
  ws.on("close", () => {
    if (ws.session && sessions[ws.session]) {
      sessions[ws.session].clients = (
        sessions[ws.session].clients || []
      ).filter((c) => c !== ws);
      if (sessions[ws.session].host === ws) sessions[ws.session].host = null;
    }
  });
});

// --- Socket.IO (Internet) ---
io.on("connection", (socket) => {
  socket.on("join", ({ session, role }) => {
    socket.session = session;
    socket.role = role;
    socket.join(session);
    sessions[session] = sessions[session] || { clients: [], host: null };
    if (role === "host") sessions[session].host = socket;
    else sessions[session].clients.push(socket);
  });
  socket.on("sync", (data) => {
    if (socket.session) {
      socket.to(socket.session).emit("sync", data);
    }
  });
  socket.on("disconnect", () => {
    if (socket.session && sessions[socket.session]) {
      sessions[socket.session].clients = (
        sessions[socket.session].clients || []
      ).filter((c) => c !== socket);
      if (sessions[socket.session].host === socket)
        sessions[socket.session].host = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

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

  // Update Content Security Policy for WebSocket connections
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' ws: wss: wss://your-app.onrender.com;"
  );

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
