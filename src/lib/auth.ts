import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPasswordSafe } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (typeof token.id !== "string") {
        token.isActive = false;
        return token;
      }
      const current = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, isActive: true, sessionVersion: true, email: true, name: true },
      });
      if (!current) { token.isActive = false; return token; }
      if (user) token.sessionVersion = current.sessionVersion;
      if (typeof token.sessionVersion !== "number" || token.sessionVersion !== current.sessionVersion) {
        token.isActive = false;
        return token;
      }
      token.isActive = current.isActive;
      token.role = current.role;
      token.email = current.email;
      token.name = current.name;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.isActive = token.isActive === true;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();

        // Bremst Brute-Force-Versuche pro E-Mail-Adresse aus.
        const limit = checkRateLimit(`login:${email}`, 10, 5 * 60 * 1000);
        if (!limit.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await verifyPasswordSafe(parsed.data.password, user?.passwordHash);

        if (!user || !valid || !user.isActive) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],
});
