import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { rateLimit, resetRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Full Auth.js config (Node runtime): Credentials provider that verifies the
 * argon2 hash against the DB. Sessions are JWT (Rules/Architecture: role in
 * the token). Never called from middleware — see auth.config.ts.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const emailLower = parsed.data.email.toLowerCase();
        // Two independent limits: per-account (stops targeted password
        // guessing against one email) and per-IP (stops one attacker cycling
        // through many accounts). Deliberately fails the same way as a wrong
        // password — no distinct "too many attempts" message — so an
        // attacker can't use the response to fingerprint which accounts exist.
        const ip = await clientIp();
        const accountOk = rateLimit(`login:acct:${emailLower}`, 5, 15 * 60 * 1000);
        const ipOk = rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
        if (!accountOk || !ipOk) return null;

        const user = await prisma.user.findUnique({
          where: { email: emailLower },
        });
        if (!user || user.banned) return null;

        const valid = await verify(user.passwordHash, parsed.data.password);
        if (!valid) return null;

        resetRateLimit(`login:acct:${emailLower}`);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
