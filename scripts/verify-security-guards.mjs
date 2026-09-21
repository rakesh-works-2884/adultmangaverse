import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as crypto from "node:crypto";
import vm from "node:vm";
import ts from "typescript";

// Exercise the real server modules with isolated dependencies; no production data is modified.
function load(file, dependencies) {
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, Date, console,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}

let user = { role: "USER", banned: false };
const guards = load("src/lib/auth-guards.ts", {
  "server-only": {},
  react: { cache: (fn) => fn },
  "@/auth": { auth: async () => ({ user: { id: "test", role: "ADMIN" } }) },
  "@/lib/db": { prisma: { user: { findUnique: async () => user } } },
});
assert.ok(await guards.requireUser());
assert.equal(await guards.requireAdmin(), null, "Do not trust an old admin claim");
assert.equal(await guards.requireStaff(), null);
user = { role: "MOD", banned: false };
assert.ok(await guards.requireStaff());
assert.equal(await guards.requireAdmin(), null);
user = { role: "ADMIN", banned: true };
assert.equal(await guards.requireUser(), null);
assert.equal(await guards.requireAdmin(), null);
user = null;
assert.equal(await guards.requireUser(), null);

let otp;
const resetOtp = () => {
  otp = { id: "code", codeHash: createHash("sha256").update("123456").digest("hex"),
    attempts: 0, consumedAt: null, expiresAt: new Date(Date.now() + 60_000) };
};
const codes = load("src/lib/otp.ts", {
  "server-only": {}, "node:crypto": crypto,
  "@/lib/email": { sendEmail: async () => {} },
  "@/lib/db": { prisma: { emailOtp: {
    findFirst: async () => ({ ...otp }),
    updateMany: async ({ where, data }) => {
      if (otp.consumedAt || otp.expiresAt <= where.expiresAt.gt ||
          (where.attempts && otp.attempts >= where.attempts.lt)) return { count: 0 };
      if (data.attempts) otp.attempts++;
      if (data.consumedAt) otp.consumedAt = data.consumedAt;
      return { count: 1 };
    },
  } } },
});
resetOtp();
const valid = await Promise.all(Array.from({ length: 12 }, () => codes.verifyOtp("test@example.com", "RESET", "123456")));
assert.equal(valid.filter((r) => r.ok).length, 1, "A code can only succeed once concurrently");
resetOtp();
await Promise.all(Array.from({ length: 20 }, () => codes.verifyOtp("test@example.com", "RESET", "000000")));
assert.equal(otp.attempts, 5, "Concurrent guesses cannot exceed the attempt limit");
assert.equal((await codes.verifyOtp("test@example.com", "RESET", "123456")).ok, false);
console.log("Passed: current account/role gates, concurrent OTP replay protection, and attempt limits.");
