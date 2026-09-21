import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { isPublicMediaKey } from "../src/lib/public-media";
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
async function main(){
 const prefix=(process.env.R2_PUBLIC_URL || "").replace(/\/$/,"")+"/";
 let count=0;
 for(const row of await db.manga.findMany({select:{id:true,coverUrl:true,heroImageDesktop:true,heroImageMobile:true}})){
  for(const field of ["coverUrl","heroImageDesktop","heroImageMobile"] as const){
   const url=row[field];if(!url?.startsWith(prefix))continue;
   const key=url.slice(prefix.length);if(!isPublicMediaKey(key))continue;
   const changed=await db.manga.updateMany({where:{id:row.id,[field]:url},data:{[field]:`/api/media/${key}`}});count+=changed.count;
  }
 }
 console.log(`Repaired ${count} artwork URLs without changing the stored images.`);
}
main().finally(()=>db.$disconnect());
