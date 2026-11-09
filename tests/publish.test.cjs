const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('public build uses a fixed allowlist, complete shell and only the manifest-selected release',()=>{
 execFileSync(process.execPath,['scripts/build-site.cjs'],{cwd:root});
 const dest=path.join(root,'dist'),files=fs.readdirSync(dest,{recursive:true}).filter(name=>fs.statSync(path.join(dest,name)).isFile());
 assert.ok(!files.some(name=>/^(docs|tests|scripts|node_modules)\//.test(name)));
 assert.ok(!files.some(name=>name.startsWith('.')||/backup|\.pdf$|\.zip$/.test(name)));
 const sw=fs.readFileSync(path.join(dest,'sw.js'),'utf8'),core=sw.match(/const CORE=\[([^\]]+)\]/)[1].match(/'[^']+'/g).map(s=>s.slice(1,-1));
 for(const file of core)assert.ok(fs.existsSync(path.join(dest,file==='./'?'index.html':file)),file);
 const manifest=JSON.parse(fs.readFileSync(path.join(dest,'trip/manifest.json')));
 assert.deepEqual(files.filter(file=>file.startsWith('trip/releases/')),[`trip/releases/${manifest.sha256}.json`]);
});
