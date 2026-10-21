// Feature/device hints select resource budgets, never population or animation FPS.
export function chooseBudget({search='',coarse=false,touch=0,memory=8,mobileUA=false,recovery=false}={}){
 const query=new URLSearchParams(search),mobile=query.get('profile')==='mobile'||coarse||mobileUA||touch>1||memory<=4||recovery;
 return Object.freeze({mobile,inspect:query.get('inspect')==='1',pixelLimit:mobile?1000000:2400000,dpr:mobile?1.4:1.6,antialias:!mobile,shadowSize:mobile?1024:2048,depthSize:mobile?768:1536,transmission:!mobile,loadConcurrency:mobile?1:3,treeNear:mobile?70:100,treeFar:mobile?88:122});
}
let loadingChannel=null;const pendingTasks=[];
export function yieldTask(){
 // Timers in a background tab can be clamped to one second *per loading step*.
 // A posted task still yields to input/paint without multiplying that delay.
 if(typeof window==='undefined'||typeof MessageChannel==='undefined')return new Promise(resolve=>setTimeout(resolve,0));
 if(!loadingChannel){loadingChannel=new MessageChannel();loadingChannel.port1.onmessage=()=>pendingTasks.shift()?.();}
 return new Promise(resolve=>{pendingTasks.push(resolve);loadingChannel.port2.postMessage(0);});
}
export function queuedLoader(operation,limit=2){
 const cache=new Map(),waiting=[];let active=0,peak=0;
 function drain(){while(active<limit&&waiting.length){const job=waiting.shift();active++;peak=Math.max(peak,active);Promise.resolve().then(()=>operation(job.file)).then(job.resolve,job.reject).finally(()=>{active--;yieldTask().then(drain);});}}
 const load=file=>{if(!cache.has(file))cache.set(file,new Promise((resolve,reject)=>{waiting.push({file,resolve,reject});drain();}).catch(e=>{cache.delete(file);throw e;}));return cache.get(file);};
 load.forget=file=>cache.delete(file);load.stats=()=>({limit,peak,active,queued:waiting.length,cached:cache.size});return load;
}
export async function fetchResource(file,kind='json'){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
 try{const response=await fetch(file,{signal:controller.signal});if(!response.ok)throw Error(`파일을 불러오지 못했어요 (${response.status}). 인터넷 연결을 확인해 주세요.`);return await response[kind]();}finally{clearTimeout(timer);}
}
export const checkedJSON=file=>fetchResource(file);
export async function loadModel(loader,file){
 loader.manager.itemStart(file);
 try{const bytes=await fetchResource(file,'arrayBuffer');return await loader.parseAsync(bytes,file.slice(0,file.lastIndexOf('/')+1));}catch(error){loader.manager.itemError(file);throw error;}finally{loader.manager.itemEnd(file);}
}
export function recoveryState(){try{return sessionStorage.getItem('posmos-resource-recovery')==='1';}catch{return false;}}
export function installRecovery(canvas){
 let lost=false;
 const notice=document.querySelector('#notice');
 function show(message){if(!notice)return;notice.replaceChildren(document.createTextNode(message+' '));const button=document.createElement('button');button.type='button';button.textContent='다시 열기';button.onclick=()=>{try{sessionStorage.setItem('posmos-resource-recovery','1');}catch{}location.reload();};notice.append(button);notice.style.display='block';document.querySelector('#loading')?.remove();}
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.dataset.context='lost';show('화면을 그리는 작업이 중단됐어요. 다른 3D 탭을 닫고 다시 열어 주세요.');});
 canvas.addEventListener('webglcontextrestored',()=>{canvas.dataset.context='restored';/* Re-enter from a clean loader; do not duplicate live actors/listeners. */show('그래픽 연결이 복구됐어요. 다시 열면 이어서 볼 수 있어요.');});
 return {get lost(){return lost;},fail(error){console.error(error);show('posmos를 준비하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');}};
}

// A decoded bitmap shared by base/water rigs should also be one GPU texture.
export async function shareModelTextures(gltf,pool){
 const textures=await gltf.parser.getDependencies('texture'),replacements=new Map(),doc=gltf.parser.json;
 textures.forEach((texture,i)=>{if(!texture)return;const spec=doc.textures[i],hash=doc.images[spec.source]?.extras?.posmosImageHash;if(!hash)return;
  const key=[hash,texture.colorSpace,texture.flipY,texture.wrapS,texture.wrapT,texture.minFilter,texture.magFilter,texture.channel,texture.offset.toArray(),texture.repeat.toArray(),texture.rotation,texture.center.toArray()].join(':');
  const prior=pool.get(key);if(prior){replacements.set(texture,prior);texture.dispose();}else pool.set(key,texture);
 });
 gltf.scene.traverse(o=>{for(const material of [o.material].flat())if(material)for(const key of Object.keys(material))if(replacements.has(material[key]))material[key]=replacements.get(material[key]);});
 return gltf;
}
export async function prepareTextures(renderer,scene){
 const textures=new Set();scene.traverse(o=>{for(const m of [o.material].flat())if(m){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);for(const u of Object.values(m.uniforms||{}))if(u.value?.isTexture)textures.add(u.value);}});if(scene.environment)textures.add(scene.environment);
 let imageMipBytes=0;for(const t of textures){const image=t.image;if(image?.width&&image?.height){const bytes=t.type===1015?4:t.type===1016?2:1;imageMipBytes+=image.width*image.height*4*bytes*(t.generateMipmaps?4/3:1);}renderer.initTexture(t);await yieldTask();}
 return {textures:textures.size,imageMipMiB:+(imageMipBytes/1048576).toFixed(1)};
}
