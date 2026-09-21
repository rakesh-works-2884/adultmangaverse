import assert from "node:assert/strict";
import fs from "node:fs";
import { parse } from "dotenv";
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL || "http://localhost:3004";
const credentials = parse(fs.readFileSync(".env.test-admin.local"));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem("amv_age_verified", "true"));
  await page.goto(`${base}/login`, { timeout: 60_000 });
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(credentials.TEST_ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(credentials.TEST_ADMIN_PASSWORD);
  let documentRequests = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests++;
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 60_000 });
  const account = page.locator("header").getByRole("button", { name: /Test Admin/ });
  await account.waitFor({ timeout: 15_000 });
  assert.equal(await page.locator("header").getByRole("link", { name: "Sign in", exact: true }).count(), 0);
  await account.click();
  await page.getByRole("menuitem", { name: "Account", exact: true }).waitFor();
  assert.equal(documentRequests, 0, "Sign-in must update the header without a document reload");
  console.log("Passed: account menu updates and opens immediately after sign-in without a reload.");
} finally {
  await browser.close();
}
