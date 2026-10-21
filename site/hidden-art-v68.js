import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const HIDDEN_ART=[
 {id:'woodland',x:-87,z:-33,yaw:.40,width:2.4,height:3},
 {id:'lakeside',x:41,z:-74,yaw:.18,width:2.4,height:3},
 {id:'small-island',x:134,z:83,yaw:.68,width:2.4,height:3}
];
export function clearArtNooks(plan){
 const before=plan.placements.length;
 plan.placements=plan.placements.filter(p=>p.asset!=='tree'||p.airborne||!HIDDEN_ART.some(a=>Math.hypot(p.x-a.x,p.z-a.z)<4.5));
 plan.trees-=before-plan.placements.length;
}
export function placeHiddenArt(scene,gallery,ground,plan,cel){
 const frameParts=[],guide=new T.Object3D(),point=new T.Vector3(),frame=new T.MeshLambertMaterial({color:'#ddc593'});
 const details=[];
 for(let i=0;i<HIDDEN_ART.length;i++){
  const p=HIDDEN_ART[i],root=new T.Group();root.name='hidden-po-art-'+p.id;root.rotation.y=p.yaw;
  const base=ground(p.x,p.z),w=p.width,h=p.height;root.position.set(p.x,base+.34,p.z);root.updateMatrixWorld(true);
  function beam(x,y,z,sx,sy,sz){const g=new T.BoxGeometry(sx,sy,sz);guide.position.set(x,y,z);guide.rotation.set(0,0,0);guide.scale.setScalar(1);guide.updateMatrix();g.applyMatrix4(guide.matrix).applyMatrix4(root.matrixWorld);frameParts.push(g);}
  beam(-w/2-.065,h/2,0,.13,h+.26,.18);beam(w/2+.065,h/2,0,.13,h+.26,.18);beam(0,-.065,0,w+.26,.13,.18);beam(0,h+.065,0,w+.26,.13,.18);
  // Two driven legs meet the same actual terrain used for the characters.
  for(const x of [-w*.42,w*.42]){point.set(x,0,-.02).applyMatrix4(root.matrixWorld);const foot=ground(point.x,point.z)-root.position.y-.08;beam(x,(foot+.55)/2,-.02,.11,.55-foot,.14);}
  // A solid back prevents seeing the picture through the support from behind.
  beam(0,h/2,-.075,w,h,.05);
  const entry=gallery.entries[i+3],geometry=new T.PlaneGeometry(w,h);const uv=geometry.attributes.uv;for(let v=0;v<uv.count;v++)uv.setY(v,1-uv.getY(v));geometry.translate(0,h/2,.105);geometry.computeBoundingSphere();
  const paper=new T.Mesh(geometry,new T.MeshBasicMaterial({map:entry.map}));paper.name='hidden-po-painting-'+p.id;root.add(paper);scene.add(root);root.updateMatrixWorld(true);entry.mesh=paper;
  // The paper is single-sided, like a real canvas. A nearby camera sees its front.
  plan.obstacles.push({x:p.x,z:p.z,r:1.65});details.push({id:p.id,position:[p.x,base,p.z],entry:i+3});
 }
 const mesh=new T.Mesh(mergeGeometries(frameParts),cel(frame));mesh.name='hidden-painting-frames';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);frameParts.forEach(g=>g.dispose());
 return details;
}
