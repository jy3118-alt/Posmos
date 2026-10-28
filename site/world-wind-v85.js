import * as T from 'three';

// Root-anchored motion on shared meshes; colour and shadow use the same function.
// Animate the baked single-mesh plants so separate legacy petals cannot detach.
export function makeIslandWind({reducedMotion=false}={}){
 const time={value:0},strength={value:reducedMotion?0:1};
 const declarations=`uniform float islandWindTime,islandWindStrength;
 attribute float islandWind;
 vec3 bendIsland(vec3 p){
  mat4 frame=modelMatrix;
  #ifdef USE_INSTANCING
   frame=modelMatrix*instanceMatrix;
  #endif
  vec3 anchor=frame[3].xyz;
  float phase=dot(anchor.xz,vec2(.083,.057));
  float gust=.58+.42*sin(islandWindTime*.43-phase*.64);
  float wave=sin(islandWindTime*1.28-phase)*.74+sin(islandWindTime*2.03+phase)*.26;
  vec3 offset=vec3(.88,0.,.47)*wave*gust*islandWind*islandWindStrength;
  // Convert metres to the instance's rotated/scaled local coordinate system.
  return p+vec3(dot(frame[0].xyz,offset)/dot(frame[0].xyz,frame[0].xyz),
                dot(frame[1].xyz,offset)/dot(frame[1].xyz,frame[1].xyz),
                dot(frame[2].xyz,offset)/dot(frame[2].xyz,frame[2].xyz));
 }`;
 function patch(material){
  const prior=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=shader=>{
   prior.call(material,shader);shader.uniforms.islandWindTime=time;shader.uniforms.islandWindStrength=strength;
   shader.vertexShader=declarations+'\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=bendIsland(transformed);');
  };
  material.customProgramCacheKey=()=>key()+'-island-wind85';
  return material;
 }
 const depth=patch(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}));
 let trees=0,plants=0,vertices=0;
 function prepare(mesh,kind){
  const geometry=mesh.geometry,p=geometry.attributes.position;
  geometry.computeBoundingBox();const box=geometry.boundingBox,height=Math.max(.001,box.max.y-box.min.y);
  if(!geometry.attributes.islandWind){
   const values=new Float32Array(p.count);
   for(let i=0;i<p.count;i++){
    const h=(p.getY(i)-box.min.y)/height;
    const weight=kind==='tree'?T.MathUtils.smoothstep(h,.32,.86):T.MathUtils.smoothstep(h,.04,.92);
    values[i]=weight*(kind==='tree'?.18:.075);
   }
   geometry.setAttribute('islandWind',new T.BufferAttribute(values,1));vertices+=p.count;
  }
  if(kind==='tree'){trees+=mesh.count;mesh.customDepthMaterial=depth;}else plants+=mesh.count;
  mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.2;
 }
 return {patch,prepare,update(t){time.value=t;},setReducedMotion(v){strength.value=v?0:1;},diagnostics:()=>({trees,plants,vertices,amplitudeMetres:{trees:.18,plants:.075},reducedMotion:strength.value===0,shadowMatched:true})};
}
