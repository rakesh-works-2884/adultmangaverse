import fs from "node:fs"; import path from "node:path"; import {parse} from "dotenv";
const env={...parse(fs.readFileSync(".env")),...parse(fs.readFileSync(".env.test-admin.local"))};
const secrets=Object.entries(env).filter(([k,v])=>!k.startsWith("NEXT_PUBLIC_") && /SECRET|PASSWORD|DATABASE_URL|API_KEY|ACCESS_KEY/.test(k) && v.length>=8);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(".next-production/static").filter(f=>/\.(js|map|css)$/.test(f));
let leaked=false;
for(const file of files){const body=fs.readFileSync(file,"utf8");for(const [key,value] of secrets){if(body.includes(value)){console.error("Secret found: "+key+" in "+file);leaked=true;}}}
if(leaked)process.exit(1);console.log(`Passed: ${files.length} browser files checked against ${secrets.length} configured secrets.`);
