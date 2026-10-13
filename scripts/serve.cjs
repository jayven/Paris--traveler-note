const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const port = Number(process.env.PORT || 4173);
http.createServer((req,res)=>{
 let pathname;
 try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
 const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
 const filename = path.resolve(root,relative);
 if (!filename.startsWith(root+path.sep) || relative.split('/').some(part=>part.startsWith('.'))) {res.writeHead(403).end();return;}
 fs.readFile(filename,(err,data)=>{
  if(err){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
 });
}).listen(port,'0.0.0.0',()=>console.log(`Paris Pocket: http://localhost:${port} (phone preview: computer LAN IP, same port)`));
