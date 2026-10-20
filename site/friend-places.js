import * as T from 'three';
import {groundPatch} from './friend-locomotion.js?v=50e1064b0d79';

// Resolve roofs once against real Tripo geometry. No per-frame roof raycasts.
export function villageFriendPlaces(scene,city,random){
 const batches=[];scene.traverse(o=>{if(o.isInstancedMesh&&/^tripo-(atelier|cottage|lookout|paint-hut|paint-mill)$/.test(o.name))batches.push(o);});
 const matrix=new T.Matrix4(),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),normal=new T.Vector3(),normalMatrix=new T.Matrix3(),roofs=[];
 for(const b of city.buildings){const peers=city.buildings.filter(o=>o.asset===b.asset),index=peers.indexOf(b),pieces=[];
  for(const batch of batches.filter(o=>o.name==='tripo-'+b.asset)){batch.getMatrixAt(index,matrix);const mesh=new T.Mesh(batch.geometry,batch.material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(matrix);mesh.updateMatrixWorld(true);pieces.push(mesh);}
  const hitAt=(x,z)=>{ray.set(new T.Vector3(x,b.top+6,z),down);return ray.intersectObjects(pieces,false)[0];};
  for(const [u,v]of [[0,0],[-.18,0],[.18,0],[0,-.18],[0,.18],[-.18,-.18],[.18,.18],[-.3,0],[.3,0]]){const x=b.x+u*b.width,z=b.z+v*b.depth,hit=hitAt(x,z);if(!hit)continue;normal.copy(hit.face.normal).applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld));if(normal.y<.68||hit.point.y<city.height(x,z)+b.h*.4)continue;
   const probes=[[.38,0],[-.38,0],[0,.38],[0,-.38]].map(([dx,dz])=>hitAt(x+dx,z+dz));if(probes.some(h=>!h||Math.abs(h.point.y-hit.point.y)>.38))continue;
   roofs.push({x,z,y:hit.point.y+.035,zone:'지붕',buildingId:b.id,yaw:b.yaw,flat:probes.every(h=>Math.abs(h.point.y-hit.point.y)<.12)});break;
  }
 }
 // Stratified candidates cover the actual entire island, including outer bays.
 const ground=[];for(let z=-124;z<=124;z+=4.8)for(let x=-124;x<=124;x+=4.8){const px=x+(random()-.5)*2.5,pz=z+(random()-.5)*2.5,y=city.height(px,pz);if(y<city.sea+1.0||city.waterAt?.(px,pz))continue;
  const slope=Math.max(...[[.7,0],[-.7,0],[0,.7],[0,-.7]].map(([dx,dz])=>Math.abs(city.height(px+dx,pz+dz)-y)))/.7;if(slope>.68)continue;
  if(city.buildings.some(b=>Math.hypot(px-b.x,pz-b.z)<Math.max(b.width,b.depth)*.54+1.1)||(city.exclusions||[]).some(e=>Math.hypot(px-e.x,pz-e.z)<e.radius)||(city.treePositions||[]).some(t=>Math.hypot(px-t.x,pz-t.z)<Math.min(1.6,t.h*.21)))continue;
  ground.push({x:px,z:pz,y:y+.035,flat:groundPatch(city.height,px,pz).flat,zone:y<city.sea+8?'해안':y>17?'언덕':Math.hypot(px,pz)>68?'바깥 숲':'마을 정원'});
 }
 const chosen=[],used=new Set();let groundTurn=0;
 function takeGround(preferFlat=false){const preferred=['언덕','해안','바깥 숲','마을 정원'][groundTurn++%4];let best=null,bestScore=-1;for(let i=0;i<ground.length;i++){if(used.has(i))continue;const p=ground[i];let spacing=chosen.length?Infinity:Math.hypot(p.x,p.z);for(const q of chosen)spacing=Math.min(spacing,Math.hypot(p.x-q.x,p.z-q.z));const score=spacing+(p.zone===preferred&&spacing>3?1000:0)+(preferFlat&&['바깥 숲','마을 정원'].includes(preferred)&&p.flat&&spacing>3?2000:0);if(score>bestScore){bestScore=score;best={...p,index:i};}}if(!best)throw Error('친구들이 머무를 안전한 지형을 찾지 못했습니다.');used.add(best.index);chosen.push(best);return best;}
 function takeRoof(){const p=roofs.shift();if(p){chosen.push(p);return p;}return takeGround();}
 return {takeGround,takeRoof,roofCount:roofs.length,candidateCount:ground.length};
}
