import * as T from 'three';
import {chapters,chapterAt,chapterDistance} from './storybook-chapters.js?v=678b68d9df9d';
import {storybookBeds} from './storybook-landscape.js?v=678b68d9df9d';

export function chapterGroundTexture(city){
 const c=document.createElement('canvas');c.width=c.height=2048;const ctx=c.getContext('2d'),s=2048/304;
 const xy=(x,z)=>[(x+152)*s,(z+152)*s],rgb=Object.fromEntries(chapters.map(a=>[a.id,{base:new T.Color(a.ground).convertLinearToSRGB().toArray(),edge:new T.Color(a.edge).convertLinearToSRGB().toArray()}]));
 const small=document.createElement('canvas');small.width=small.height=512;const sx=small.getContext('2d'),im=sx.createImageData(512,512);
 for(let j=0;j<512;j++)for(let i=0;i<512;i++){
  const x=i/511*304-152,z=j/511*304-152,theme=chapterAt(x,z),h=city.height(x,z),a=1-T.MathUtils.smoothstep(h,city.sea+1,city.sea+4.4),k=(j*512+i)*4;
  for(let v=0;v<3;v++)im.data[k+v]=(rgb[theme.id].base[v]*(1-a)+rgb[theme.id].edge[v]*a)*255;im.data[k+3]=255;
 }
 sx.putImageData(im,0,0);ctx.drawImage(small,0,0,2048,2048);
 let seed=76411;const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 ctx.lineCap=ctx.lineJoin='round';
 for(const a of chapters){
  ctx.save();ctx.beginPath();
  // Clip each material's mark language to its own actual chapter, not a screen overlay.
  for(let z=a.z-a.rz-3;z<=a.z+a.rz+3;z+=2)for(let x=a.x-a.rx-3;x<=a.x+a.rx+3;x+=2)if(chapterDistance(a,x,z)>2){const [u,v]=xy(x,z);ctx.rect(u-s,v-s,s*2.05,s*2.05);}ctx.clip();
  if(a.texture==='stitch'){
   ctx.strokeStyle='#eee0cf58';ctx.lineWidth=.14*s;for(let i=-35;i<35;i+=3){ctx.beginPath();ctx.moveTo(...xy(a.x+i,a.z-35));ctx.lineTo(...xy(a.x+i,a.z+35));ctx.stroke();ctx.beginPath();ctx.moveTo(...xy(a.x-35,a.z+i));ctx.lineTo(...xy(a.x+35,a.z+i));ctx.stroke();}
   ctx.strokeStyle='#776d8e45';for(let i=0;i<220;i++){const x=a.x+(r()-.5)*65,z=a.z+(r()-.5)*60;ctx.beginPath();ctx.moveTo(...xy(x-.2,z-.2));ctx.lineTo(...xy(x+.2,z+.2));ctx.moveTo(...xy(x-.2,z+.2));ctx.lineTo(...xy(x+.2,z-.2));ctx.stroke();}
  }else if(a.texture==='circuit'){
   for(let i=-30;i<31;i+=6){ctx.strokeStyle='#b4d4cb45';ctx.lineWidth=.17*s;ctx.beginPath();ctx.moveTo(...xy(a.x+i,a.z-36));ctx.lineTo(...xy(a.x+i,a.z+36));ctx.stroke();ctx.strokeStyle='#384d7059';ctx.lineWidth=.45*s;ctx.beginPath();ctx.moveTo(...xy(a.x-33,a.z+i));ctx.lineTo(...xy(a.x+33,a.z+i));ctx.stroke();}
  }else if(a.texture==='stars'){
   for(let i=0;i<100;i++){const x=a.x+(r()-.5)*70,z=a.z+(r()-.5)*55,[u,v]=xy(x,z),size=(.17+r()*.3)*s;ctx.strokeStyle=i%3?'#eee1bc8a':'#626f9f5b';ctx.lineWidth=.10*s;ctx.beginPath();ctx.moveTo(u-size,v);ctx.lineTo(u+size,v);ctx.moveTo(u,v-size);ctx.lineTo(u,v+size);ctx.stroke();}
  }else if(a.texture==='scrap'){
   for(let i=0;i<170;i++){const x=a.x+(r()-.5)*65,z=a.z+(r()-.5)*65,[u,v]=xy(x,z);ctx.save();ctx.translate(u,v);ctx.rotate(r()*1.2-.6);ctx.fillStyle=i%3?'#5b655433':'#c19a7e60';ctx.fillRect(-s,-s,(1+r()*3)*s,(.2+r()*.6)*s);ctx.restore();}
  }else{
   ctx.strokeStyle=a.texture==='leaf'?'#305d5a30':'#f3deba27';ctx.lineWidth=.22*s;
   for(let i=0;i<230;i++){const x=a.x+(r()-.5)*(a.rx*2),z=a.z+(r()-.5)*(a.rz*2),[u,v]=xy(x,z);ctx.beginPath();ctx.moveTo(u,v);ctx.quadraticCurveTo(u+1.7*s,v-1.3*s,u+2.1*s,v-.2*s);ctx.stroke();}
  }
  const atlas=city.chapterMaterialAtlas?.image;
  if(atlas){
   const tiles={po:0,garden:1,fabric:2,scrap:3,neon:4,moon:5},tile=tiles[a.id],tw=atlas.width/3,th=atlas.height/2;
   ctx.globalAlpha=a.id==='po'?.30:.52;
   ctx.drawImage(atlas,(tile%3)*tw,Math.floor(tile/3)*th,tw,th,...xy(a.x-a.rx,a.z-a.rz),a.rx*2*s,a.rz*2*s);ctx.globalAlpha=1;
  }
  ctx.restore();
 }
 for(const path of city.paintPaths||city.paths){ctx.strokeStyle='#857f6c';ctx.lineWidth=3.9*s;ctx.beginPath();path.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...xy(p.x,p.z)));ctx.stroke();ctx.strokeStyle='#d6c9aa';ctx.lineWidth=3.2*s;ctx.stroke();}
 function patch(x,z,rx,rz,colour,angle=0){ctx.save();ctx.translate(...xy(x,z));ctx.rotate(angle);ctx.fillStyle=colour;ctx.beginPath();for(let j=0;j<=64;j++){const a=j/64*Math.PI*2,d=1+.035*Math.sin(a*5);ctx[j?'lineTo':'moveTo'](Math.cos(a)*rx*s*d,Math.sin(a)*rz*s*d);}ctx.fill();ctx.restore();}
 patch(0,8,6.3,4.9,'#dfceb1',.12);for(const b of storybookBeds)if(city.height(b.x,b.z)>-3)patch(b.x,b.z,b.rx,b.rz,'#819c86',b.angle);
 const map=new T.CanvasTexture(c);map.flipY=false;map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;return map;
}
