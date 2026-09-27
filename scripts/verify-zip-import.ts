import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
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
 let testUserId: string | undefined;
 try {
  const creds=process.env.TEST_FRESH_ADMIN === "1" ? {TEST_ADMIN_EMAIL:`upload-test-${randomUUID()}@example.com`,TEST_ADMIN_PASSWORD:randomBytes(24).toString("hex")} : parse(readFileSync(".env.test-admin.local"));
  if(process.env.TEST_FRESH_ADMIN === "1") testUserId=(await db.user.create({data:{email:creds.TEST_ADMIN_EMAIL,passwordHash:await hash(creds.TEST_ADMIN_PASSWORD),role:"ADMIN",name:"Upload test"},select:{id:true}})).id;
  const csrf=await (await context.get("/api/auth/csrf")).json();
  await context.post("/api/auth/callback/credentials",{form:{csrfToken:csrf.csrfToken,email:creds.TEST_ADMIN_EMAIL,password:creds.TEST_ADMIN_PASSWORD},headers:{"X-Auth-Return-Redirect":"1"}});
  const session=await (await context.get("/api/auth/session")).json();
  if(session?.user?.role!=="ADMIN")throw Error("Test login failed");
  const zip=new JSZip();if(process.env.TEST_IMAGE_ONLY !== "1") zip.file("ComicInfo.xml",`<ComicInfo><Title>${title}</Title><Writer>Upload test</Writer></ComicInfo>`);
  for(let i=1;i<=2;i++) zip.file(`pages/00${i}.png`,await sharp({create:{width:800,height:1200,channels:3,background:i===1?"#203040":"#405060"}}).png().toBuffer());
  // Force the upload above Vercel's single-request limit without real content.
  if(process.env.TEST_CHUNKED === "1") zip.file("padding.bin", Buffer.alloc(5 * 1024 * 1024));
  const buffer = await zip.generateAsync({type:"nodebuffer",compression:"STORE"});
  let response;
  if(process.env.TEST_CHUNKED === "1") {
   const init=await context.post("/api/admin/import/upload",{data:{name:title+".zip",size:buffer.length}});
   const upload=await init.json(); if(!init.ok())throw Error(upload.error);
   try {
    for(let offset=0,i=0;offset<buffer.length;offset+=upload.chunkBytes,i++){
     const part=await context.put("/api/admin/import/upload",{headers:{"x-upload-token":upload.token,"x-upload-part":String(i),"Content-Type":"application/octet-stream"},data:buffer.subarray(offset,offset+upload.chunkBytes)});
     if(!part.ok())throw Error("Chunk upload failed: "+part.status());
    }
    response=await context.post("/api/admin/import",{data:{token:upload.token}});
   } finally {await context.delete("/api/admin/import/upload",{headers:{"x-upload-token":upload.token}});}
  } else {
   response=await context.post("/api/admin/import",{multipart:{file:{name:title+".zip",mimeType:"application/zip",buffer}}});
  }
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
  if(testUserId) await db.user.delete({where:{id:testUserId}});
  await context.dispose();await db.$disconnect();
  console.log("Test records and uploaded objects removed.");
 }
}
main().catch(error=>{console.error(String(error.message).split("\n")[0]);process.exitCode=1;});
