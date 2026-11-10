/* Explicit public-file allowlist. Does not deploy or change Netlify configuration. */
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const Official=require('../official-data.js');
const PROJECT_ROOT=path.resolve(__dirname,'..');
const SHELL_FILES=Object.freeze(['index.html','legacy.html','styles.css','app.js','legacy-app.js','views.js','personal-data.js','itinerary-data.js','map-links.js','official-data.js','local-store.js','visual-preview.js','trip-data.js','sw.js','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png','trip/bootstrap.js','trip/manifest.json']);
const HEADERS='/trip/manifest.json\n  Cache-Control: no-store\n/trip/releases/*\n  Cache-Control: public, max-age=31536000, immutable\n/sw.js\n  Cache-Control: no-cache\n';
const MAX_RELEASE_BYTES=5000000;

async function regularFile(root,file){
 const filename=path.join(root,file),info=await fs.lstat(filename);
 if(!info.isFile()||info.isSymbolicLink())throw new Error(`Public input must be a regular file: ${file}`);
 return fs.readFile(filename);
}
function utf8(bytes,label){
 const text=bytes.toString('utf8');
 if(!Buffer.from(text).equals(bytes))throw new Error(`Invalid UTF-8: ${label}`);
 return text;
}
function parseBootstrap(bytes){
 // Parse the one generated assignment as JSON; never execute input JavaScript.
 const match=utf8(bytes,'trip/bootstrap.js').match(/^\s*(?:\/\*[\s\S]*?\*\/\s*)?window\.PARIS_BOOTSTRAP\s*=\s*([\s\S]+);\s*$/);
 if(!match)throw new Error('Bundled bootstrap is not the generated official envelope');
 return JSON.parse(match[1]);
}

async function validateSite({root=PROJECT_ROOT}={}){
 root=path.resolve(root);
 const contents=new Map();
 for(const file of SHELL_FILES)contents.set(file,await regularFile(root,file));
 const manifest=Official.manifest(JSON.parse(utf8(contents.get('trip/manifest.json'),'trip/manifest.json')));
 const entries=await fs.readdir(path.join(root,'trip/releases'),{withFileTypes:true});
 const releases=new Map(),sequences=new Set();
 for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
  if(!entry.isFile()||!/^([a-f0-9]{64})\.json$/.test(entry.name))throw new Error(`Unexpected release entry: ${entry.name}`);
  const file='trip/releases/'+entry.name,bytes=await regularFile(root,file);
  if(bytes.length===0||bytes.length>MAX_RELEASE_BYTES)throw new Error(`Invalid release size: ${file}`);
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  if(entry.name!==sha256+'.json')throw new Error(`Immutable release hash mismatch: ${file}`);
  const data=Official.validate(JSON.parse(utf8(bytes,file)));
  if(sequences.has(data.releaseSequence))throw new Error(`Conflicting retained release sequence: ${data.releaseSequence}`);
  sequences.add(data.releaseSequence);releases.set(file,{data,bytes});contents.set(file,bytes);
 }
 const history=[...releases.values()].sort((a,b)=>a.data.releaseSequence-b.data.releaseSequence);
 for(let i=1;i<history.length;i++)Official.validate(history[i].data,history[i-1].data);
 const activePath=manifest.snapshotUrl.slice(2),active=releases.get(activePath);
 if(!active)throw new Error('Active immutable release is missing');
 if(active.bytes.length!==manifest.byteLength||active.data.tripDataVersion!==manifest.tripDataVersion||active.data.releaseSequence!==manifest.releaseSequence)throw new Error('Active release bytes/version do not match manifest');
 const bootstrap=parseBootstrap(contents.get('trip/bootstrap.js'));
 const bundledManifest=Official.manifest(bootstrap.manifest);
 Official.validate(bootstrap.data);
 if(JSON.stringify(bundledManifest)!==JSON.stringify(manifest)||JSON.stringify(bootstrap.data)!==active.bytes.toString('utf8'))throw new Error('Bundled bootstrap does not match active immutable release');
 const releaseFiles=[...releases.keys()],files=[...SHELL_FILES,...releaseFiles];
 return {root,manifest,releaseFiles,releaseCount:releaseFiles.length,files,contents};
}

async function buildSite({root=PROJECT_ROOT,dest}={}){
 const checked=await validateSite({root});
 dest=path.resolve(dest||path.join(checked.root,'dist'));
 if(checked.files.some(file=>{const source=path.join(checked.root,file);return source===dest||source.startsWith(dest+path.sep);}))throw new Error('Build output cannot replace source inputs');
 // Validate the entire retained set and bootstrap before removing a previous build.
 await fs.rm(dest,{recursive:true,force:true});
 for(const file of checked.files){await fs.mkdir(path.dirname(path.join(dest,file)),{recursive:true});await fs.writeFile(path.join(dest,file),checked.contents.get(file));}
 await fs.writeFile(path.join(dest,'_headers'),HEADERS);
 return {dest,files:[...checked.files,'_headers'],releaseFiles:checked.releaseFiles,releaseCount:checked.releaseCount};
}

module.exports={SHELL_FILES,HEADERS,validateSite,buildSite};
if(require.main===module)buildSite().then(result=>console.log(`Prepared ${result.files.length} public files in dist/, retaining ${result.releaseCount} immutable release(s); no deployment performed.`)).catch(error=>{console.error(error.message);process.exitCode=1;});
