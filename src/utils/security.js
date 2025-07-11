// Security utilities for the Audionize app

// Input validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  SESSION_CODE: /^\d{6}$/,
  IP_ADDRESS:
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
};

// Rate limiting configuration
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutes
  SIGNUP_ATTEMPTS: 3,
  SIGNUP_WINDOW: 60 * 60 * 1000, // 1 hour
  API_REQUESTS: 100,
  API_WINDOW: 60 * 1000, // 1 minute
};

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .substring(0, 1000); // Limit length
};

// Email validation
export const validateEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return VALIDATION_PATTERNS.EMAIL.test(email.toLowerCase());
};

// Password validation
export const validatePassword = (password) => {
  if (!password || typeof password !== "string") return false;
  return VALIDATION_PATTERNS.PASSWORD.test(password);
};

// Session code validation
export const validateSessionCode = (code) => {
  if (!code || typeof code !== "string") return false;
  return VALIDATION_PATTERNS.SESSION_CODE.test(code);
};

// IP address validation
export const validateIpAddress = (ip) => {
  if (!ip || typeof ip !== "string") return false;
  return VALIDATION_PATTERNS.IP_ADDRESS.test(ip);
};

// URL validation
export const validateUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return VALIDATION_PATTERNS.URL.test(url);
};

// XSS Prevention
export const escapeHtml = (text) => {
  if (typeof text !== "string") return text;

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// CSRF Token generation
export const generateCSRFToken = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// Content Security Policy headers
export const getCSPHeaders = () => {
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  };
};

// Security headers
export const getSecurityHeaders = () => {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...getCSPHeaders(),
  };
};

// Rate limiting storage (in-memory for demo, use Redis in production)
const rateLimitStore = new Map();

export const checkRateLimit = (key, limit, window) => {
  const now = Date.now();
  const userAttempts = rateLimitStore.get(key) || [];

  // Remove old attempts outside the window
  const validAttempts = userAttempts.filter(
    (timestamp) => now - timestamp < window
  );

  if (validAttempts.length >= limit) {
    return false; // Rate limit exceeded
  }

  // Add current attempt
  validAttempts.push(now);
  rateLimitStore.set(key, validAttempts);

  return true; // Within rate limit
};

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, attempts] of rateLimitStore.entries()) {
    const validAttempts = attempts.filter(
      (timestamp) => now - timestamp < 60 * 60 * 1000
    ); // 1 hour
    if (validAttempts.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validAttempts);
    }
  }
}, 60 * 1000); // Clean up every minute
