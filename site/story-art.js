import * as T from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {gameMaterial} from './game-material.js?v=33a550a771a7';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export async function makeStoryArt(scene,renderer,city,crowd,meta){
 if(!crowd?.source||!crowd.vatData)return;
 const po=await new GLTFLoader().loadAsync('./assets/polish-v18/royal-po-statue-web.glb?v=21a5f3fe1c77');
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 const gold=new T.MeshPhysicalMaterial({color:'#edbd4e',metalness:.96,roughness:.20,clearcoat:.36,clearcoatRoughness:.13,envMap:environment,envMapIntensity:1.35});
 const statue=new T.Group();statue.name='one-golden-royal-po-monument';po.scene.traverse(o=>{if(o.isMesh){o.material=gold;o.userData.keepCrayonMaterial=true;o.castShadow=o.receiveShadow=true;}});statue.add(po.scene);
 const x=-62,z=-55,y=city.height(x,z),h=33;statue.scale.setScalar(h);statue.rotation.y=-Math.atan2(55,62);statue.position.set(x,y+2.5,z);scene.add(statue);
 const base=new T.Mesh(new T.CylinderGeometry(8.5,10,2.5,48),new T.MeshStandardMaterial({color:'#eee0bd',roughness:.7}));base.position.set(x,y+1.25,z);base.receiveShadow=base.castShadow=true;scene.add(base);
 crowd.attachStatue?.(statue,gold);city.statue=statue;
 if(city.paintIslandMetrics)city.paintIslandMetrics.landmarks.push({id:'royal-statue',position:[x,y+2.5,z],height:h});
 // Decals are clipped to real house triangles, so they follow curved/irregular walls.
 const atlas=await new T.TextureLoader().loadAsync('./assets/forest/character-graffiti-atlas-v9.png?v=e047e382cfbb');atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=8;
 const material=new T.MeshToonMaterial({map:atlas,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:T.FrontSide}),matrix=new T.Matrix4(),ray=new T.Raycaster(),direction=new T.Vector3(),orientation=new T.Euler(),q=new T.Quaternion(),normal=new T.Vector3();let count=0;
 const batches=[];scene.traverse(o=>{if(o.isInstancedMesh&&['tripo-atelier','tripo-cottage','tripo-paint-hut','tripo-paint-mill','tripo-lookout'].includes(o.name))batches.push(o);});
 for(const batch of batches){for(let i=0;i<Math.min(batch.count,3);i++){batch.getMatrixAt(i,matrix);const wall=new T.Mesh(batch.geometry,batch.material);wall.matrixAutoUpdate=false;wall.matrix.copy(matrix);wall.updateMatrixWorld(true);const b=new T.Box3().setFromObject(wall),c=b.getCenter(new T.Vector3()),s=b.getSize(new T.Vector3());
  direction.set(0,0,-1).applyMatrix3(new T.Matrix3().setFromMatrix4(matrix)).normalize();ray.set(c.clone().addScaledVector(direction,-Math.max(s.x,s.z)*2),direction);const hit=ray.intersectObject(wall,false).find(h=>Math.abs(h.face.normal.y)<.7);if(!hit)continue;
  normal.copy(hit.face.normal).applyNormalMatrix(new T.Matrix3().getNormalMatrix(wall.matrixWorld)).normalize();q.setFromUnitVectors(new T.Vector3(0,0,1),normal);orientation.setFromQuaternion(q);
  const decal=new DecalGeometry(wall,hit.point,orientation,new T.Vector3(Math.min(s.x*.65,s.y*.66),s.y*.56,Math.min(1,s.z*.20))),uv=decal.attributes.uv,frame=count%4;
  const decalPositions=decal.attributes.position;for(let j=0;j<decalPositions.count;j++){decalPositions.setXYZ(j,decalPositions.getX(j)+normal.x*.018,decalPositions.getY(j)+normal.y*.018,decalPositions.getZ(j)+normal.z*.018);}
  for(let j=0;j<uv.count;j++)uv.setXY(j,(frame%2+uv.getX(j))/2,(1-Math.floor(frame/2)+uv.getY(j))/2);
  const mesh=new T.Mesh(decal,material);mesh.name='painted-character-graffiti';mesh.receiveShadow=true;scene.add(mesh);count++;
 }}city.graffitiCount=count;city.statueCount=1;city.statueCrown=true;city.statueCape=true;
}
