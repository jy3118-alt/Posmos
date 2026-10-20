import * as T from 'three';
import {storybookBeds,bedPoint,pathDistance} from './storybook-landscape.js?v=4463ff4f4170';

// Shared paper-cut blades and five-petal flowers, not hundreds of materials or
// per-flower objects. Both batches are static after loading.
export function makeStorybookGarden(scene,city){
 const paths=city.paintPaths||city.paths,places=[];let seed=65931;
 const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const b of storybookBeds)for(let i=0;i<95;i++){
  const a=r()*Math.PI*2,d=Math.sqrt(r())*.92,p=bedPoint(b,Math.cos(a)*d,Math.sin(a)*d);
  if(pathDistance(p.x,p.z,paths)<1.9||city.buildings.some(h=>Math.hypot(p.x-h.x,p.z-h.z)<Math.max(h.width,h.depth)*.53+.5))continue;
  const y=city.height(p.x,p.z),dx=city.height(p.x+.35,p.z)-y,dz=city.height(p.x,p.z+.35)-y;
  if(y<city.sea+2||Math.hypot(dx,dz)>.23)continue;
  places.push({...p,y,h:.25+r()*.30,yaw:r()*6.28,flower:i%3!==0,tint:['#ffd24c','#ff7296','#f48a4c','#f9e9b7','#b490ed'][i%5]});
 }
 const verts=[];
 const tri=(...p)=>verts.push(...p.flat());
 for(let i=0;i<3;i++){
  const a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a),w=.07;
  const p=(x,y,z)=>[x*c-z*s,y,x*s+z*c];
  tri(p(-w,0,0),p(w,0,0),p(.15,.70,0));
  tri(p(w,0,0),p(.05,.95,.01),p(.15,.70,0));
 }
 const blades=new T.BufferGeometry();blades.setAttribute('position',new T.Float32BufferAttribute(verts,3));blades.computeVertexNormals();
 const leaves=new T.InstancedMesh(blades,new T.MeshLambertMaterial({color:'white',side:T.DoubleSide}),places.length),guide=new T.Object3D(),colour=new T.Color();leaves.name='storybook-flower-stems';
 places.forEach((p,i)=>{guide.position.set(p.x,p.y+.015,p.z);guide.rotation.set(0,p.yaw,0);guide.scale.setScalar(p.h);guide.updateMatrix();leaves.setMatrixAt(i,guide.matrix);leaves.setColorAt(i,colour.set(i%3?'#218f74':'#4aaf58'));});leaves.computeBoundingSphere();scene.add(leaves);
 const petalVertices=[],colours=[];
 function face(a,b,c,colour){petalVertices.push(...a,...b,...c);for(let i=0;i<3;i++)colours.push(...colour);}
 for(let i=0;i<5;i++){
  const a=i/5*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),p=(x,z,y)=>[x*ca-z*sa,y,x*sa+z*ca];
  face([0,.03,0],p(.14,-.067,.065),p(.24,0,.08),[1,1,1]);face([0,.03,0],p(.24,0,.08),p(.14,.067,.065),[1,1,1]);
 }
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,b=(i+1)/10*Math.PI*2;face([0,.085,0],[Math.cos(a)*.067,.08,Math.sin(a)*.067],[Math.cos(b)*.067,.08,Math.sin(b)*.067],[.94,.65,.12]);}
 const petals=new T.BufferGeometry();petals.setAttribute('position',new T.Float32BufferAttribute(petalVertices,3));petals.setAttribute('color',new T.Float32BufferAttribute(colours,3));petals.computeVertexNormals();
 const blooms=places.filter(p=>p.flower),flowers=new T.InstancedMesh(petals,new T.MeshLambertMaterial({color:'white',vertexColors:true,side:T.DoubleSide}),blooms.length);flowers.name='storybook-five-petal-flowers';
 blooms.forEach((p,i)=>{guide.position.set(p.x,p.y+p.h*.78,p.z);guide.rotation.set(Math.sin(p.yaw)*.25,p.yaw,Math.cos(p.yaw)*.25);guide.scale.setScalar(.75+p.h);guide.updateMatrix();flowers.setMatrixAt(i,guide.matrix);flowers.setColorAt(i,colour.set(p.tint));});flowers.computeBoundingSphere();scene.add(flowers);
 return {batches:2,plants:places.length,flowers:blooms.length,triangles:places.length*6+blooms.length*20};
}
