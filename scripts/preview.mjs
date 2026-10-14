import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,'../site'));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.hdr':'application/octet-stream','.bin':'application/octet-stream','.wasm':'application/wasm'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/Posmos'){res.writeHead(302,{Location:'/Posmos/'});res.end();return;}
  if(!url.pathname.startsWith('/Posmos/'))throw Error('Not found');
  const file=path.resolve(root,decodeURIComponent(url.pathname.slice(8))||'index.html');
  if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(4181,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4181/Posmos/'));
