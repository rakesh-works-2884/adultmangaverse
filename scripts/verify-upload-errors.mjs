import { chromium } from "playwright";
import fs from "node:fs";
import { parse } from "dotenv";
const browser=await chromium.launch({headless:true});
try {
 const base=process.env.TEST_BASE_URL || "http://localhost:3001";
 const context=await browser.newContext();
 const page=await context.newPage();
 const errors=[];
 page.on("console", message=>{if(message.type()==="error" && /same key/.test(message.text()))errors.push("Duplicate navigation key");});
 const credentials=parse(fs.readFileSync(".env.test-admin.local"));
 const csrf=await (await context.request.get(base+"/api/auth/csrf")).json();
 await context.request.post(base+"/api/auth/callback/credentials",{form:{csrfToken:csrf.csrfToken,email:credentials.TEST_ADMIN_EMAIL,password:credentials.TEST_ADMIN_PASSWORD},headers:{"X-Auth-Return-Redirect":"1"}});
 await page.goto(base+"/admin/import");
 await page.getByRole("heading",{name:"Bulk Import",exact:true}).waitFor();
 const response=await context.request.post(base+"/api/admin/import",{multipart:{file:{name:"storage-check.zip",mimeType:"application/zip",buffer:Buffer.from("invalid archive for preflight check")}}});
 const body=await response.json();
 if(response.status()!==503 || !body.error?.includes("storage rejected access"))throw Error("Expected the configured R2 authorization failure to be handled before archive parsing");
 if(/<xml|<Error>|Unauthorized|R2|401|cloudflarestorage|Prisma/i.test(body.error))throw Error("Provider internals leaked into the response");
 if(errors.length)throw Error(errors.join(", "));
 console.log("Passed: admin navigation has no duplicate-key errors; R2 failure returns a safe 503 message before ZIP processing.");
} finally {await browser.close();}
