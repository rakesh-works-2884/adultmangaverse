import "dotenv/config";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Local CLI only: never expose account provisioning as a web endpoint.
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const email = `test-admin-${randomBytes(4).toString("hex")}@example.com`;
  const password = `${randomBytes(24).toString("base64url")}!aA9`;
  await prisma.user.create({
    data: { email, name: "Test Admin", role: "ADMIN", passwordHash: await hash(password) },
    select: { id: true },
  });
  await writeFile(".env.test-admin.local", `# Private test credentials. Do not publish.\nTEST_ADMIN_EMAIL=${email}\nTEST_ADMIN_PASSWORD=${password}\n`, { mode: 0o600 });
  console.log("Test admin created. Credentials saved to .env.test-admin.local (git-ignored).");
}
main().catch(() => { console.error("Could not create test admin. Check the server database connection."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
