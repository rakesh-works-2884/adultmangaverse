import { chromium } from "playwright";
import fs from "node:fs";
import { parse } from "dotenv";
(async () => {
 const browser = await chromium.launch({headless:true});
 const context = await browser.newContext({ viewport: {width:1440,height:1000} });
 await context.addInitScript(() => localStorage.setItem("amv_age_verified", "true"));
 const page = await context.newPage();
 const errors=[]; page.on("pageerror", e=>errors.push(e.message));
 const base=process.env.TEST_BASE_URL || "http://localhost:3002";
 await page.goto(base+"/login?callbackUrl=/admin");
 await page.getByRole("heading", {name:"Welcome back"}).waitFor();
 fs.mkdirSync("artifacts",{recursive:true});
 await page.screenshot({path:"artifacts/login-desktop.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:"artifacts/login-mobile.png",fullPage:true});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error("Mobile overflow");
 const anon = await context.request.get(base+"/admin/users",{maxRedirects:0});
 if(![302,307].includes(anon.status())) throw Error("Anonymous admin access");
 const credentials=parse(fs.readFileSync(".env.test-admin.local"));
 await page.getByRole("textbox",{name:"Email",exact:true}).fill(credentials.TEST_ADMIN_EMAIL);
 await page.getByLabel("Password",{exact:true}).fill(credentials.TEST_ADMIN_PASSWORD);
 await page.getByRole("button",{name:"Sign in",exact:true}).click();
 await page.waitForURL(url => url.pathname === "/admin",{timeout:60000});
 await page.getByRole("heading",{name:/Welcome back/}).waitFor();
 await page.screenshot({path:"artifacts/admin-mobile.png",fullPage:true});
 await page.goto(base+"/admin/users");
 await page.getByRole("heading",{name:"Users",exact:true}).waitFor();
 await page.goto(base+"/login?callbackUrl=https://example.org");
 await page.waitForURL(base+"/", {timeout:60000});
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:"artifacts/home-desktop.png",fullPage:true});
 const timings=[];
 for(let i=0;i<3;i++){ const start=performance.now();const r=await context.request.get(base+"/");if(r.status()!==200)throw Error("Homepage error");timings.push(Math.round(performance.now()-start)); }
 if(errors.length)throw Error(errors.join("; "));
 console.log(JSON.stringify({login:"passed",anonymousAdmin:"blocked",externalRedirect:"blocked",mobileOverflow:false,pageErrors:errors,homeResponseMs:timings}));
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});


