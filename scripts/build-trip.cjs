/* Build one immutable public trip release. No network requests and no personal-data access. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Official=require('../official-data.js');
const root=path.resolve(__dirname,'..');
function read(file){return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));}
const source=read('trip/source-v4.12.json');
for(const [file,key] of [['trip/location-verification.json','places'],['trip/route-overrides.json','segments']]){
 if(!fs.existsSync(path.join(root,file)))continue;
 const overrides=read(file);if(!Array.isArray(overrides[key]))throw new Error(file+' 缺少 '+key+' 列表');
 const ids=new Set();for(const entry of overrides[key]){if(ids.has(entry.id))throw new Error(file+' 重复覆盖 ID：'+entry.id);ids.add(entry.id);}
 for(const entry of overrides[key]){const original=source[key].find(item=>item.id===entry.id);if(!original)throw new Error(file+' 未知 ID：'+entry.id);Object.assign(original,entry);}
}
const data=Official.validate(source),text=JSON.stringify(data),hash=crypto.createHash('sha256').update(text).digest('hex');
const manifest=Official.manifest({schemaVersion:1,tripId:data.tripId,tripDataVersion:data.tripDataVersion,releaseSequence:data.releaseSequence,snapshotUrl:'./trip/releases/'+hash+'.json',sha256:hash,byteLength:Buffer.byteLength(text)});
fs.mkdirSync(path.join(root,'trip/releases'),{recursive:true});
const release=path.join(root,'trip/releases',hash+'.json');if(fs.existsSync(release)&&fs.readFileSync(release,'utf8')!==text)throw new Error('已存在的哈希快照内容不一致');fs.writeFileSync(release,text);
fs.writeFileSync(path.join(root,'trip/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'trip/bootstrap.js'),'/* Bundled last-resort official snapshot; public data only. */\nwindow.PARIS_BOOTSTRAP='+JSON.stringify({manifest,data})+';\n');
console.log(`Built trip ${data.tripDataVersion} / release ${data.releaseSequence}: ${data.activities.length} activities, ${data.stops.length} stops, ${data.segments.filter(s=>s.geometry).length} verified paths; ${manifest.byteLength} bytes / ${hash}`);
