import * as T from 'three';
import {prepareSmoothNormals} from './normal-smoothing.js?v=4baf9416a5b8';
const ramp=new T.DataTexture(new Uint8Array([76,126,181,228,255]),5,1,T.RedFormat);
ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
const cache=new WeakMap();
export function gameMaterial(source={},flat=true){return new T.MeshToonMaterial({color:source.color?.clone?.()||source.color||'#ffffff',map:source.map||null,gradientMap:ramp,side:source.side??T.FrontSide});}
export function characterMaterial(source={}){return new T.MeshLambertMaterial({color:source.color?.clone?.()||source.color||'#ffffff',map:source.map||null,flatShading:false,side:source.side??T.FrontSide});}
export function gameObject(object){object.traverse(mesh=>{if(!mesh.isMesh)return;if(mesh.isSkinnedMesh){if(!mesh.geometry.attributes.normal)mesh.geometry.computeVertexNormals();}mesh.castShadow=mesh.receiveShadow=true;const convert=m=>{if(!cache.has(m))cache.set(m,mesh.isSkinnedMesh?characterMaterial(m):gameMaterial(m));return cache.get(m);};mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);});}

// Discard coincident duplicate faces and zero-area scraps without merging UVs,
// changing silhouettes or touching skin weights.
export function cleanGeometry(geometry){
 const p=geometry.attributes.position,index=geometry.index,seen=new Set(),kept=[],keys=Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(','));
 let removed=0;for(let i=0;i<(index?.count||p.count);i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2,key=[keys[a],keys[b],keys[c]].sort().join('|');const ax=p.getX(b)-p.getX(a),ay=p.getY(b)-p.getY(a),az=p.getZ(b)-p.getZ(a),bx=p.getX(c)-p.getX(a),by=p.getY(c)-p.getY(a),bz=p.getZ(c)-p.getZ(a),area=Math.hypot(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx);if(area<1e-10||seen.has(key)){removed++;continue;}seen.add(key);kept.push(a,b,c);}
 if(removed){geometry.setIndex(kept);geometry.userData.removedFaces=removed;}return geometry;
}
