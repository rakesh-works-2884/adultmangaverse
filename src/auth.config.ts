import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

/**
 * Edge-safe base config. Contains ONLY things that can run in the middleware
 * (no Prisma, no argon2, no Node APIs). The Credentials provider — which needs
 * the DB + argon2 — lives in `auth.ts`, which extends this.
 *
 * The jwt/session callbacks live here so both the middleware instance and the
 * full instance expose `role`/`id` on the session identically.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id;
        if ("role" in user && user.role) token.role = user.role as Role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
