import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { hash, verify } from "@node-rs/argon2";
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
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const emailLower = parsed.data.email.toLowerCase();
          const ip = await clientIp();
          const accountOk = rateLimit(`login:acct:${emailLower}`, 10, 15 * 60 * 1000);
          const ipOk = rateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
          if (!accountOk || !ipOk) return null;

          const user = await prisma.user.findUnique({
            where: { email: emailLower },
          });

          const envAdminEmail = (process.env.ADMIN_EMAIL || "admin@adultmangaverse.local").toLowerCase().trim();
          const envAdminPassword = (process.env.ADMIN_PASSWORD || "AdultMangaVerse!Admin1").trim();

          const inputPassword = parsed.data.password.trim();

          // Auto-create/authorize the Admin user defined in environment variables or fallback defaults
          if (emailLower === envAdminEmail && inputPassword === envAdminPassword) {
            console.log(`[AUTH] Admin env login auto-provisioned for ${envAdminEmail}`);
            const passwordHash = await hash(envAdminPassword);
            let adminUser = user;
            if (!adminUser) {
              adminUser = await prisma.user.create({
                data: {
                  email: envAdminEmail,
                  name: "Site Admin",
                  role: "ADMIN",
                  passwordHash,
                },
              });
            } else if (adminUser.role !== "ADMIN" || !(await verify(adminUser.passwordHash, envAdminPassword))) {
              adminUser = await prisma.user.update({
                where: { id: adminUser.id },
                data: { role: "ADMIN", passwordHash },
              });
            }
            resetRateLimit(`login:acct:${emailLower}`);
            return {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name,
              role: adminUser.role,
            };
          }

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
        } catch (err) {
          console.error("[AUTH] Authorize error:", err);
          return null;
        }
      },
    }),
  ],
});
