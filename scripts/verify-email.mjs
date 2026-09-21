import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(fs.readFileSync("src/lib/email.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function setup(env, fail = false) {
  const exports = {};
  const calls = { options: null, message: null, closed: false, fetch: false };
  vm.runInNewContext(source, {
    exports, process: { env }, AbortSignal,
    console: { error() {}, warn() {} },
    require(name) {
      if (name === "server-only") return {};
      if (name === "nodemailer") return { createTransport(options) {
        calls.options = options;
        return {
          async sendMail(message) {
            calls.message = message;
            if (fail) throw { code: "EAUTH", responseCode: 535 };
            return { accepted: [message.to.address] };
          },
          close() { calls.closed = true; },
        };
      } };
      throw new Error(`Unexpected import ${name}`);
    },
    fetch: async () => { calls.fetch = true; return { ok: true }; },
  });
  return { send: exports.sendEmail, calls };
}
const message = { to: "recipient@example.com", subject: "Verification", html: "Test code" };
const env = { EMAIL_PROVIDER: "gmail", GMAIL_USER: "sender@gmail.com", GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop", EMAIL_FROM: "old@resend.dev" };
let test = setup(env);
assert.equal(await test.send(message), true);
assert.equal(test.calls.options.host, "smtp.gmail.com");
assert.equal(test.calls.options.secure, true);
assert.equal(test.calls.options.auth.pass, "abcdefghijklmnop");
assert.equal(test.calls.message.from.address, env.GMAIL_USER);
assert.equal(test.calls.closed, true);
assert.equal(test.calls.fetch, false);
test = setup({ EMAIL_PROVIDER: "gmail" });
assert.equal(await test.send(message), false);
assert.equal(test.calls.options, null);
test = setup(env, true);
assert.equal(await test.send(message), false);
assert.equal(test.calls.closed, true);
test = setup({ RESEND_API_KEY: "test-only" });
assert.equal(await test.send(message), true);
assert.equal(test.calls.fetch, true);
console.log("Passed: Gmail TLS, sender, app-password normalization, missing credentials, auth failure, and Resend compatibility. No emails sent.");
