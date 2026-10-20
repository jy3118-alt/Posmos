import * as T from 'three';
import {paintMaterial} from './paint.js?v=50e1064b0d79';

// Small code-native paint containers complement the existing Tripo studio/chest.
export function makePaintTools(scene,config){
  if(!config)return;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#dfcdb4';ctx.fillRect(0,0,256,256);
  for(let i=0;i<90;i++){const x=(i*47)%256,y=(i*83)%256;ctx.fillStyle=['#447cbd','#ef7762','#ecc546','#5dafae'][i%4];ctx.globalAlpha=.65;ctx.fillRect(x,y,5+(i%12),18+(i%55));}ctx.globalAlpha=1;
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const silver=paintMaterial({color:'#adb5c4'},'paint-tool'),wood=paintMaterial({map,color:'#cfaa83'},'paint-tool');
  const shell=new T.CylinderGeometry(.29,.26,.52,12,1,true),rim=new T.TorusGeometry(.28,.018,4,16),handle=new T.TorusGeometry(.29,.015,4,16,Math.PI),liquid=new T.CircleGeometry(.26,16);liquid.rotateX(-Math.PI/2);
  const colours=['#e97966','#54b5bd','#edc542'];
  config.buckets.forEach((position,i)=>{
    const pigment=paintMaterial({color:colours[i%3]},'paint-tool'),body=paintMaterial({map,color:colours[(i+1)%3]},'paint-tool');
    const root=new T.Group();root.position.fromArray(position);scene.add(root);
    const cup=new T.Mesh(shell,body);cup.position.y=.26;root.add(cup);
    const lip=new T.Mesh(rim,silver);lip.rotation.x=-Math.PI/2;lip.position.y=.52;root.add(lip);
    const paint=new T.Mesh(liquid,pigment);paint.position.y=.48;root.add(paint);
    const grip=new T.Mesh(handle,silver);grip.position.y=.47;grip.rotation.y=i*.8;root.add(grip);
    root.traverse(m=>{if(m.isMesh)m.castShadow=m.receiveShadow=true;});
  });
  const shape=new T.Shape();shape.absellipse(0,0,.70,.42,0,Math.PI*2,false,0);const hole=new T.Path();hole.absellipse(-.43,0,.105,.105,0,Math.PI*2,true,0);shape.holes.push(hole);
  const board=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.008}),wood);board.rotation.x=-Math.PI/2;board.position.fromArray(config.palette);board.castShadow=board.receiveShadow=true;scene.add(board);
  const blobs=new T.InstancedMesh(new T.SphereGeometry(1,8,5),paintMaterial({},'paint-tool'),6),dummy=new T.Object3D();
  const dots=[[-.10,-.24],[.19,-.24],[.42,-.03],[.21,.22],[-.05,.22],[-.32,.23]],inks=['#edb83d','#4c79bf','#cf709c','#42a99b','#f07660','#ebe3c4'];
  dots.forEach(([x,z],i)=>{dummy.position.set(config.palette[0]+x,config.palette[1]+.064,config.palette[2]+z);dummy.scale.set(.105,.016,.07);dummy.updateMatrix();blobs.setMatrixAt(i,dummy.matrix);blobs.setColorAt(i,new T.Color(inks[i]));});blobs.receiveShadow=true;blobs.computeBoundingSphere();scene.add(blobs);
}

// Bake the existing resident's bind pose once. Statues share immutable mesh data,
// do not clone a live skeleton, and never add a second walking resident.
export function makeArtworks(scene,config,gltf){
 if(!config||!gltf)return;
 gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
 const box=new T.Box3().setFromObject(gltf.scene),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const normalise=new T.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new T.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
 const guide=new T.Object3D(),vertex=new T.Vector3(),statues=config.statues||[];
 gltf.scene.traverse(node=>{
  if(!node.isMesh)return;
  const geometry=node.geometry.clone(),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){node.getVertexPosition(i,vertex);vertex.applyMatrix4(node.matrixWorld).applyMatrix4(normalise);positions.setXYZ(i,vertex.x,vertex.y,vertex.z);}
  geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();
  const source=Array.isArray(node.material)?node.material[0]:node.material;
  const material=paintMaterial({map:source.map},'sculpture'),mesh=new T.InstancedMesh(geometry,material,statues.length);
  statues.forEach((item,i)=>{guide.position.fromArray(item.position);guide.position.y+=item.height*.16;guide.rotation.set(0,item.yaw,0);guide.scale.setScalar(item.height);guide.updateMatrix();mesh.setMatrixAt(i,guide.matrix);mesh.setColorAt(i,new T.Color(item.colour));});
  mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
 });
 const plinths=new T.InstancedMesh(new T.BoxGeometry(1,1,1),paintMaterial({color:'#cab99c'},'architecture'),statues.length);
 statues.forEach((item,i)=>{guide.position.fromArray(item.position);guide.position.y+=item.height*.08;guide.rotation.set(0,item.yaw,0);guide.scale.set(item.height*.65,item.height*.16,item.height*.60);guide.updateMatrix();plinths.setMatrixAt(i,guide.matrix);});plinths.castShadow=plinths.receiveShadow=true;plinths.computeBoundingSphere();scene.add(plinths);
 // Pigment pods: playful solid paint sculptures with frozen splash droplets.
 const pods=config.paintPods||[],parts=[];
 pods.forEach(([x,y,z,height],i)=>{
  parts.push({position:[x,y+height*.58,z],scale:[height*.61,height*.58,height*.61],colour:i});
  for(let j=0;j<9;j++){const a=j/9*Math.PI*2,r=height*(.55+(j%3)*.13);parts.push({position:[x+Math.cos(a)*r,y+.03+height*(j%2?1.10:.13),z+Math.sin(a)*r],scale:[height*.12,height*(j%2?.23:.05),height*.11],colour:i+j});}
 });
 const pigments=['#eb7c6b','#55b4bd','#e9c349','#bd82b0','#648ecd'];
 const pigmentMesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),paintMaterial({},'paint-tool'),parts.length);
 parts.forEach((p,i)=>{guide.position.fromArray(p.position);guide.rotation.set(i*.5,i*.9,i*.3);guide.scale.fromArray(p.scale);guide.updateMatrix();pigmentMesh.setMatrixAt(i,guide.matrix);pigmentMesh.setColorAt(i,new T.Color(pigments[p.colour%pigments.length]));});pigmentMesh.castShadow= pigmentMesh.receiveShadow=true;pigmentMesh.computeBoundingSphere();scene.add(pigmentMesh);
}
