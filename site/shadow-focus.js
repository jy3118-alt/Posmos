import * as T from 'three';

// Reuse the existing single shadow map. A close view spends its texels around
// the camera target instead of spreading them over the entire 300m island.
export function makeShadowFocus(sun,camera,controls,renderer,maxExtent){
 const direction=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(),focus=new T.Vector3(),offset=new T.Vector3(),worldUp=new T.Vector3(0,1,0),previous=new T.Vector3(Infinity,Infinity,Infinity),previousTarget=new T.Vector3(Infinity,Infinity,Infinity);
 let previousExtent=-1;
 return function update(){
  const extent=Math.min(maxExtent,Math.ceil(Math.max(14,controls.getDistance()*.65)/2)*2),step=2*extent/sun.shadow.mapSize.x;
  if(extent===previousExtent&&previousTarget.distanceToSquared(controls.target)<.0064)return;
  previousTarget.copy(controls.target);
  offset.copy(sun.position).sub(sun.target.position);direction.copy(offset).normalize();right.crossVectors(worldUp,direction).normalize();up.crossVectors(direction,right);
  focus.copy(controls.target);
  const x=focus.dot(right),y=focus.dot(up);
  focus.addScaledVector(right,Math.round(x/step)*step-x).addScaledVector(up,Math.round(y/step)*step-y);
  if(previous.distanceToSquared(focus)<1e-10&&extent===previousExtent)return;
  sun.target.position.copy(focus);sun.position.copy(focus).add(offset);sun.target.updateMatrixWorld();
  if(extent!==previousExtent){Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});sun.shadow.camera.updateProjectionMatrix();previousExtent=extent;}
  previous.copy(focus);renderer.shadowMap.needsUpdate=true;
 };
}
