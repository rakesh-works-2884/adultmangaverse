import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parse } from "dotenv";
import { request } from "playwright";
import JSZip from "jszip";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const title=`Upload verification ${randomUUID()}`;
const s3=new AwsClient({accessKeyId:process.env.R2_ACCESS_KEY_ID!,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY!,region:"auto",service:"s3"});
const endpoint=`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}`;
async function main(){
 const context=await request.newContext({baseURL:process.env.TEST_BASE_URL || "http://localhost:3002",timeout:120000});
 try {
  const creds=parse(readFileSync(".env.test-admin.local"));
  const csrf=await (await context.get("/api/auth/csrf")).json();
  await context.post("/api/auth/callback/credentials",{form:{csrfToken:csrf.csrfToken,email:creds.TEST_ADMIN_EMAIL,password:creds.TEST_ADMIN_PASSWORD},headers:{"X-Auth-Return-Redirect":"1"}});
  const session=await (await context.get("/api/auth/session")).json();
  if(session?.user?.role!=="ADMIN")throw Error("Test login failed");
  const zip=new JSZip();if(process.env.TEST_IMAGE_ONLY !== "1") zip.file("ComicInfo.xml",`<ComicInfo><Title>${title}</Title><Writer>Upload test</Writer></ComicInfo>`);
  for(let i=1;i<=2;i++) zip.file(`pages/00${i}.png`,await sharp({create:{width:800,height:1200,channels:3,background:i===1?"#203040":"#405060"}}).png().toBuffer());
  const response=await context.post("/api/admin/import",{multipart:{file:{name:`${title}.zip`,mimeType:"application/zip",buffer:await zip.generateAsync({type:"nodebuffer"})}}});
  const body=await response.json();
  if(!response.ok() || !body.result?.ok)throw Error("ZIP import failed: "+(body.error || body.result?.error || response.status()));
  const manga=await db.manga.findUniqueOrThrow({where:{id:body.result.id},select:{published:true,coverUrl:true,chapters:{select:{publishedAt:true,pages:{select:{imageUrl:true,width:true,height:true}}}}}});
  if(manga.published || manga.chapters.length!==1 || manga.chapters[0].publishedAt || manga.chapters[0].pages.length!==2)throw Error("Unexpected imported chapter state");
  if(!manga.coverUrl)throw Error("Missing imported cover");
  const cover=await context.get(manga.coverUrl);
  if(!cover.ok())throw Error("Imported poster cannot be loaded");
  const pixel=await sharp(await cover.body()).resize(1,1).removeAlpha().raw().toBuffer();
  if(Math.abs(pixel[0]-32)>5 || Math.abs(pixel[1]-48)>5 || Math.abs(pixel[2]-64)>5)throw Error("Poster does not match the first ZIP page");
  for(const page of manga.chapters[0].pages){
   const signed=await s3.sign(`${endpoint}/${page.imageUrl}?X-Amz-Expires=60`,{method:"GET",aws:{signQuery:true}});
   const result=await fetch(signed);
   if(!result.ok || !(await result.arrayBuffer()).byteLength)throw Error("Stored chapter image could not be read");
  }
  console.log("PASS: ZIP imported, two chapter pages uploaded to R2 and read back, chapter remains unpublished.");
 } finally {
  const fixtures=await db.manga.findMany({where:{title},select:{id:true,coverUrl:true,chapters:{select:{pages:{select:{imageUrl:true}}}}}});
  for(const fixture of fixtures){
   const publicPrefix=(process.env.R2_PUBLIC_URL || "").replace(/\/$/,"")+"/";
   const keys=fixture.chapters.flatMap(c=>c.pages.map(p=>p.imageUrl));
   if(fixture.coverUrl?.startsWith("/api/media/"))keys.push(fixture.coverUrl.slice("/api/media/".length));
   if(fixture.coverUrl?.startsWith(publicPrefix))keys.push(fixture.coverUrl.slice(publicPrefix.length));
   for(const key of keys){const result=await s3.fetch(`${endpoint}/${key}`,{method:"DELETE"});if(!result.ok)throw Error("Test object cleanup failed");}
   await db.manga.delete({where:{id:fixture.id}});
  }
  await context.dispose();await db.$disconnect();
  console.log("Test records and uploaded objects removed.");
 }
}
main().catch(error=>{console.error(String(error.message).split("\n")[0]);process.exitCode=1;});
