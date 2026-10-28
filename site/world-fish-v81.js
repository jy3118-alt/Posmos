import * as T from 'three';
import {marineMeshes} from './assets/ocean-v77/marine-meshes.js?v=9271a630b088';
import {oceanLighting} from './ocean-light-v77.js?v=5bc4fcffc216';
// Reuse the existing CC0 Quaternius mesh; Posmos supplies the tail motion and schools.
export function makeCoastFish(scene,height,context,cel,{mobile=false}={}){
 const data=marineMeshes.fish,g=new T.BufferGeometry();for(const key of ['position','color'])g.setAttribute(key,new T.Float32BufferAttribute(data[key],3));g.setIndex(data.index);g.computeVertexNormals();
 const m=cel({color:new T.Color('white'),vertexColors:true}),prior=m.onBeforeCompile;
 m.onBeforeCompile=s=>{prior(s);s.uniforms.coastFishTime=context.time;s.vertexShader='uniform float coastFishTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(coastFishTime*4.+instanceMatrix[3].x*.35+position.x*4.)*(1.-smoothstep(-.7,.25,position.x))*.12;');};m.customProgramCacheKey=()=> 'coast-fish79';oceanLighting(m,context);
 const count=mobile?30:45,fish=new T.InstancedMesh(g,m,count),guide=new T.Object3D();fish.name='coastal-Quaternius-fish';fish.instanceMatrix.setUsage(T.DynamicDrawUsage);fish.frustumCulled=false;scene.add(fish);
 function update(t){for(let i=0;i<count;i++){const group=i%5,cx=[10,-29,-44,53,13][group],cz=[51,53,74,74,103][group],a=t*.09+i*2.39996,r=3+(i%7)*.65,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r*.56,floor=height(x,z);guide.position.set(x,Math.min(-.8,floor+1.7+Math.sin(i+t*.4)*.4),z);guide.rotation.set(0,Math.atan2(-Math.cos(a)*.56,-Math.sin(a)),Math.sin(t*2+i)*.04);guide.scale.setScalar(.30+(i%4)*.05);guide.updateMatrix();fish.setMatrixAt(i,guide.matrix);}fish.instanceMatrix.needsUpdate=true;}
 update(0);return {update,count};
}
