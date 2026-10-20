import * as T from 'three';

// Fit the actual accepted bridge, including its stairs, to the two real banks.
// Collision is its real mesh, never a larger visible rectangular helper slab.
export function planGroundedBridge(gltf,ground,sample,location={x:-36,z:22}){
 gltf.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(gltf.scene),size=box.getSize(new T.Vector3()),centre=box.getCenter(new T.Vector3()),h=2.8;
 const normalize=new T.Matrix4().makeScale(h/size.y,h/size.y,h/size.y).multiply(new T.Matrix4().makeTranslation(-centre.x,-box.min.y,-centre.z)),parts=[];
 gltf.scene.traverse(o=>{if(o.isMesh)parts.push(o.geometry.clone().applyMatrix4(normalize.clone().multiply(o.matrixWorld)));});
 const span=size.z/size.y*h,point=sample(location.x,location.z),yaw=Math.atan2(-point.flowZ,point.flowX),axis=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw)),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),meshes=parts.map(g=>new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide})));
 meshes.forEach(m=>m.updateMatrixWorld());
 const ends=[];for(const sign of [-1,1]){let hit=null,z=0;for(const ratio of [.97,.95,.93,.91]){z=sign*span*.5*ratio;ray.set(new T.Vector3(-.25,h+1,z),down);hit=ray.intersectObjects(meshes,false)[0];if(hit)break;}if(!hit)throw Error('다리 계단 끝을 찾지 못했습니다.');ends.push({z,lipY:hit.point.y,bank:ground(location.x+axis.x*z,location.z+axis.z*z)});}
 const tilt=-Math.atan2(ends[1].bank-ends[0].bank-(ends[1].lipY-ends[0].lipY),ends[1].z-ends[0].z),base=(ends[0].bank+ends[1].bank-(ends[0].lipY+ends[1].lipY)*Math.cos(tilt))/2;
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(tilt,yaw,0,'YXZ')),matrix=new T.Matrix4().compose(new T.Vector3(location.x,base,location.z),rotation,new T.Vector3(1,1,1));
 const landings=ends.map(e=>new T.Vector3(-.25,e.lipY-.04,e.z).applyMatrix4(matrix));
 const groups=new Map();for(const g of parts){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y>.17||Math.abs(z)>span*.37)continue;const key=(x<-.55?'left':'right')+(z<0?'back':'front');if(!groups.has(key))groups.set(key,new T.Box3());groups.get(key).expandByPoint(new T.Vector3(x,y,z));}}
 const feet=[...groups.values()].map(b=>new T.Vector3((b.min.x+b.max.x)/2,b.min.y,(b.min.z+b.max.z)/2).applyMatrix4(matrix));
 return {x:location.x,z:location.z,y:base+h*.77,base,h,yaw,rx:tilt,order:'YXZ',width:span,depth:size.x/size.y*h,matrix,landings,feet,surfaces:parts.map(g=>g.applyMatrix4(matrix)),bedHeight:ground};
}

// Shape the continuous terrain itself into compact landings; no floating caps.
export function fitBridgeLandings(geometry,bridge,sample){
 const p=geometry.attributes.position;for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),r=sample(x,z);if(r&&r.d<r.width+.20)continue;
  let y=p.getY(i);for(const e of bridge.landings){const dx=x-e.x,dz=z-e.z,along=dx*Math.sin(bridge.yaw)+dz*Math.cos(bridge.yaw),across=dx*Math.cos(bridge.yaw)-dz*Math.sin(bridge.yaw),d=Math.hypot(along/2.3,across/2.5),u=T.MathUtils.clamp((d-.38)/.8,0,1),w=1-u*u*(3-2*u);y=T.MathUtils.lerp(y,e.y,w);}p.setY(i,y);
 }
}

export function addGroundSupports(scene,city){
 const blocks=[],bridge=city.worldPlan?.bridge,ground=city.terrainHeight||city.height;
 function block(x,y,z,w,h,d,yaw=0,tint='#a9997b'){if(h<.008)return;blocks.push({x,y:y-h/2,z,w,h,d,yaw,tint});}
 if(bridge)for(const p of bridge.feet){const bed=ground(p.x,p.z);block(p.x,p.y+.08,p.z,.72,p.y-bed+.30,.72,bridge.yaw,'#aaa189');}
 let houses=0;for(const b of city.buildings){if(!['atelier','cottage','paint-hut','paint-mill','lookout','workshop'].includes(b.asset))continue;
  const w=b.width*.78,d=b.depth*.78,y=b.base??city.height(b.x,b.z),c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0);let low=Infinity;
  for(const u of [-.5,0,.5])for(const v of [-.5,0,.5])low=Math.min(low,ground(b.x+c*w*u+s*d*v,b.z-s*w*u+c*d*v));
  if(y-low<.18)continue;houses++;block(b.x,y+.04,b.z,w,y-low+.28,d,b.yaw||0);
  // Sparse masonry joints give the exposed plinth a clear architectural use.
  for(let row=0;row<Math.min(16,Math.ceil((y-low)/.48));row++)for(const side of [-1,1]){
   const yy=y-.12-row*.48;for(let k=0;k<Math.ceil(w/1.05);k++){const xx=-w/2+(k+.5)*w/Math.ceil(w/1.05),zz=side*(d/2+.012);block(b.x+c*xx+s*zz,yy,b.z-s*xx+c*zz,w/Math.ceil(w/1.05)-.04,.027,.025,b.yaw||0,'#807969');}
  }
 }
 const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({color:'white'}),blocks.length),guide=new T.Object3D(),colour=new T.Color();
 blocks.forEach((b,i)=>{guide.position.set(b.x,b.y,b.z);guide.rotation.set(0,b.yaw,0);guide.scale.set(b.w,b.h,b.d);guide.updateMatrix();mesh.setMatrixAt(i,guide.matrix);mesh.setColorAt(i,colour.set(b.tint));});mesh.name='grounded-stone-foundations';mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
 return {houses,bridgePiers:bridge?.feet.length||0,blocks:blocks.length,unsupportedHelperSlabs:0};
}
