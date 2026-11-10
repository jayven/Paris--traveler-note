/* Read-only release checks for local review and PR CI. No build, fetch or deployment. */
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const PROJECT_ROOT=path.resolve(__dirname,'..');
const HASH_RELEASE=/^trip\/releases\/[a-f0-9]{64}\.json$/;

function git(root,args,encoding){
 return execFileSync('git',args,{cwd:root,encoding,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
}
async function verifyRetainedReleases({root=PROJECT_ROOT,baseRef}={}){
 if(typeof baseRef!=='string'||!baseRef||!/^[a-zA-Z0-9][a-zA-Z0-9./_-]{0,199}$/.test(baseRef))throw new Error('A valid Git base commit or ref is required');
 let commit;
 try{commit=git(root,['rev-parse','--verify',`${baseRef}^{commit}`],'utf8').trim();}
 catch{throw new Error(`Cannot resolve release retention base: ${baseRef}`);}
 const names=git(root,['ls-tree','-r','--name-only','-z',commit,'--','trip/releases'],'utf8').split('\0').filter(name=>HASH_RELEASE.test(name));
 for(const name of names){
  const original=git(root,['show',`${commit}:${name}`]);
  let current;
  try{current=await fs.readFile(path.join(root,name));}
  catch{throw new Error(`Previously retained immutable release is missing: ${name}`);}
  if(!original.equals(current))throw new Error(`Previously retained immutable release was modified: ${name}`);
 }
 return {baseCommit:commit,retainedFromBase:names.length};
}
async function checkReleases({root=PROJECT_ROOT,baseRef}={}){
 // The builder shares this read-only validator; checking does not repair bad generated files.
 const {validateSite}=require('./build-site.cjs');
 const result=await validateSite({root});
 const retention=baseRef?await verifyRetainedReleases({root,baseRef}):{retainedFromBase:null};
 return {activeHash:result.manifest.sha256,releaseCount:result.releaseCount,...retention};
}
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length&&!(args.length===2&&args[0]==='--base-ref')){
  console.error('Usage: node scripts/check-releases.cjs [--base-ref COMMIT_OR_REF]');process.exitCode=1;
 }else checkReleases({baseRef:args[1]}).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={checkReleases,verifyRetainedReleases};
