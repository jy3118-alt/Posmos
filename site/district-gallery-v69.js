import * as T from 'three';
import {yieldTask} from './runtime-budget-v69.js?v=4baf9416a5b8';
import {CHARACTER_ART} from './character-art.js?v=4baf9416a5b8';
import {abstractPreset,buildAbstractWork,renderAbstract,paintAbstractRows,exportArtworkSVG} from './portrait-system-v62.js?v=4baf9416a5b8';

// Three live works plus three fixed hidden Po studies. Undiscovered studies do
// not appear through the gallery arrows: they must be found in the landscape.
export async function makeDistrictGallery(atlas){
 const width=512,height=640,entries=[],dialog=document.querySelector('#artwork'),display=dialog.querySelector('canvas'),ctx=display.getContext('2d'),title=dialog.querySelector('h2'),caption=dialog.querySelector('p');
 display.width=width;display.height=height;let selected=0,completed=0,returnFocus=null,current=null,busy=false,downloadURL=null;
 const png=dialog.querySelector('[data-save-png]'),svg=dialog.querySelector('[data-save-svg]'),status=dialog.querySelector('.export-status'),download=dialog.querySelector('[data-download]');
 function releaseDownload(){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;download.hidden=true;download.removeAttribute('href');}
 function saveBlob(blob,filename){releaseDownload();downloadURL=URL.createObjectURL(blob);download.href=downloadURL;download.download=filename;download.textContent='파일 다시 저장';download.hidden=false;download.click();dialog.dataset.export=JSON.stringify({filename,bytes:blob.size,type:blob.type,seed:current.work.seed,method:'normalized-path-replay'});}
 function filename(extension){return `posmos-${current.work.modelId}-${current.work.seed.toString(16)}-${current.work.preset}.${extension}`;}
 function buttons(){png.disabled=svg.disabled=busy||!current?.work;}
 png.addEventListener('click',async()=>{
  if(busy||!current?.work)return;busy=true;buttons();const work=current.work,size=Number(dialog.querySelector('[data-export-size]').value);status.textContent='큰 크기로 작품을 다시 그리는 중…';
  try{
   let blob;const supported=typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined';
   if(supported)try{blob=await new Promise((resolve,reject)=>{const worker=new Worker(new URL('./art-export-worker-v62.js?v=4baf9416a5b8',import.meta.url),{type:'module'}),timeout=setTimeout(()=>{worker.terminate();reject(Error('저장 시간이 초과되었습니다.'));},90000);const stop=()=>{clearTimeout(timeout);worker.terminate();};worker.onmessage=({data:d})=>{stop();d.error?reject(Error(d.error)):resolve(d.blob);};worker.onerror=()=>{stop();reject(Error('작품 저장을 다시 시도합니다.'));};worker.postMessage({work,width:size,height:size*1.25});});}catch{blob=null;}
   if(!blob){const c=document.createElement('canvas');c.width=size;c.height=size*1.25;try{for(const _ of paintAbstractRows(c.getContext('2d'),work,c.width,c.height))await new Promise(requestAnimationFrame);blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('메모리가 부족합니다. 2048 크기 또는 SVG로 저장해 주세요.')),'image/png'));}finally{c.width=c.height=1;}}
   saveBlob(blob,filename('png'));status.textContent=`${size} × ${size*1.25} PNG · 원본 선과 물감 자국으로 저장`;
   dialog.dataset.exportSize=JSON.stringify([size,size*1.25]);
  }catch(error){status.textContent=error.message;}finally{busy=false;buttons();}
 });
 svg.addEventListener('click',()=>{if(busy||!current?.work)return;saveBlob(new Blob([exportArtworkSVG(current.work,current.title)],{type:'image/svg+xml;charset=utf-8'}),filename('svg'));status.textContent='크기에 제한 없이 확대할 수 있는 SVG';});
 const names={po:'Po',base:'Po',ribbon:'리본 Po',crown:'왕관 Po',dress:'드레스 Po',moa:'Moa'};
 for(let i=0;i<6;i++){await yieldTask();
  const guide=document.createElement('canvas');guide.width=width;guide.height=height;const x=guide.getContext('2d');
  // Existing character stencils seed earlier sketches. Actual new works use a
  // fresh capture of the encountered model, never this startup stencil.
  const sw=atlas.image.width/2,sh=atlas.image.height/2;x.translate(0,height);x.scale(1,-1);
  const stencil=i%3;x.drawImage(atlas.image,(stencil%2)*sw,Math.floor(stencil/2)*sh,sw,sh,40,30,width-80,height-60);
  const key=['base','crown','ribbon'][i%3],art={...CHARACTER_ART[key],id:key},work=buildAbstractWork(x.getImageData(0,0,width,height).data,width,height,abstractPreset(17+i*31,art),59001+i*932);
  guide.width=guide.height=1;work.origin=work.observation.origin='stencil-study';const image=document.createElement('canvas');image.width=width;image.height=height;renderAbstract(image.getContext('2d'),work,width,height);
  const map=new T.CanvasTexture(image);map.colorSpace=T.SRGBColorSpace;map.flipY=false;map.anisotropy=4;
  entries.push({map,work,mesh:null,hidden:i>=3,discovered:i<3,title:i<3?'Po의 습작 '+(i+1):['나무 사이의 얼굴','호수에 떨어진 시선','먼 섬의 친구'][i-3],caption:'Po · 친구의 형태를 색과 물감 자국으로 해석한 그림',number:null});
 }
 function draw(entry){current=entry;releaseDownload();status.textContent=entry.work?'PNG · 고해상도 / SVG · 자유로운 크기':'완성된 뒤에 작품을 저장할 수 있어요';buttons();ctx.clearRect(0,0,width,height);ctx.drawImage(entry.map?.image||entry.image,0,0,width,height);title.textContent=entry.title;caption.textContent=entry.caption;dialog.dataset.work=entry.number===null?'study':String(entry.number);dialog.dataset.recipe=entry.work?JSON.stringify({seed:entry.work.seed,preset:entry.work.preset,model:entry.work.modelId,vision:entry.work.vision.rule,splatters:entry.work.splatterCount}):'';}
 function open(index){selected=(index+entries.length)%entries.length;entries[selected].discovered=true;draw(entries[selected]);returnFocus=document.activeElement;if(!dialog.open)dialog.showModal();dialog.querySelector('[data-close]').focus();}
 function close(){dialog.close();returnFocus?.focus?.();}
 dialog.querySelector('[data-close]').addEventListener('click',close);
 function step(direction){if(busy)return;do{selected=(selected+direction+entries.length)%entries.length;}while(!entries[selected].discovered);draw(entries[selected]);}
 dialog.querySelector('[data-previous]').addEventListener('click',()=>step(-1));
 dialog.querySelector('[data-next]').addEventListener('click',()=>step(1));
 dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
 function infoText(info){const model=info?.model?.skin||info?.model,painter=info?.painter?.skin||info?.painter;return `${info?.painterLabel||CHARACTER_ART[painter]?.label||names[painter]||'Po'}가 그린 ${info?.modelLabel||CHARACTER_ART[model]?.label||names[model]||'친구'} · 친구의 색`;}
 return {entries,get open(){return dialog.open;},show:open,get works(){return entries.filter(e=>e.work).map(e=>e.work);},
  showLive(image,info,work){draw({image,work,title:'방금 그린 친구',caption:infoText(info),number:completed+1});returnFocus=document.activeElement;dialog.showModal();dialog.querySelector('[data-close]').focus();},
  complete(image,info,work){const entry=entries[completed%3];entry.map.image.getContext('2d').drawImage(image,0,0,width,height);entry.map.needsUpdate=true;entry.work=work?structuredClone(work):null;completed++;entry.title='만남의 그림 '+String(completed).padStart(2,'0');entry.caption=infoText(info);entry.number=completed;const state=document.querySelector('#painting-recipes');if(state&&new URLSearchParams(location.search).get('inspect')==='1')state.textContent=JSON.stringify(entries.filter(e=>e.work).map(e=>e.work));return completed;},
  diagnostics(){return {capacity:3,hidden:3,found:entries.filter(e=>e.hidden&&e.discovered).length,completed,resolution:[width,height],exportResolution:[4096,5120],exportMethod:'normalized-path-replay',vision:'observed-dual-gaze-v2',recipes:entries.map(e=>({hidden:e.hidden,discovered:e.discovered,number:e.number,model:e.work?.modelId,seed:e.work?.seed,signature:e.work?.subject?.signature,nodes:e.work?.pipeline?.trace?.length||0,splatters:e.work?.splatterCount||0})),open:dialog.open};}
 };
}
