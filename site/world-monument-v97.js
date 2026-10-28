import * as T from 'three';

// A filtered local environment gives metal real specular reflections. Capture only
// on loading or a large lighting change; camera movement costs no extra renders.
export function makeMonumentReflections({scene,renderer,meshes,position,mobile,canvas}){
 if(!meshes.length)return {capture(){},update(){}};
 const size=mobile?64:128,target=new T.WebGLCubeRenderTarget(size,{type:T.HalfFloatType}),probe=new T.CubeCamera(.5,5000,target),pmrem=new T.PMREMGenerator(renderer);
 probe.position.fromArray(position);probe.position.y+=8;scene.add(probe);
 let filtered=null,capturedNight=-1,capturedSunset=-1,captures=0,lastCapture=-Infinity,pendingAt=Infinity;
 const materials=[...new Set(meshes.map(m=>m.material))];
 function capture(night=0,sunset=0){
  const visibility=meshes.map(m=>m.visible),background=scene.background;
  try{
   meshes.forEach(m=>m.visible=false);scene.background=scene.fog?.color||background;
   probe.update(renderer,scene);const next=pmrem.fromCubemap(target.texture);
   for(const m of materials){m.envMap=next.texture;m.envMapIntensity=1.15;m.needsUpdate=!filtered;}
   filtered?.dispose();filtered=next;capturedNight=night;capturedSunset=sunset;lastCapture=performance.now();pendingAt=Infinity;captures++;
   canvas.dataset.monumentMetal=JSON.stringify({type:materials[0].type,metalness:materials[0].metalness,roughness:materials[0].roughness,reflectionSize:size,captures,night,sunset,triangles:meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3*m.count,0)});
  }finally{meshes.forEach((m,i)=>m.visible=visibility[i]);scene.background=background;}
 }
 document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{pendingAt=performance.now()+1800;}));
 return {capture,update(now,night,sunset,exploring){if(!exploring&&(now>=pendingAt||(now-lastCapture>45000&&(Math.abs(night-capturedNight)>.2||Math.abs(sunset-capturedSunset)>.2))))capture(night,sunset);}};
}
