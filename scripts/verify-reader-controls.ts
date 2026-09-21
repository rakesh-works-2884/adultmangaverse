import "dotenv/config";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {parse} from "dotenv";
import {chromium} from "playwright";
import sharp from "sharp";
import {PrismaClient} from "../src/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {AwsClient} from "aws4fetch";
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
async function main(){
 const slug=`feedback-test-${randomUUID()}`;
 const fixture=await db.manga.create({data:{title:"Reader controls test",slug,published:true,chapters:{create:{number:1,publishedAt:new Date()}}},select:{id:true,chapters:{select:{id:true}}}});
 const browser=await chromium.launch({headless:true});
 try {
 const ctx=await browser.newContext();const base=process.env.TEST_BASE_URL || "http://localhost:3001";
 const creds=parse(readFileSync(".env.test-admin.local"));
 const csrf=await (await ctx.request.get(base+"/api/auth/csrf")).json();
 await ctx.request.post(base+"/api/auth/callback/credentials",{form:{csrfToken:csrf.csrfToken,email:creds.TEST_ADMIN_EMAIL,password:creds.TEST_ADMIN_PASSWORD},headers:{"X-Auth-Return-Redirect":"1"}});
 const page=await ctx.newPage();
 await page.goto(base+"/admin/chapters/"+fixture.chapters[0].id+"/pages");
 const png=await sharp({create:{width:100,height:150,channels:3,background:"#345678"}}).png().toBuffer();
 await page.locator('input[type="file"]').setInputFiles([{name:"01.png",mimeType:"image/png",buffer:png},{name:"02.png",mimeType:"image/png",buffer:png}]);
 await page.getByRole("button",{name:"Upload 2",exact:true}).click();
 await page.getByRole("status").filter({hasText:/Uploading image/}).waitFor();
 await page.getByText("Upload complete. Pages are saved.",{exact:true}).waitFor({timeout:90000});
 await page.getByRole("heading",{name:"Pages (2)",exact:true}).waitFor();
 await ctx.addInitScript(()=>localStorage.setItem("amv_age_verified","true"));
 await page.goto(base+"/manga/"+slug+"/1");
 const first=page.getByRole("img",{name:/page 1$/});await first.waitFor();
 const before=await first.evaluate(el=>el.getBoundingClientRect().width);
 await page.getByRole("button",{name:"Zoom in",exact:true}).click();
 await page.getByRole("button",{name:"Reset zoom",exact:true}).filter({hasText:"125%"}).waitFor();
 const enlarged=await first.evaluate(el=>el.getBoundingClientRect().width);
 if(enlarged<=before)throw Error("Zoom did not enlarge vertical page");
 await page.getByRole("button",{name:"Reset zoom",exact:true}).click();
 await page.getByRole("button",{name:"Enter fullscreen",exact:true}).click();
 await page.getByRole("button",{name:"Exit fullscreen",exact:true}).waitFor();
 if(!await page.evaluate(()=>!!document.fullscreenElement))throw Error("Fullscreen not entered");
 await page.getByRole("button",{name:"Exit fullscreen",exact:true}).click();
 await page.getByRole("button",{name:"Enter fullscreen",exact:true}).waitFor();
 await page.getByRole("button",{name:"Toggle reading mode",exact:true}).click();
 await page.getByRole("button",{name:"Zoom in",exact:true}).click();
 await page.getByRole("button",{name:"Next page",exact:true}).click();
 await page.getByRole("img",{name:/page 2$/}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole("button",{name:"Reset zoom",exact:true}).click();
 await page.getByRole("button",{name:"Zoom out",exact:true}).click();
 await page.getByRole("button",{name:"Reset zoom",exact:true}).filter({hasText:"75%"}).waitFor();
 console.log("PASS: vertical zoom changes rendered width; reset, fullscreen entry/exit, paged navigation, and mobile zoom controls work.");
 }finally{
 const pages=await db.page.findMany({where:{chapterId:fixture.chapters[0].id},select:{imageUrl:true}});
 const s3=new AwsClient({accessKeyId:process.env.R2_ACCESS_KEY_ID!,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY!,region:"auto",service:"s3"});
 for(const p of pages)await s3.fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${p.imageUrl}`,{method:"DELETE"});
 await db.manga.delete({where:{id:fixture.id}});await browser.close();await db.$disconnect();
 }
}
main().catch(e=>{console.error(String(e.message).split("\n")[0]);process.exitCode=1;});
