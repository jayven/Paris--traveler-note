'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {checkReleases,verifyRetainedReleases}=require('../scripts/check-releases.cjs');
const ROOT=path.resolve(__dirname,'..');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'paris-pocket-retention-ci-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'trip/releases'),{recursive:true});
 const text=JSON.stringify({synthetic:'first immutable release'}),relative=`trip/releases/${hash(text)}.json`;
 await fs.writeFile(path.join(root,relative),text);
 const git=args=>execFileSync('git',args,{cwd:root,stdio:['ignore','pipe','pipe']});
 git(['init','--quiet']);git(['add','trip/releases']);
 git(['-c','user.name=Paris Pocket synthetic tests','-c','user.email=tests@example.invalid','commit','--quiet','-m','Synthetic release baseline']);
 return {root,text,relative};
}
test('retention check allows additional releases and retains previous bytes without building',async t=>{
 const {root,text,relative}=await fixture(t);
 const next=JSON.stringify({synthetic:'second immutable release'});
 await fs.writeFile(path.join(root,`trip/releases/${hash(next)}.json`),next);
 const result=await verifyRetainedReleases({root,baseRef:'HEAD'});
 assert.equal(result.retainedFromBase,1);assert.equal(await fs.readFile(path.join(root,relative),'utf8'),text);
 assert.equal(await fs.stat(path.join(root,'dist')).then(()=>true,()=>false),false);
});
test('retention check rejects deleted previously retained releases',async t=>{
 const {root,relative}=await fixture(t);await fs.rm(path.join(root,relative));
 await assert.rejects(verifyRetainedReleases({root,baseRef:'HEAD'}),/immutable release is missing/);
});
test('retention check rejects changed bytes and renamed hash releases',async t=>{
 const {root,relative}=await fixture(t);const changed='{"synthetic":"tampered bytes"}';
 await fs.writeFile(path.join(root,relative),changed);
 await assert.rejects(verifyRetainedReleases({root,baseRef:'HEAD'}),/immutable release was modified/);
 await fs.rename(path.join(root,relative),path.join(root,`trip/releases/${hash(changed)}.json`));
 await assert.rejects(verifyRetainedReleases({root,baseRef:'HEAD'}),/immutable release is missing/);
});
test('retention check fails closed for absent or invalid Git bases',async t=>{
 const {root}=await fixture(t);
 for(const baseRef of ['',undefined,'--help','HEAD~1','not-a-real-ref'])await assert.rejects(verifyRetainedReleases({root,baseRef}),/base|resolve/);
});
test('current official release checks are read-only and do not require Git history',async()=>{
 const before=await fs.readFile(path.join(ROOT,'trip/manifest.json'));
 const result=await checkReleases({root:ROOT});
 assert.ok(result.releaseCount>=1);assert.equal(result.retainedFromBase,null);
 assert.deepEqual(await fs.readFile(path.join(ROOT,'trip/manifest.json')),before);
});
