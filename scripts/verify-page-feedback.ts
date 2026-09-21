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
 const fixture=await db.manga.create({data:{title:"Feedback test",slug,chapters:{create:{number:1}}},select:{id:true,chapters:{select:{id:true}}}});
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
 await page.getByRole("button",{name:"Move down",exact:true}).first().click();
 await page.getByRole("status").filter({hasText:"Saving page order…"}).waitFor();
 await page.getByText("Page order saved.",{exact:true}).waitFor({timeout:60000});
 page.on("dialog",dialog=>dialog.accept());
 await page.getByRole("button",{name:"Delete page",exact:true}).first().click();
 await page.getByRole("status").filter({hasText:"Deleting page…"}).waitFor();
 await page.getByText("Page deleted.",{exact:true}).waitFor({timeout:60000});
 await page.getByRole("heading",{name:"Pages (1)",exact:true}).waitFor();
 await ctx.addInitScript(()=>localStorage.setItem("amv_age_verified","true"));
 await page.goto(base+"/");await page.getByRole("button",{name:"Genres",exact:true}).click();
 const bg=await page.getByRole("menu").evaluate(el=>getComputedStyle(el).backgroundColor);
 if(bg==="transparent" || bg.startsWith("rgba"))throw Error("Dropdown is translucent");
 console.log("PASS: opaque dropdown; upload, reorder and deletion progress and success feedback; page counts update.");
 }finally{
 const pages=await db.page.findMany({where:{chapterId:fixture.chapters[0].id},select:{imageUrl:true}});
 const s3=new AwsClient({accessKeyId:process.env.R2_ACCESS_KEY_ID!,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY!,region:"auto",service:"s3"});
 for(const p of pages)await s3.fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${p.imageUrl}`,{method:"DELETE"});
 await db.manga.delete({where:{id:fixture.id}});await browser.close();await db.$disconnect();
 }
}
main().catch(e=>{console.error(String(e.message).split("\n")[0]);process.exitCode=1;});
