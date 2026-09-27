import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

let pdfLoads = 0;
const exports = {};
const dependencies = {
  "next/cache": { revalidatePath() {} },
  "next/server": { after() {} },
  "@/lib/db": { prisma: { page: { findMany: async () => [] }, chapter: { findUnique: async () => ({ number: 1, manga: { slug: "test" } }) } } },
  "@/lib/auth-guards": { requireStaff: async () => ({ user: { id: "test" } }) },
  "@/lib/images": {}, "@/lib/storage": {}, "@/lib/image-urls": {},
};
vm.runInNewContext(ts.transpileModule(readFileSync("src/actions/pages.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports, Buffer, File, console: { error() {} },
  require(name) {
    if (name === "pdf-to-img") { pdfLoads++; throw Error("DOMMatrix is not defined"); }
    if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
    return dependencies[name];
  },
});
assert.equal(pdfLoads, 0, "Importing the editor actions must not load PDF.js");
assert.equal((await exports.getChapterPages("test")).ok, true);
const fd = new FormData(); fd.set("file", new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" }));
assert.equal((await exports.uploadChapterPdf("test", fd)).ok, false);
assert.equal(pdfLoads, 1);
assert.equal((await exports.getChapterPages("test")).ok, true);
console.log("PASS: broken PDF runtime cannot break unrelated editor actions; PDF errors are handled.");

// Render a neutral one-page PDF with the actual installed native dependencies.
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> /Contents 4 0 R >>",
];
const content = "0.2 0.3 0.4 rg 0 0 100 100 re f\n";
objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`);
let source = "%PDF-1.4\n"; const offsets = [0];
objects.forEach((object, i) => { offsets.push(Buffer.byteLength(source)); source += `${i + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(source);
source += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
const { pdf } = await import("pdf-to-img");
const doc = await pdf(Buffer.from(source));
try {
  assert.equal(doc.length, 1);
  for await (const image of doc) assert.equal(image.subarray(1, 4).toString(), "PNG");
} finally { await doc.destroy(); }
console.log("PASS: actual PDF converter renders a one-page PDF successfully.");
