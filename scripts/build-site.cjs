/* Explicit public-file allowlist. Does not deploy or change Netlify configuration. */
const fs=require('node:fs/promises');
const path=require('node:path');
const Official=require('../official-data.js');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'dist');
const files=['index.html','legacy.html','styles.css','app.js','legacy-app.js','views.js','personal-data.js','itinerary-data.js','map-links.js','official-data.js','local-store.js','visual-preview.js','trip-data.js','sw.js','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png','trip/bootstrap.js','trip/manifest.json'];
(async()=>{
 const manifest=Official.manifest(JSON.parse(await fs.readFile(path.join(root,'trip/manifest.json'),'utf8'))),release=manifest.snapshotUrl.slice(2);
 const text=await fs.readFile(path.join(root,release),'utf8');
 if(Buffer.byteLength(text)!==manifest.byteLength||await Official.digest(text)!==manifest.sha256)throw new Error('Release bytes do not match manifest');
 Official.validate(JSON.parse(text));
 files.push(release);
 await fs.rm(dest,{recursive:true,force:true});
 for(const file of files){await fs.mkdir(path.dirname(path.join(dest,file)),{recursive:true});await fs.copyFile(path.join(root,file),path.join(dest,file));}
 await fs.writeFile(path.join(dest,'_headers'),'/trip/manifest.json\n  Cache-Control: no-store\n/trip/releases/*\n  Cache-Control: public, max-age=31536000, immutable\n/sw.js\n  Cache-Control: no-cache\n');
 console.log(`Prepared ${files.length+1} public files in dist/; no deployment performed.`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
