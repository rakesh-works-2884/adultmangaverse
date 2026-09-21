import "dotenv/config";
import {PrismaClient} from "../src/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {AwsClient} from "aws4fetch";
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
async function main(){const rows=await db.manga.findMany({take:5,orderBy:{createdAt:"desc"},select:{id:true,coverUrl:true}});const s3=new AwsClient({accessKeyId:process.env.R2_ACCESS_KEY_ID!,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY!,region:"auto",service:"s3"});for(const row of rows){if(!row.coverUrl){console.log({id:row.id,cover:false});continue;} const u=new URL(row.coverUrl,"http://localhost:3001");const publicResult=await fetch(u,{method:"HEAD"});const key=u.pathname.replace(/^\/api\/media\//, "").replace(/^\//, "");const privateResult=await s3.fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`,{method:"HEAD"});console.log({id:row.id,host:u.hostname,path:u.pathname,publicStatus:publicResult.status,storedStatus:privateResult.status});}}
main().finally(()=>db.$disconnect());
