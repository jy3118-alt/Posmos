import * as T from 'three';

// Fixed-capacity droplets. No temporary mesh, texture or particle allocation
// during play. The mouth locator is attached to Po's actual animated Head bone.
export function createPaintSpitter(scene,actor,canvas,paper){
 const count=72,drops=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:'white'}),count);drops.name='po-paint-droplets';drops.frustumCulled=false;scene.add(drops);
 const life=new Float32Array(count),duration=new Float32Array(count),starts=new Float32Array(count*3),ends=new Float32Array(count*3),sizes=new Float32Array(count),guide=new T.Object3D(),origin=new T.Vector3(),target=new T.Vector3(),colour=new T.Color();let head=actor.model.getObjectByName('PoMouthEmitter');
 let clock=0,lastCycle=-1,cursor=0,burst=0,impacts=0;const impactsQueue=[];
 for(let i=0;i<count;i++){guide.scale.setScalar(0);guide.updateMatrix();drops.setMatrixAt(i,guide.matrix);}
 function emit(){
  const uv=paper.nextTarget(burst++),inks=paper.style.pigments;head?.getWorldPosition(origin);
  if(!head){origin.copy(actor.root.position);origin.y+=actor.height*.77;}
  canvas.updateMatrixWorld(true);target.set((uv[0]-.5)*.98,(.5-uv[1])*1.225,.035).applyMatrix4(canvas.matrixWorld);
  for(let j=0;j<12;j++){
   const i=cursor++%count,k=i*3;life[i]=.0001;duration[i]=.30+(j%4)*.035;sizes[i]=.020+(j%3)*.013;
   starts[k]=origin.x;starts[k+1]=origin.y;starts[k+2]=origin.z;
   ends[k]=target.x+Math.sin(j*2.4)*.07;ends[k+1]=target.y+Math.cos(j*2.4)*.07;ends[k+2]=target.z;
   drops.setColorAt(i,colour.set(inks[j%inks.length]));
  }
  drops.instanceColor.needsUpdate=true;impactsQueue.push({age:0,uv});
 }
 function update(dt,active){
  if(!active&&!life.some(v=>v>0)&&!impactsQueue.length)return;
  if(active){clock=actor.actions.get('spit').time;const cycle=Math.floor(clock/1.8),phase=clock%1.8;if(cycle!==lastCycle&&phase>=.90&&phase<1.10){lastCycle=cycle;emit();}}
  else{clock=0;lastCycle=-1;}
  for(let i=0;i<count;i++){
   if(life[i]>0){life[i]+=dt;const t=life[i]/duration[i],k=i*3;if(t>=1){life[i]=0;guide.scale.setScalar(0);}else{guide.position.set(T.MathUtils.lerp(starts[k],ends[k],t),T.MathUtils.lerp(starts[k+1],ends[k+1],t)+Math.sin(t*Math.PI)*.11,T.MathUtils.lerp(starts[k+2],ends[k+2],t));guide.scale.setScalar(sizes[i]*(1-t*.2));}}
   else guide.scale.setScalar(0);guide.updateMatrix();drops.setMatrixAt(i,guide.matrix);
  }
  drops.instanceMatrix.needsUpdate=true;
  for(let i=impactsQueue.length-1;i>=0;i--){const q=impactsQueue[i];q.age+=dt;if(q.age>.34){paper.impact(...q.uv);impacts++;impactsQueue.splice(i,1);}}
 }
 return {update,setActor(a){actor=a;head=a.model.getObjectByName('PoMouthEmitter');lastCycle=-1;},get diagnostics(){return {mouthLocator:!!head,bursts:burst,impacts,activeDroplets:life.reduce((n,v)=>n+(v>0),0),mouth:origin.toArray(),capacity:count};}};
}
