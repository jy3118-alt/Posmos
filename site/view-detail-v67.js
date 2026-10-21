import * as T from 'three';

export async function loadViewDetails(url){
 const manifest=await fetch(url).then(r=>{if(!r.ok)throw Error('거리별 모델 설정을 읽지 못했습니다.');return r.json();});
 const result={};await Promise.all(Object.entries(manifest.lods).map(async([key,parts])=>{result[key]=await Promise.all(parts.map(async p=>({...p,indices:new Uint32Array(await fetch(p.file).then(r=>{if(!r.ok)throw Error('거리별 모델을 읽지 못했습니다.');return r.arrayBuffer();}))})));}));return result;
}

// Compact actual visible instances rather than setting far skins to zero scale:
// zero scale still runs their VAT/bone shaders. Geometry/UV/weights are shared.
export function makeViewDetail(scene,camera,crowd,details,viewportHeight){
 const matrix=new T.Matrix4(),vp=new T.Matrix4(),frustum=new T.Frustum(),position=new T.Vector3(),sphere=new T.Sphere(),records=[],meshes=[],metrics={near:0,far:0,culled:0,triangles:0};
 const originals=[...(crowd?.batches||[])];scene.traverse(o=>{if(o.name==='tripo-tree')originals.push(o);});
 for(const original of originals){
  const environment=original.name==='tripo-tree',key=environment?'tree':original.name==='animated-hidden-friends'?'base':original.name.replace('po-variant-',''),part=details[key]?.[0];
  if(!part||original.geometry.attributes.position.count!==part.vertexCount)continue;
  const attributes=Object.entries(original.geometry.attributes).filter(([,a])=>a.isInstancedBufferAttribute),levels=[];
  for(let level=0;level<2;level++){
   const g=new T.BufferGeometry();for(const [name,a]of Object.entries(original.geometry.attributes))g.setAttribute(name,a.isInstancedBufferAttribute?new T.InstancedBufferAttribute(new a.array.constructor(a.array.length),a.itemSize,a.normalized):a);
   g.setIndex(level?new T.BufferAttribute(part.indices,1):original.geometry.index);
   const m=new T.InstancedMesh(g,original.material,original.instanceMatrix.count);m.name=original.name+'-detail-'+level;m.userData.residentDetail=!environment;m.userData.viewDetail=true;m.castShadow=original.castShadow;m.receiveShadow=original.receiveShadow;m.boundingSphere=original.boundingSphere?.clone()||new T.Sphere(new T.Vector3(0,10,0),180);m.frustumCulled=false;
   if(original.instanceColor)m.instanceColor=new T.InstancedBufferAttribute(new Float32Array(original.instanceColor.array.length),3);
   m.count=0;scene.add(m);levels.push(m);meshes.push(m);
  }
  original.visible=false;records.push({original,levels,attributes,environment,chosen:new Uint8Array(original.instanceMatrix.count),triangles:[(original.geometry.index?.count||original.geometry.attributes.position.count)/3,part.triangles]});
 }
 crowd?.batches.push(...meshes.filter(m=>m.userData.residentDetail));
 function update(){
  camera.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(vp);const screenFactor=viewportHeight()/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)));
  metrics.near=metrics.far=metrics.culled=metrics.triangles=0;
  for(const r of records){const source=r.original,counts=[0,0],data=source.instanceMatrix.array;
   for(let i=0;i<source.count;i++){
    const at=i*16,scale=Math.hypot(data[at],data[at+1],data[at+2]);if(scale<.001){metrics.culled++;continue;}
    position.set(data[at+12]+data[at+4]*.5,data[at+13]+data[at+5]*.5,data[at+14]+data[at+6]*.5);sphere.set(position,scale*.95);
    if(!r.environment&&!frustum.intersectsSphere(sphere)){metrics.culled++;continue;}
    const px=scale*screenFactor/Math.max(1,camera.position.distanceTo(position)),threshold=r.environment?150:r.chosen[i]===0?22:30,level=px>=threshold?0:1;r.chosen[i]=level;
    const target=r.levels[level],index=counts[level]++;for(let k=0;k<16;k++)target.instanceMatrix.array[index*16+k]=data[at+k];
    for(const [name,a]of r.attributes){const dst=target.geometry.attributes[name].array;for(let k=0;k<a.itemSize;k++)dst[index*a.itemSize+k]=a.array[i*a.itemSize+k];}
    if(source.instanceColor)for(let k=0;k<3;k++)target.instanceColor.array[index*3+k]=source.instanceColor.array[i*3+k];
   }
   for(let level=0;level<2;level++){const m=r.levels[level];m.count=counts[level];m.instanceMatrix.needsUpdate=true;for(const [name]of r.attributes)m.geometry.attributes[name].needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;metrics[level?'far':'near']+=counts[level];metrics.triangles+=counts[level]*r.triangles[level];}
  }
 }
 update();return {update,meshes,metrics};
}
