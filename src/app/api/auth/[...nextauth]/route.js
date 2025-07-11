import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "../../../../utils/users";
import {
  validateEmail,
  sanitizeInput,
  checkRateLimit,
  RATE_LIMITS,
  getSecurityHeaders,
} from "../../../../utils/security";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // Rate limiting
        const clientIp =
          req.headers?.["x-forwarded-for"] ||
          req.headers?.["x-real-ip"] ||
          "unknown";

        if (
          !checkRateLimit(
            `login:${clientIp}`,
            RATE_LIMITS.LOGIN_ATTEMPTS,
            RATE_LIMITS.LOGIN_WINDOW
          )
        ) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Input sanitization and validation
        const sanitizedEmail = sanitizeInput(credentials.email);
        if (!validateEmail(sanitizedEmail)) {
          return null;
        }

        const user = findUserByEmail(sanitizedEmail);

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
