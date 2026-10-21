import * as T from 'three';
import * as visionArt from './portrait-system-v62.js?v=ebada2d6e6f2';
import {ABSTRACT_PRESETS,abstractStyleForWork,abstractPreset,buildAbstractWork,paintAbstractRows} from './portrait-abstract-v60.js?v=ebada2d6e6f2';
import {styleForWork,stylePortraitRows,PORTRAIT_STYLE_PRESETS} from './portrait-style-rules.js?v=ebada2d6e6f2';
import {IMPASTO_PRESETS,impastoStyleForWork,buildImpastoWork,paintImpastoRows} from './portrait-impasto-rules.js?v=ebada2d6e6f2';

// One capture target, one live canvas texture, and one worker shared by all 100
// style rules. A finished work is rendered once, then revealed by paint impacts.
export function createSpitPortraitPaper(renderer,scene,actor,{width:w,height:h,captureLayer=1,showLabel=true,profile='legacy'},paper){
 const vision=profile==='vision',abstract=profile==='abstract'||vision,artAPI=vision?visionArt:{ABSTRACT_PRESETS,abstractStyleForWork,abstractPreset,buildAbstractWork,paintAbstractRows},impasto=profile==='impasto'||abstract,presets=abstract?artAPI.ABSTRACT_PRESETS:impasto?IMPASTO_PRESETS:PORTRAIT_STYLE_PRESETS,chooseStyle=abstract?((s,n,f)=>artAPI.abstractStyleForWork(s,n,f,actor.art)):impasto?impastoStyleForWork:styleForWork;
 const ctx=paper.getContext('2d'),image=document.createElement('canvas'),mask=document.createElement('canvas'),layer=document.createElement('canvas');
 for(const c of [image,mask,layer]){c.width=w;c.height=h;}
 const im=image.getContext('2d'),m=mask.getContext('2d'),l=layer.getContext('2d');
 const texture=new T.CanvasTexture(paper);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const rt=new T.WebGLRenderTarget(w,h,{type:T.UnsignedByteType,depthBuffer:true});rt.texture.colorSpace=T.SRGBColorSpace;
 const camera=new T.PerspectiveCamera(26,w/h,.05,40);camera.layers.set(captureLayer);
 const subject=new T.Vector3(),eye=new T.Vector3(),pixels=new Uint8Array(w*h*4);
 const seedBuffer=new Uint32Array(1);crypto.getRandomValues(seedBuffer);const seed=seedBuffer[0],fixedParam=new URLSearchParams(location.search).get('art');
 const fixed=fixedParam===null?undefined:Number(fixedParam);
 let serial=-1,job=0,ready=false,captures=0,progress=0,impactCount=0,style=chooseStyle(seed,0,fixed),artSeed=seed,worker=null,lastError=null,markCount=0,guideCells=0,workRecipe=null;
 let pendingRaw=null;const callbacks=new Map();
 const label=document.createElement('span');label.className='art-style';if(showLabel)document.querySelector('.art-card')?.append(label);
 function styleLabel(){label.textContent=`${String(style.id+1).padStart(3,'0')} / ${style.name}`;}
 try{const url=vision?new URL('./portrait-vision-worker-v62.js?v=ebada2d6e6f2',import.meta.url):abstract?new URL('./portrait-abstract-worker-v60.js?v=ebada2d6e6f2',import.meta.url):impasto?new URL('./portrait-impasto-worker.js?v=ebada2d6e6f2',import.meta.url):new URL('./portrait-style-worker.js?v=ebada2d6e6f2',import.meta.url);worker=new Worker(url,{type:'module'});}catch{worker=null;}
 if(worker){worker.onmessage=({data:d})=>{const done=callbacks.get(d.job);callbacks.delete(d.job);if(d.job!==job)return;if(d.error){if(impasto){worker.terminate();worker=null;}fallback(d.job,pendingRaw).catch(e=>{lastError=String(e);});return;}markCount=d.marks||0;guideCells=d.guideCells||0;done?.(new Uint8ClampedArray(d.pixels),d.work||null);};worker.onerror=()=>{worker.terminate();worker=null;if(pendingRaw)fallback(job,pendingRaw).catch(e=>{lastError=String(e);});};}
 function compose(){
  ctx.fillStyle=style.paper;ctx.fillRect(0,0,w,h);
  if(ready){l.clearRect(0,0,w,h);l.globalCompositeOperation='source-over';l.drawImage(image,0,0);l.globalCompositeOperation='destination-in';l.drawImage(mask,0,0);l.globalCompositeOperation='source-over';ctx.drawImage(layer,0,0);if(progress>=.995)ctx.drawImage(image,0,0);}
  texture.needsUpdate=true;
 }
 function receive(id,data,recipe=null){if(id!==job)return;workRecipe=recipe;im.putImageData(new ImageData(data,w,h),0,0);ready=true;pendingRaw=null;if(progress>.12)impact(.5,.52,.26);compose();}
 async function fallback(id,raw){
  if(!raw||id!==job)return;
  if(impasto){const work=(abstract?artAPI.buildAbstractWork:buildImpastoWork)(raw,w,h,style,artSeed),it=(abstract?artAPI.paintAbstractRows:paintImpastoRows)(im,work,w,h);let next;do{next=it.next();if(!next.done)await new Promise(requestAnimationFrame);}while(!next.done&&id===job);if(id!==job){it.return();return;}if(id===job){markCount=work.marks.length;guideCells=work.guideCells;receive(id,im.getImageData(0,0,w,h).data,work);}return;}
  const it=stylePortraitRows(raw,w,h,style,artSeed);let next;
  do{next=it.next();if(!next.done)await new Promise(requestAnimationFrame);}while(!next.done&&id===job);
  if(id===job&&next.done)receive(id,next.value);
 }
 function clear(){job++;ready=false;workRecipe=null;progress=0;impactCount=0;m.clearRect(0,0,w,h);compose();}
 async function capture({preserveStyle=false,presetId}={}){
  if(!preserveStyle){style=chooseStyle(seed,++serial,fixed);artSeed=(seed^Math.imul(serial+1,1597334677))>>>0;}
  if(Number.isInteger(presetId))style=abstract?artAPI.abstractPreset(presetId,actor.art):presets[((presetId%100)+100)%100];
  const id=++job;ready=false;impactCount=0;progress=preserveStyle?progress:0;m.clearRect(0,0,w,h);styleLabel();compose();
  actor.root.updateMatrixWorld(true);subject.copy(actor.root.position);subject.y+=actor.height*.52;
  eye.set(1,0,0).applyAxisAngle(T.Object3D.DEFAULT_UP,actor.root.rotation.y).multiplyScalar(actor.height*3.15).add(subject);eye.y+=actor.height*.08;camera.position.copy(eye);camera.lookAt(subject);camera.updateMatrixWorld(true);
  const oldTarget=renderer.getRenderTarget(),background=scene.background,fog=scene.fog,auto=renderer.shadowMap.autoUpdate,shadowUpdate=renderer.shadowMap.needsUpdate,clearColour=renderer.getClearColor(new T.Color()),clearAlpha=renderer.getClearAlpha(),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),scissorTest=renderer.getScissorTest();
  let read;
  try{scene.background=null;scene.fog=null;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.setClearColor(0,0);renderer.setRenderTarget(rt);renderer.setViewport(0,0,w,h);renderer.setScissorTest(false);renderer.clear();renderer.render(scene,camera);if(renderer.readRenderTargetPixelsAsync)read=renderer.readRenderTargetPixelsAsync(rt,0,0,w,h,pixels);else renderer.readRenderTargetPixels(rt,0,0,w,h,pixels);}
  finally{renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.setClearColor(clearColour,clearAlpha);renderer.shadowMap.autoUpdate=auto;renderer.shadowMap.needsUpdate=shadowUpdate;scene.background=background;scene.fog=fog;}
  try{if(read)await read;}catch(e){lastError=String(e);return;}if(id!==job)return;
  const raw=new Uint8ClampedArray(pixels);pendingRaw=raw;captures++;callbacks.clear();
  if(worker){callbacks.set(id,(data,recipe)=>receive(id,data,recipe));const copy=raw.slice();worker.postMessage({job:id,pixels:copy.buffer,width:w,height:h,style:style.id,seed:artSeed,art:actor.art},[copy.buffer]);}
  else fallback(id,raw).catch(e=>{lastError=String(e);});
 }
 function impact(u,v,power=.23){
  if(!ready)return;impactCount++;m.fillStyle='white';m.beginPath();const radius=w*power;
  for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,rr=radius*(.87+.13*Math.sin(i*2.41+artSeed%73));m[i?'lineTo':'moveTo'](u*w+Math.cos(a)*rr,v*h+Math.sin(a)*rr);}m.fill();
  for(let i=0;i<9;i++){const a=i*2.4+artSeed%31,rr=radius*(1.1+(i%3)*.13);m.beginPath();m.arc(u*w+Math.cos(a)*rr,v*h+Math.sin(a)*rr,2+i%4*1.2,0,Math.PI*2);m.fill();}
  compose();
 }
 function update(p){const finishedBefore=progress>=.995;progress=p;if(ready&&p>=.995&&!finishedBefore)compose();}
 function nextTarget(index){if(vision&&workRecipe?.impactAnchors?.length)return workRecipe.impactAnchors[index%workRecipe.impactAnchors.length].point;const marks=[[.50,.27],[.41,.54],[.58,.72],[.41,.80],[.62,.43],[.50,.58],[.49,.36]];return marks[index%marks.length];}
 clear();styleLabel();
 return {texture,capture,setActor(a){actor=a;},clear,update,impact,nextTarget,get work(){return ready&&progress>=.995?workRecipe:null;},get captures(){return captures;},get ready(){return ready;},get style(){return {...style,profile,seed:artSeed,serial,impactCount,presetCount:presets.length,worker:!!worker,error:lastError,markCount,guideCells,resolution:[w,h],vision:workRecipe?.vision?.rule||null,splatters:workRecipe?.splatterCount||0,graph:workRecipe?.pipeline?.id||null,subjectSignature:workRecipe?.subject?.signature||null,nodeCount:workRecipe?.pipeline?.trace?.length||0};},dispose(){worker?.terminate();texture.dispose();rt.dispose();}};
}
