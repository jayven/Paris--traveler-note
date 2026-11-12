const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const crypto=require('node:crypto');
const Official=require('../official-data.js');
const {SHELL_FILES,validateSite,buildSite}=require('../scripts/build-site.cjs');
const PROJECT_ROOT=path.resolve(__dirname,'..');
const clone=value=>JSON.parse(JSON.stringify(value));

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'paris-pocket-release-test-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const file of SHELL_FILES){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.copyFile(path.join(PROJECT_ROOT,file),path.join(root,file));}
 const manifest=JSON.parse(await fs.readFile(path.join(root,'trip/manifest.json'),'utf8'));
 const file=manifest.snapshotUrl.slice(2);await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.copyFile(path.join(PROJECT_ROOT,file),path.join(root,file));
 return {root,dest:path.join(root,'dist'),manifest,data:JSON.parse(await fs.readFile(path.join(root,file),'utf8'))};
}
async function release(root,source,sequence){
 const data=clone(source);data.releaseSequence=sequence;data.tripDataVersion=`4.12.test-${sequence}`;data.segments.forEach(segment=>segment.routeDataVersion=data.tripDataVersion);
 Official.validate(data);
 const text=JSON.stringify(data),sha256=crypto.createHash('sha256').update(text).digest('hex');
 const manifest=Official.manifest({schemaVersion:1,tripId:data.tripId,tripDataVersion:data.tripDataVersion,releaseSequence:data.releaseSequence,snapshotUrl:`./trip/releases/${sha256}.json`,sha256,byteLength:Buffer.byteLength(text)});
 await fs.writeFile(path.join(root,manifest.snapshotUrl.slice(2)),text);
 await fs.writeFile(path.join(root,'trip/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await fs.writeFile(path.join(root,'trip/bootstrap.js'),'/* Bundled last-resort official snapshot; public data only. */\nwindow.PARIS_BOOTSTRAP='+JSON.stringify({manifest,data})+';\n');
 return {data,manifest,text};
}
async function filesIn(root){const names=await fs.readdir(root,{recursive:true});const result=[];for(const name of names)if((await fs.stat(path.join(root,name))).isFile())result.push(name);return result.sort();}
async function serve(t,root){
 const server=http.createServer(async(req,res)=>{
  try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.writeHead(200,{'Content-Type':'application/json','Connection':'close'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 return pathname=>new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port:server.address().port,path:pathname,agent:false},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8')}));}).on('error',reject);});
}

test('public build keeps the fixed allowlist, complete shell and all retained immutable releases',async t=>{
 const {root,dest,data}=await fixture(t);
 await fs.mkdir(path.join(root,'docs'),{recursive:true});await fs.writeFile(path.join(root,'docs/synthetic-private-backup.json'),'not a public build input');await fs.writeFile(path.join(root,'.synthetic-private.json'),'not a public build input');
 await release(root,data,data.releaseSequence+1);
 const result=await buildSite({root});assert.equal(result.releaseCount,2);
 const files=await filesIn(dest);
 assert.ok(!files.some(name=>/^(docs|tests|scripts|node_modules)\//.test(name)));
 assert.ok(!files.some(name=>name.startsWith('.')||/backup|\.pdf$|\.zip$/.test(name)));
 const sw=await fs.readFile(path.join(dest,'sw.js'),'utf8'),core=sw.match(/const CORE=\[([^\]]+)\]/)[1].match(/'[^']+'/g).map(s=>s.slice(1,-1));
 for(const file of core)await fs.access(path.join(dest,file==='./'?'index.html':file));
 assert.deepEqual(files.filter(file=>file.startsWith('trip/releases/')),result.releaseFiles.slice().sort());
 assert.match(await fs.readFile(path.join(dest,'_headers'),'utf8'),/\/trip\/releases\/\*\n  Cache-Control: public, max-age=31536000, immutable/);
});

test('three sequential deployments keep old URLs downloadable and a higher-sequence rollback compatible',async t=>{
 const {root,dest,manifest,data}=await fixture(t),initialText=await fs.readFile(path.join(root,manifest.snapshotUrl.slice(2)),'utf8');
 await buildSite({root});const get=await serve(t,dest);
 const old={data,manifest,text:initialText},releases=[old];
 for(const sequence of [manifest.releaseSequence+1,manifest.releaseSequence+2]){
  const changed=clone(data);changed.activities[0].title=`Synthetic review revision ${sequence}`;
  const next=await release(root,changed,sequence);releases.push(next);
  const built=await buildSite({root});assert.equal(built.releaseCount,releases.length);
  for(const previous of releases){const fetched=await get('/'+previous.manifest.snapshotUrl.slice(2));assert.equal(fetched.status,200);assert.equal(fetched.text,previous.text,'old immutable URLs remain byte-for-byte unchanged');Official.validate(JSON.parse(fetched.text));}
 }
 // A remote rollback is a new publication sequence carrying reviewed prior content.
 const rollback=await release(root,old.data,manifest.releaseSequence+3);releases.push(rollback);await buildSite({root});
 global.ParisOfficial=Official;const Store=require('../local-store.js');
 const downloaded=await get('/'+rollback.manifest.snapshotUrl.slice(2));
 const checked=await Store.checkEnvelope({manifest:rollback.manifest,text:downloaded.text},releases[2].data);
 assert.equal(checked.data.releaseSequence,manifest.releaseSequence+3);assert.equal(checked.data.activities[0].title,old.data.activities[0].title);
 assert.equal((await get('/'+old.manifest.snapshotUrl.slice(2))).text,initialText,'a legacy client with the original manifest can still fetch its release after rollback');
 assert.deepEqual((await filesIn(dest)).filter(file=>file.startsWith('trip/releases/')),releases.map(item=>item.manifest.snapshotUrl.slice(2)).sort());
});

test('missing active release, tampered historical bytes and inconsistent bootstrap fail before replacing dist',async t=>{
 for(const scenario of ['missing-active','tampered-history','bootstrap-mismatch','manifest-version-mismatch']){
  await t.test(scenario,async t=>{
   const {root,dest,manifest,data}=await fixture(t);await release(root,data,data.releaseSequence+1);await buildSite({root});
   const marker=path.join(dest,'last-successful-build.txt');await fs.writeFile(marker,'keep this working output');
   if(scenario==='missing-active'){const active=JSON.parse(await fs.readFile(path.join(root,'trip/manifest.json'),'utf8'));await fs.rm(path.join(root,active.snapshotUrl.slice(2)));}
   if(scenario==='tampered-history')await fs.appendFile(path.join(root,manifest.snapshotUrl.slice(2)),' ');
   if(scenario==='bootstrap-mismatch')await fs.writeFile(path.join(root,'trip/bootstrap.js'),'window.PARIS_BOOTSTRAP='+JSON.stringify({manifest,data})+';\n');
   if(scenario==='manifest-version-mismatch'){const active=JSON.parse(await fs.readFile(path.join(root,'trip/manifest.json'),'utf8'));active.tripDataVersion='incorrect';await fs.writeFile(path.join(root,'trip/manifest.json'),JSON.stringify(active));}
   await assert.rejects(buildSite({root}));assert.equal(await fs.readFile(marker,'utf8'),'keep this working output');
  });
 }
});

test('release allowlist rejects unexpected entries, invalid trip/schema and colliding publication sequences',async t=>{
 for(const scenario of ['unexpected-name','directory','symlink','wrong-trip','future-schema','duplicate-sequence']){
  await t.test(scenario,async t=>{
   const {root,manifest,data}=await fixture(t);const directory=path.join(root,'trip/releases');
   if(scenario==='unexpected-name')await fs.writeFile(path.join(directory,'notes.json'),'{}');
   if(scenario==='directory')await fs.mkdir(path.join(directory,'a'.repeat(64)+'.json'));
   if(scenario==='symlink')await fs.symlink(path.join(root,manifest.snapshotUrl.slice(2)),path.join(directory,'a'.repeat(64)+'.json'));
   if(['wrong-trip','future-schema','duplicate-sequence'].includes(scenario)){
    const bad=clone(data);if(scenario==='wrong-trip')bad.tripId='another-trip';if(scenario==='future-schema')bad.schemaVersion=2;if(scenario==='duplicate-sequence')bad.activities[0].title='Synthetic conflicting content';
    const text=JSON.stringify(bad),hash=crypto.createHash('sha256').update(text).digest('hex');await fs.writeFile(path.join(directory,hash+'.json'),text);
   }
   await assert.rejects(validateSite({root}));
  });
 }
});

test('later publications cannot silently drop a known task from retained release history',async t=>{
 const {root,data}=await fixture(t),next=clone(data),task=next.tasks.find(t=>!next.activities.some(a=>a.taskIds.includes(t.id)));
 // Keep all ordinary shape/references valid: only historical task identity is missing.
 const target=task||next.tasks[0];next.tasks=next.tasks.filter(t=>t.id!==target.id);
 next.activities.forEach(a=>{a.taskIds=a.taskIds.filter(id=>id!==target.id);});
 await release(root,next,data.releaseSequence+1);
 await assert.rejects(buildSite({root}),/必须显式归档/);
 target.status='archived';target.archiveReason='Synthetic cancellation retaining its published identity';next.tasks.push(target);
 await release(root,next,data.releaseSequence+2);
 // Remove the intentionally invalid unpublished fixture; published originals remain.
 const badFiles=await fs.readdir(path.join(root,'trip/releases'));
 for(const name of badFiles){const file=path.join(root,'trip/releases',name),snapshot=JSON.parse(await fs.readFile(file,'utf8'));if(snapshot.releaseSequence===data.releaseSequence+1)await fs.rm(file);}
 assert.equal((await buildSite({root})).releaseCount,2);
});
