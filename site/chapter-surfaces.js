import * as T from 'three';
import {chapterLinks,chapters} from './storybook-chapters.js?v=a1ea6da47f55';

// Five reusable painted ribbons connect the chapter islands. Their deck
// triangles join the SAME height sampler as the land; the ocean stays beneath.
export function addChapterBridges(scene,height){
 const surfaces=[],guide=new T.Object3D(),railParts=[];
 const railMaterial=new T.MeshLambertMaterial({color:'#8e8a9c'}),railGeometry=new T.CylinderGeometry(.065,.065,1,5);
 const postMaterial=new T.MeshLambertMaterial({color:'#aba293'});
 for(const link of chapterLinks){
  const [a,m,b]=link.points,start=new T.Vector3(a[0],height(...a)+.045,a[1]),end=new T.Vector3(b[0],height(...b)+.045,b[1]);
  const curve=new T.CatmullRomCurve3([start,new T.Vector3(m[0],Math.max(start.y,end.y)+3.0,m[1]),end]),points=curve.getSpacedPoints(64),positions=[],uvs=[],indices=[],width=3.0;
  points.forEach((p,i)=>{const tangent=curve.getTangent(i/64),side=new T.Vector3(-tangent.z,0,tangent.x).normalize();for(const sign of [-1,1]){positions.push(p.x+side.x*width*.5*sign,p.y,p.z+side.z*width*.5*sign);uvs.push(sign<0?0:1,i/4);}if(i<64){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}if(i%8===0)for(const sign of [-1,1])railParts.push({p:p.clone().addScaledVector(side,width*.47*sign),top:.72});});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
  const deck=new T.Mesh(g,new T.MeshLambertMaterial({color:link.colour,side:T.DoubleSide}));deck.name='chapter-painted-ribbon';deck.receiveShadow=true;scene.add(deck);surfaces.push(g);
 }
 const posts=new T.InstancedMesh(railGeometry,postMaterial,railParts.length);posts.name='chapter-ribbon-posts';railParts.forEach(({p,top},i)=>{guide.position.copy(p).y+=top*.5;guide.rotation.set(0,0,0);guide.scale.set(1,top,1);guide.updateMatrix();posts.setMatrixAt(i,guide.matrix);});posts.computeBoundingSphere();scene.add(posts);
 // Sparse side cords create a bridge silhouette without adding lights/physics.
 const cords=[];for(let k=0;k<chapterLinks.length;k++)for(let side=0;side<2;side++)for(let i=0;i<8;i++){const a=railParts[k*18+i*2+side].p.clone(),b=railParts[k*18+(i+1)*2+side].p.clone();a.y+=.72;b.y+=.72;cords.push([a,b]);}
 const rails=new T.InstancedMesh(railGeometry,railMaterial,cords.length);rails.name='chapter-ribbon-cords';cords.forEach(([a,b],i)=>{const d=new T.Vector3().subVectors(b,a);guide.position.copy(a).add(b).multiplyScalar(.5);guide.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());guide.scale.set(.45,d.length(),.45);guide.updateMatrix();rails.setMatrixAt(i,guide.matrix);});rails.computeBoundingSphere();scene.add(rails);
 return surfaces;
}

export function addChapterLandmarks(scene,height){
 // These are supporting structures, not substitutes for future character GLBs.
 const g=new T.BoxGeometry(1,1,1),m=new T.MeshLambertMaterial({color:'white'}),places=[];
 const neon=chapters.find(c=>c.id==='neon');
 for(let i=0;i<22;i++){
  const x=neon.x+Math.cos(i*2.4)*(12+(i%3)*4),z=neon.z+Math.sin(i*2.4)*(13+(i%4)*3),h=5+(i%5)*2.4;
  if(height(x,z)<0)continue;places.push({x,z,y:height(x,z),h,w:2+(i%3),colour:['#617389','#6b657f','#587f83'][i%3]});
 }
 const towers=new T.InstancedMesh(g,m,places.length),d=new T.Object3D(),colour=new T.Color();towers.name='chapter-electronic-silhouette';places.forEach((p,i)=>{d.position.set(p.x,p.y+p.h/2,p.z);d.scale.set(p.w,p.h,p.w*.73);d.rotation.set(0,(i%3)*.23,0);d.updateMatrix();towers.setMatrixAt(i,d.matrix);towers.setColorAt(i,colour.set(p.colour));});towers.computeBoundingSphere();scene.add(towers);
 const strips=new T.InstancedMesh(g,new T.MeshBasicMaterial({color:'white'}),places.length*2);strips.name='chapter-electronic-light-lines';places.forEach((p,i)=>{for(let j=0;j<2;j++){d.position.set(p.x+(j?-.3:.3),p.y+p.h*.6,p.z+p.w*.39);d.scale.set(.07,p.h*.62,.035);d.rotation.set(0,0,0);d.updateMatrix();strips.setMatrixAt(i*2+j,d.matrix);strips.setColorAt(i*2+j,colour.set(j?'#8fc9be':'#bd9dba'));}});strips.computeBoundingSphere();scene.add(strips);
 const gold=new T.MeshLambertMaterial({color:'#c9b785',side:T.DoubleSide}),arch=new T.Mesh(new T.TorusGeometry(5.3,.18,5,40,Math.PI*1.65),gold);arch.name='chapter-paper-moon-arch';arch.rotation.z=-.32;arch.position.set(-20,height(-20,106)+5,106);arch.castShadow=true;scene.add(arch);
 const scraps=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshLambertMaterial({color:'white'}),42);scraps.name='chapter-scrap-assemblage';for(let i=0;i<42;i++){const x=-84+Math.cos(i*2.4)*(13+(i%3)*3),z=57+Math.sin(i*2.4)*(15+(i%3)*2),h=.6+(i%5)*.4;d.position.set(x,height(x,z)+h*.4,z);d.rotation.set(i*.4,i*.7,i*.2);d.scale.set(h*(1+i%3),h,h*.8);d.updateMatrix();scraps.setMatrixAt(i,d.matrix);scraps.setColorAt(i,colour.set(['#867562','#ae8c73','#6d7776'][i%3]));}scraps.computeBoundingSphere();scene.add(scraps);
 return {bridges:5,chapterCount:chapters.length,landmarkBatches:4};
}
