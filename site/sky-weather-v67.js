import * as T from 'three';

// Three shared prototypes, one draw per shape, no matrix/texture upload per frame.
export function makeSkyWeather(scene,plan,gltf,lighting){
 const clock={value:0},batches=[],guide=new T.Object3D();gltf.scene.updateMatrixWorld(true);
 for(const shape of ['round','triangle','square']){
  const source=gltf.scene.getObjectByName('cloud-'+shape);if(!source?.isMesh)throw Error('Cloud prototype missing: '+shape);
  const members=plan.clouds.filter(p=>p.shape===shape),geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
  geometry.setAttribute('cloudPhase',new T.InstancedBufferAttribute(Float32Array.from(members,p=>p.phase),1));
  const material=new T.MeshLambertMaterial({color:'#ffffff',emissive:'#c8d7e1',emissiveIntensity:.10});
  material.onBeforeCompile=s=>{s.uniforms.cloudTime=clock;s.uniforms.cloudLit=lighting.lit;s.vertexShader='attribute float cloudPhase;uniform float cloudTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(cloudTime*.012+cloudPhase)*.12;transformed.z+=cos(cloudTime*.009+cloudPhase)*.07;');s.fragmentShader='uniform vec3 cloudLit;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`float cloudFace=1.;\n#if NUM_DIR_LIGHTS > 0\ncloudFace=smoothstep(-.35,.65,dot(normal,directionalLights[0].direction));\n#endif\noutgoingLight=diffuseColor.rgb*cloudLit*mix(vec3(.68,.77,.86),vec3(1.03),cloudFace);\n#include <opaque_fragment>`);};
  material.customProgramCacheKey=()=> 'small-cloud-drift-v67';
  const mesh=new T.InstancedMesh(geometry,material,members.length);mesh.name='scattered-cloud-'+shape;
  members.forEach((p,i)=>{guide.position.fromArray(p.position);guide.rotation.set(p.rx||0,p.yaw,p.rz||0);guide.scale.fromArray(p.scale);guide.updateMatrix();mesh.setMatrixAt(i,guide.matrix);mesh.setColorAt(i,new T.Color(p.colour));});
  mesh.castShadow=mesh.receiveShadow=false;mesh.computeBoundingSphere();scene.add(mesh);batches.push(mesh);
 }
 return {update:t=>clock.value=t,diagnostics:()=>({count:plan.clouds.length,shapes:Object.fromEntries(batches.map(m=>[m.name.replace('scattered-cloud-',''),m.count])),batches:batches.length,giantArch:false})};
}
