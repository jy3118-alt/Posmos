import * as T from 'three';
import {characterMaterial} from './game-material-v103.js?v=caf5cc4587a0';
import {prepareSmoothNormals} from './normal-smoothing.js?v=caf5cc4587a0';

export async function loadPoVariants(config,load){
 return (await Promise.all((config||[]).map(async item=>{
  const [gltf,meta]=await Promise.all([load(item.file,item.label),fetch(item.poseMetadata).then(r=>{if(!r.ok)throw Error(item.label+' 동작을 불러오지 못했습니다.');return r.json();})]);
  if(!gltf)return null;const response=await fetch(meta.texture);if(!response.ok)throw Error(item.label+' 관절을 불러오지 못했습니다.');
  const half=new Uint16Array(await response.arrayBuffer()),frames=Float32Array.from(half,T.DataUtils.fromHalfFloat);
  return {...item,gltf,meta,frames};
 }))).filter(Boolean);
}

// Each kind shares a mesh and a tiny bone-motion library. Interpolate the 20
// bones once per resident, then upload a compact palette; never one mixer or a
// 48MB vertex animation texture per new character type.
export function createPoVariantCrowd(scene,library,placements,clocks,transitions,previousClocks,poseMixes,target){
 const available=placements.filter(p=>!p.hero&&!p.water&&!p.grip&&!p.statue),claimed=new Set(),groups=[];
 const shuffled=[...available].sort((a,b)=>((a.id*2654435761)>>>0)-((b.id*2654435761)>>>0));
 for(const item of library){
  const members=item.key==='crown'?available.filter(p=>p.id===target):shuffled.filter(p=>p.id!==target&&!claimed.has(p.id)).slice(0,item.count);
  if(!members.length)continue;
  for(const p of members){claimed.add(p.id);p.variant=item.key;p.variantMeta=item.meta;p.height*=item.heightScale||1;const c=item.meta.clips[p.pose];clocks.set([c.start,c.count,p.follower?0:clocks[p.id*4+2],p.clockOffset*c.fps],p.id*4);}
  let source;item.gltf.scene.traverse(o=>{if(o.isSkinnedMesh)source=o;});if(!source)throw Error('새 Po의 리그를 찾을 수 없습니다.');
  const geo=source.geometry.clone();if(!geo.attributes.normal)geo.computeVertexNormals(); // Preserve exported Blender normals.
  const boneCount=item.meta.boneCount,width=256,height=Math.ceil(members.length*boneCount*3/width),current=new Float32Array(width*height*4),texture=new T.DataTexture(current,width,height,T.RGBAFormat,T.FloatType);texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  geo.setAttribute('aBoneOffset',new T.InstancedBufferAttribute(Float32Array.from(members,(_,i)=>i*boneCount*3),1));
  const material=characterMaterial(source.material);
  material.onBeforeCompile=s=>{
   Object.assign(s.uniforms,{poBoneFrames:{value:texture},poBoneSize:{value:new T.Vector2(width,height)}});
   s.vertexShader=`attribute vec4 skinIndex,skinWeight;attribute float aBoneOffset;uniform sampler2D poBoneFrames;uniform vec2 poBoneSize;
    vec4 poRow(float joint,float row){float index=aBoneOffset+joint*3.+row;return texture2D(poBoneFrames,(vec2(mod(index,poBoneSize.x),floor(index/poBoneSize.x))+.5)/poBoneSize);}
    vec4 poBlendRow(float row){vec4 result=vec4(0.);if(skinWeight.x>0.)result+=poRow(skinIndex.x,row)*skinWeight.x;if(skinWeight.y>0.)result+=poRow(skinIndex.y,row)*skinWeight.y;if(skinWeight.z>0.)result+=poRow(skinIndex.z,row)*skinWeight.z;if(skinWeight.w>0.)result+=poRow(skinIndex.w,row)*skinWeight.w;return result;}
   `+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`vec4 poR0=poBlendRow(0.),poR1=poBlendRow(1.),poR2=poBlendRow(2.);vec3 poNormal=vec3(dot(poR0.xyz,normal),dot(poR1.xyz,normal),dot(poR2.xyz,normal));vec3 objectNormal=poNormal*inversesqrt(max(dot(poNormal,poNormal),.00001));`);
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`vec4 poVertex=vec4(position,1.);vec3 transformed=vec3(dot(poR0,poVertex),dot(poR1,poVertex),dot(poR2,poVertex));`);
  };material.customProgramCacheKey=()=> 'po-shared-bone-rows-v51-sparse';
  const mesh=new T.InstancedMesh(geo,material,members.length);mesh.name='po-variant-'+item.key;mesh.receiveShadow=mesh.castShadow=false;mesh.boundingSphere=new T.Sphere(new T.Vector3(0,10,0),155);mesh.raycast=()=>{};scene.add(mesh);
  groups.push({...item,members,mesh,current,texture});
 }
 const offsets=[0,4,8,12,1,5,9,13,2,6,10,14];
 function frame(clip,t,offset){const f=((t*clip[2]+clip[3])%clip[1]+clip[1])%clip[1],a=Math.floor(f);offset[0]=clip[0]+a;offset[1]=clip[0]+(a+1)%clip[1];offset[2]=f-a;}
 const now=new Float64Array(3),previous=new Float64Array(3),idle=new Float64Array(3),clockView=new Float64Array(4),previousView=new Float64Array(4),idleView=new Float64Array(4);
 function update(t,roots){for(const g of groups){
  const {meta,frames:source,current,members}=g,stride=meta.boneCount*16;
  for(let n=0;n<members.length;n++){
   const p=members[n],id=p.id,i=id*4,transition=transitions[id*2+1],poseMix=poseMixes[id];for(let k=0;k<4;k++){clockView[k]=clocks[i+k];previousView[k]=previousClocks[i+k];}
   frame(clockView,t,now);frame(previousView,t,previous);idleView[0]=meta.clips.idle.start;idleView[1]=meta.clips.idle.count;idleView[2]=0;idleView[3]=transitions[id*2];frame(idleView,0,idle);
   const base=n*meta.boneCount*12;
   for(let b=0;b<meta.boneCount;b++)for(let k=0;k<12;k++){
    const at=b*16+offsets[k],a=source[now[0]*stride+at],z=source[now[1]*stride+at];let value=a+(z-a)*now[2];
    if(poseMix<.999){const pa=source[previous[0]*stride+at],pb=source[previous[1]*stride+at],old=pa+(pb-pa)*previous[2];value=old+(value-old)*poseMix;}
    if(transition<.999){const ia=source[idle[0]*stride+at],ib=source[idle[1]*stride+at],rest=ia+(ib-ia)*idle[2];value=rest+(value-rest)*transition;}
    current[base+b*12+k]=value;
   }
   g.mesh.setMatrixAt(n,roots[id]);
  }g.texture.needsUpdate=true;g.mesh.instanceMatrix.needsUpdate=true;
 }}
 const counts=Object.fromEntries(groups.map(g=>[g.key,g.members.length]));
 return {groups,batches:groups.map(g=>g.mesh),counts,paletteBytes:groups.reduce((s,g)=>s+g.frames.byteLength,0),update,hasCrown:counts.crown===1};
}
