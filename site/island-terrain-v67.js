import * as T from 'three';
import {terrainIndices} from './terrain-topology-v63.js?v=573fab3a318f';
// Built once during loading. LODs exchange shared indices, never whole scenes.
export function makeIslandTerrain(scene,grid,material,roads=[]){
 const {count:N,width:W,heights:H}=grid,L=60,step=W/(N-1),chunks=[],indices=[1,3,6].map(s=>new T.BufferAttribute(terrainIndices(L,s),1)),strides=[1,3,6];
 const roadPoints=[];for(const line of roads)for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/4);for(let j=0;j<=n;j++){const u=j/n;roadPoints.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);}}
 const h=(x,z)=>H[Math.max(0,Math.min(N-1,z))*N+Math.max(0,Math.min(N-1,x))];
 for(let oz=0;oz<N-1;oz+=L)for(let ox=0;ox<N-1;ox+=L){
  const positions=new Float32Array((L+1)**2*3),normals=new Float32Array(positions.length),uv=new Float32Array((L+1)**2*2);
  let min=Infinity,max=-Infinity;
  for(let z=0;z<=L;z++)for(let x=0;x<=L;x++){const k=z*(L+1)+x,gx=ox+x,gz=oz+z,y=h(gx,gz),nx=(h(gx-1,gz)-h(gx+1,gz))/(2*step),nz=(h(gx,gz-1)-h(gx,gz+1))/(2*step),r=1/Math.hypot(nx,1,nz);positions.set([gx*step-W/2,y,gz*step-W/2],k*3);normals.set([nx*r,r,nz*r],k*3);uv.set([gx/(N-1),1-gz/(N-1)],k*2);min=Math.min(min,y);max=Math.max(max,y);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setIndex(indices[0]);geometry.computeBoundingSphere();geometry.computeBoundingBox();const mesh=new T.Mesh(geometry,material);mesh.name='island-terrain-'+ox+'-'+oz;mesh.receiveShadow=true;scene.add(mesh);
  const errors=strides.map(s=>{let e=0;for(let z=s;z<L-s;z++)for(let x=s;x<L-s;x++){const a=Math.floor(x/s)*s,b=Math.floor(z/s)*s,u=(x-a)/s,v=(z-b)/s,p=h(ox+a,oz+b),q=h(ox+a+s,oz+b),r=h(ox+a,oz+b+s),t=h(ox+a+s,oz+b+s),coarse=u+v<=1?p+(q-p)*u+(r-p)*v:t+(r-t)*(1-u)+(q-t)*(1-v);e=Math.max(e,Math.abs(coarse-h(ox+x,oz+z)));}return e;});
  const xmin=ox*step-W/2,xmax=(ox+L)*step-W/2,zmin=oz*step-W/2,zmax=(oz+L)*step-W/2,roadLocked=roadPoints.some(([x,z])=>x>xmin-4&&x<xmax+4&&z>zmin-4&&z<zmax+4);
  chunks.push({roadLocked,mesh,errors,level:0,centre:geometry.boundingSphere.center,radius:geometry.boundingSphere.radius,central:ox*step-W/2<60&&(ox+L)*step-W/2>-60&&oz*step-W/2<60&&(oz+L)*step-W/2>-60});
 }
 let frame=0;
 function update(camera,target,viewportHeight){if(frame++%8)return;const focal=viewportHeight/(2*Math.tan(camera.fov*Math.PI/360));for(const c of chunks){const distance=Math.max(2,camera.position.distanceTo(c.centre)-c.radius),near=Math.hypot(target.x-c.centre.x,target.z-c.centre.z)<45;let level=0;if(!c.central&&!near&&!c.roadLocked){const threshold=c.level>0?2.0:1.1;for(let i=2;i>0;i--)if(c.errors[i]*focal/distance<(i===c.level?2.0:threshold)){level=i;break;}}if(level!==c.level){c.level=level;c.mesh.geometry.setIndex(indices[level]);}}}
 function lockSurfaces(surfaces){const side=(N-1)/L,size=L*step;for(const geometry of surfaces){const a=geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),minX=Math.max(0,Math.floor((x+W/2-1)/size)),maxX=Math.min(side-1,Math.floor((x+W/2+1)/size)),minZ=Math.max(0,Math.floor((z+W/2-1)/size)),maxZ=Math.min(side-1,Math.floor((z+W/2+1)/size));for(let zz=minZ;zz<=maxZ;zz++)for(let xx=minX;xx<=maxX;xx++)chunks[zz*side+xx].roadLocked=true;}}}
 return {lockSurfaces,meshes:chunks.map(c=>c.mesh),update,diagnostics:()=>({chunks:chunks.length,roadLocked:chunks.filter(c=>c.roadLocked).length,roadLockedAtFullDetail:chunks.filter(c=>c.roadLocked&&c.level!==0).length===0,levels:[0,1,2].map(i=>chunks.filter(c=>c.level===i).length),triangles:chunks.reduce((s,c)=>s+indices[c.level].count/3,0),sharedFullResolutionEdges:true})};
}
