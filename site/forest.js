import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {paintMaterial} from './paint.js?v=4efd6bcfdd11';
import {makePaintedRooftops} from './paint-city.js?v=4efd6bcfdd11';
import {makeVillage,villageHeight} from './village.js?v=4efd6bcfdd11';
import {makePaintVillage,paintVillageHeight} from './village-v13.js?v=4efd6bcfdd11';
import {makePaintedGarden} from './paint-garden.js?v=4efd6bcfdd11';

let groundMode='rooftop',villageVersion=12;
// The saved forest and current rooftop share the same height interface.
export function forestHeight(x,z){
 if(groundMode==='village')return villageVersion===13?paintVillageHeight(x,z):villageHeight(x,z);
 if(groundMode==='rooftop')return 0;
 const radius=Math.hypot(x,z*.94),outside=Math.max(0,radius-6.2);
 const slope=.22+.47*T.MathUtils.smoothstep(-z,-1,4);
 const noise=(Math.sin(x*.31+z*.15)+Math.sin(z*.38-x*.23))*.16*T.MathUtils.smoothstep(outside,0,4);
 return -outside*slope-outside*outside*.004+noise;
}
export async function makeForest(scene,config,camera){
 groundMode=config.groundMode||'hillside';
 villageVersion=config.villageVersion||12;
 if(groundMode==='village')return villageVersion===13?makePaintVillage(scene,config,camera):makeVillage(scene,config,camera);
 let seed=831;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const textures=new T.TextureLoader(),loader=new GLTFLoader();
 const [vista,groundMap,tree,lod,facade,botanical,parkLod]=await Promise.all([textures.loadAsync(config.vista),textures.loadAsync(config.groundTexture),loader.loadAsync(config.treeModel),config.treeLod?loader.loadAsync(config.treeLod):null,config.facadeTexture?textures.loadAsync(config.facadeTexture):null,config.botanicalAtlas?textures.loadAsync(config.botanicalAtlas):null,config.parkTreeModel?loader.loadAsync(config.parkTreeModel):null]);
 vista.colorSpace=groundMap.colorSpace=T.SRGBColorSpace;if(facade){facade.colorSpace=T.SRGBColorSpace;facade.anisotropy=4;}if(botanical){botanical.colorSpace=T.SRGBColorSpace;botanical.anisotropy=4;}groundMap.wrapS=groundMap.wrapT=T.RepeatWrapping;groundMap.anisotropy=4;
 // A world-direction panorama: camera rotation changes the sampled bearing,
 // rather than keeping a city photograph glued behind the 3D buildings.
 const backgroundTint=new T.Color('#ffffff'),nightUniform={value:0},moonUniform={value:config.moonEnabled?1:0};
 const direction=new T.Vector3();camera.getWorldDirection(direction);
 const basis=new T.Matrix3(),initialYaw=Math.atan2(-direction.x,-direction.z),initialPitch=Math.asin(direction.y);
 const backgroundMaterial=new T.ShaderMaterial({depthWrite:false,depthTest:false,uniforms:{vista:{value:vista},tint:{value:backgroundTint},cameraBasis:{value:basis},aspect:{value:camera.aspect},tanHalfFov:{value:Math.tan(T.MathUtils.degToRad(camera.fov/2))},centerYaw:{value:initialYaw},centerPitch:{value:initialPitch},centerV:{value:config.panoramaCenterV??.36},panorama360:{value:config.panoramaMode==='equirectangular'?1:0},yawSpan:{value:T.MathUtils.degToRad(config.panoramaYawSpan||150)},pitchSpan:{value:T.MathUtils.degToRad(config.panoramaPitchSpan||95)},night:nightUniform},
  vertexShader:'varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,.99999,1.0);}',
  fragmentShader:`uniform sampler2D vista;uniform vec3 tint;uniform mat3 cameraBasis;uniform float aspect,tanHalfFov,centerYaw,centerPitch,centerV,panorama360,yawSpan,pitchSpan,night;varying vec2 screenUv;
   void main(){
    vec2 ndc=screenUv*2.-1.;vec3 ray=normalize(cameraBasis*vec3(ndc.x*aspect*tanHalfFov,ndc.y*tanHalfFov,-1.));
    float yaw=atan(-ray.x,-ray.z),delta=atan(sin(yaw-centerYaw),cos(yaw-centerYaw));
    vec2 imageUv=vec2(.5-delta/yawSpan,centerV+(asin(clamp(ray.y,-1.,1.))-centerPitch)/pitchSpan);
    if(panorama360>.5)imageUv=vec2(fract(.5-delta/6.28318530718),.5+asin(clamp(ray.y,-1.,1.))/3.14159265359);
    imageUv.y=clamp(imageUv.y,.001,.999);
    vec3 source=texture2D(vista,clamp(imageUv,vec2(.001),vec2(.999))).rgb;
    if(panorama360>.5){float seam=min(imageUv.x,1.-imageUv.x);if(seam<.015){vec3 opposite=texture2D(vista,vec2(1.-imageUv.x,imageUv.y)).rgb;source=mix((source+opposite)*.5,source,smoothstep(0.,.015,seam));}}
    vec3 sky=source*tint;
    float skyMask=smoothstep(-.025,.07,ray.y);
    vec2 starsUv=vec2(yaw,asin(ray.y))*vec2(71.,53.);vec2 cell=floor(starsUv),within=fract(starsUv)-.5;
    float hash=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
    float star=step(.991,hash)*exp(-dot(within,within)*150.);
    vec3 moonDirection=normalize(vec3(-.38,.45,-.74));float moonDistance=length(ray-moonDirection);
    float moon=(1.-smoothstep(.024,.028,moonDistance))*.7+exp(-moonDistance*moonDistance*95.)*.055;
    sky+=night*skyMask*(vec3(.65,.73,.94)*star+vec3(.85,.86,.94)*moon);
    gl_FragColor=vec4(sky,1.);
   }`});
 backgroundMaterial.color=backgroundTint;
 const background=new T.Mesh(new T.PlaneGeometry(2,2),backgroundMaterial);background.renderOrder=-100;background.frustumCulled=false;scene.add(background);
 function placeBackground(){camera.updateMatrixWorld(true);basis.setFromMatrix4(camera.matrixWorld);backgroundMaterial.uniforms.aspect.value=camera.aspect;backgroundMaterial.uniforms.tanHalfFov.value=Math.tan(T.MathUtils.degToRad(camera.fov/2))/camera.zoom;}

 let city=null;if(groundMode==='rooftop')city=makePaintedRooftops(scene,config,facade);else {
 const terrainGeometry=new T.PlaneGeometry(88,88,110,110);terrainGeometry.rotateX(-Math.PI/2);
 const positions=terrainGeometry.attributes.position,uv=terrainGeometry.attributes.uv,colors=[],color=new T.Color(),hillsideTint=new T.Color('#9ba78a');
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,forestHeight(x,z));uv.setXY(i,x/3.2,z/3.2);
  color.set('#ffffff').lerp(hillsideTint,T.MathUtils.smoothstep(Math.hypot(x,z),5.5,19));colors.push(color.r,color.g,color.b);
 }
 terrainGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrainGeometry.computeVertexNormals();
 const terrain=new T.Mesh(terrainGeometry,new T.MeshStandardMaterial({map:groundMap,vertexColors:true,roughness:1,envMapIntensity:.25}));terrain.receiveShadow=true;scene.add(terrain);
 }
 const matCanvas=document.createElement('canvas');matCanvas.width=matCanvas.height=256;const matCtx=matCanvas.getContext('2d');matCtx.fillStyle='#c26a55';matCtx.fillRect(0,0,256,256);for(let i=0;i<350;i++){matCtx.fillStyle=['#d08750','#e4aa66','#b65467','#aa667b'][i%4];matCtx.globalAlpha=.3+random()*.35;matCtx.fillRect(random()*256,random()*256,3+random()*38,1+random()*7);}matCtx.globalAlpha=1;matCtx.strokeStyle='#374f77';matCtx.lineWidth=9;matCtx.strokeRect(14,14,228,228);matCtx.strokeStyle='#e8ba61';matCtx.lineWidth=4;matCtx.strokeRect(25,25,206,206);
 const matTexture=new T.CanvasTexture(matCanvas);matTexture.colorSpace=T.SRGBColorSpace;const mat=new T.Mesh(new T.PlaneGeometry(2.5,2.25),paintMaterial({map:matTexture},'fabric'));mat.rotation.x=-Math.PI/2;mat.rotation.z=.08;mat.position.set(config.restMatPosition[0],.018,config.restMatPosition[1]);mat.receiveShadow=true;scene.add(mat);
 const blanket=new T.Mesh(new T.PlaneGeometry(2.3,1.3),paintMaterial({map:matTexture,color:'#ecc8b7'},'fabric'));blanket.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),config.loungeYaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2));blanket.position.set(config.loungePosition[0],forestHeight(...config.loungePosition)+.019,config.loungePosition[1]);blanket.receiveShadow=true;scene.add(blanket);

 const wind={value:0},treeMaterials=[];tree.scene.updateMatrixWorld(true);
 function normalizedParts(object){object.updateMatrixWorld(true);const box=new T.Box3().setFromObject(object),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());const normalization=new T.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new T.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));const parts=[];object.traverse(node=>{if(node.isMesh)parts.push(node.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(normalization,node.matrixWorld)));});return parts;}
 tree.scene.traverse(node=>{if(node.isMesh){const material=paintMaterial(node.material,'tree'),paintCompile=material.onBeforeCompile;material.onBeforeCompile=shader=>{paintCompile(shader);shader.uniforms.uTime=wind;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uTime*.32+instanceMatrix[3].x)*.002*pow(max(position.y,0.0),2.0);');};material.customProgramCacheKey=()=> 'paint-tree-wind-v5';treeMaterials.push(material);}});
 const dummy=new T.Object3D(),treeBatches=[];
 function plantTrees(parts,trees,castShadow){
  if(!castShadow)trees=trees.slice().sort((a,b)=>Math.hypot(a.position[0],a.position[2])-Math.hypot(b.position[0],b.position[2]));
  for(let part=0;part<parts.length;part++){const batch=new T.InstancedMesh(parts[part],treeMaterials[part%treeMaterials.length],trees.length);for(let i=0;i<trees.length;i++){const t=trees[i];dummy.position.fromArray(t.position);dummy.position.y+=forestHeight(dummy.position.x,dummy.position.z);dummy.rotation.set(0,t.yaw,0);dummy.scale.setScalar(t.height);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);batch.setColorAt(i,new T.Color(['#edba4b','#58b9ad','#d886a0','#a992d3'][i%4]));}batch.castShadow=castShadow;batch.receiveShadow=castShadow;batch.computeBoundingSphere();scene.add(batch);treeBatches.push({mesh:batch,full:trees.length,light:castShadow?trees.length:trees.filter(t=>Math.hypot(t.position[0],t.position[2])<115).length});}
 }
 plantTrees(normalizedParts(tree.scene),config.trees,true);
 if(parkLod&&city?.parkTrees?.length)plantTrees(normalizedParts(parkLod.scene),city.parkTrees,false);
 if(lod&&city?.trees?.length)plantTrees(normalizedParts(lod.scene),city.trees,false);
 if(lod&&config.hillsideTrees?.length)plantTrees(normalizedParts(lod.scene),config.hillsideTrees,false);
 const garden=botanical?makePaintedGarden(scene,config,botanical,wind,city):null;
 const rockGeometry=new T.IcosahedronGeometry(1,1),rockVertices=rockGeometry.attributes.position;
 for(let i=0;i<rockVertices.count;i++){const x=rockVertices.getX(i),y=rockVertices.getY(i),z=rockVertices.getZ(i),r=1+Math.sin(x*5+z*7)*.12;rockVertices.setXYZ(i,x*r,y*(.88+Math.sin(z*4)*.07),z*r);}rockGeometry.computeVertexNormals();
 const rocks=new T.InstancedMesh(rockGeometry,new T.MeshStandardMaterial({map:groundMap,color:'#b4b6a5',roughness:1}),28);
 for(let i=0;i<28;i++){const angle=random()*6.28,radius=6.5+random()*7,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;dummy.position.set(x,forestHeight(x,z)-.12,z);dummy.rotation.set(random(),random()*6.28,random()*.5);dummy.scale.set(.20+random()*.45,.15+random()*.26,.20+random()*.45);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;rocks.receiveShadow=true;rocks.computeBoundingSphere();if(groundMode!=='rooftop')scene.add(rocks);

 // Small moonflowers: shared stems and bell-shaped blossoms, with cheap soft halos.
 const plantCenters=config.moonflowers,plantCount=plantCenters.length*7;
 const stems=new T.InstancedMesh(new T.CylinderGeometry(.011,.018,.52,5),new T.MeshStandardMaterial({color:'#657f72',roughness:1}),plantCount);
 const bellGeometry=new T.LatheGeometry([new T.Vector2(.015,0),new T.Vector2(.035,.07),new T.Vector2(.085,.15),new T.Vector2(.13,.20),new T.Vector2(.145,.19)],10);
 const moonflowerMaterial=new T.MeshStandardMaterial({color:'#b2e9d8',emissive:'#79cfc3',emissiveIntensity:.65,side:T.DoubleSide,roughness:.74});
 const bells=new T.InstancedMesh(bellGeometry,moonflowerMaterial,plantCount);
 const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=64;const haloCtx=haloCanvas.getContext('2d'),haloGradient=haloCtx.createRadialGradient(32,32,1,32,32,30);haloGradient.addColorStop(0,'rgba(161,229,214,.35)');haloGradient.addColorStop(.35,'rgba(154,210,213,.12)');haloGradient.addColorStop(1,'rgba(123,196,206,0)');haloCtx.fillStyle=haloGradient;haloCtx.fillRect(0,0,64,64);
 const haloMaterial=new T.SpriteMaterial({map:new T.CanvasTexture(haloCanvas),transparent:true,depthWrite:false,opacity:.65,toneMapped:false,blending:T.AdditiveBlending});
 let flowerIndex=0;
 for(const center of plantCenters){for(let j=0;j<7;j++){const angle=random()*6.28,radius=random()*.37,x=center[0]+Math.cos(angle)*radius,z=center[1]+Math.sin(angle)*radius,height=.42+random()*.30,y=forestHeight(x,z);
  dummy.position.set(x,y+height*.5,z);dummy.rotation.set(0,0,(random()-.5)*.18);dummy.scale.set(1,height/.52,1);dummy.updateMatrix();stems.setMatrixAt(flowerIndex,dummy.matrix);
  dummy.position.set(x,y+height-.025,z);dummy.rotation.set((random()-.5)*.3,angle,(random()-.5)*.3);dummy.scale.setScalar(.75+random()*.4);dummy.updateMatrix();bells.setMatrixAt(flowerIndex,dummy.matrix);bells.setColorAt(flowerIndex,new T.Color(j%3?'#b9ecdc':'#d8c5ec'));flowerIndex++;
 }const halo=new T.Sprite(haloMaterial);halo.position.set(center[0],forestHeight(...center)+.55,center[1]);halo.scale.set(1.5,1.3,1);scene.add(halo);}
 stems.computeBoundingSphere();bells.computeBoundingSphere();scene.add(stems,bells);

 const fire=new T.Group();fire.position.set(config.firePosition[0],.05,config.firePosition[1]);scene.add(fire);const logMaterial=paintMaterial({color:'#83646f'},'wood');for(let i=0;i<5;i++){const log=new T.Mesh(new T.CylinderGeometry(.07,.09,.82,7),logMaterial);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/5;log.position.y=.1;log.castShadow=true;fire.add(log);}
 const flameMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:wind},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time;void main(){float y=vUv.y;float wave=sin(y*11.-time*2.6)*.035+sin(y*19.+time*1.7)*.018;float width=(1.-y)*.40+.025;float a=1.-smoothstep(width*.6,width,abs(vUv.x-.5-wave));a*=smoothstep(0.,.08,y)*(1.-smoothstep(.84,1.,y));vec3 c=mix(vec3(1.,.76,.20),vec3(1.,.23,.035),y);gl_FragColor=vec4(c*1.35,a*.82);}'});
 for(let i=0;i<3;i++){const flame=new T.Mesh(new T.PlaneGeometry(.6,.82),flameMaterial);flame.position.y=.52;flame.rotation.y=i*Math.PI/3;fire.add(flame);}
 const fireLight=new T.PointLight('#ffbc63',2.4,4,2);fireLight.position.set(config.firePosition[0],.65,config.firePosition[1]);scene.add(fireLight);
 const particleGeometry=new T.BufferGeometry(),particleData=[];for(let i=0;i<34;i++)particleData.push((random()-.5)*14,.5+random()*3.5,(random()-.5)*10);particleGeometry.setAttribute('position',new T.Float32BufferAttribute(particleData,3));
 const motesMaterial=new T.PointsMaterial({color:'#c5f0d8',size:.028,transparent:true,opacity:.45,depthWrite:false});motesMaterial.onBeforeCompile=shader=>{shader.uniforms.uTime=wind;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(uTime*.22+position.x)*.18;transformed.x+=sin(uTime*.17+position.z)*.13;');};motesMaterial.customProgramCacheKey=()=> 'dream-forest-motes';scene.add(new T.Points(particleGeometry,motesMaterial));
 let glowTarget=.65,glow=.65,nightTarget=0;placeBackground();
 return {city,treeMaterials,backgroundMaterial,fireLight,garden,setNight(amount){nightTarget=amount;glowTarget=.65+amount*.55;},setTime(key){glowTarget=key==='night'?1.2:key==='sunset'?.9:.65;nightTarget=key==='night'?1:0;},setQuality(light){for(const b of treeBatches)b.mesh.count=light?b.light:b.full;garden?.setQuality(light);city?.setQuality(light);},update(time,dt=.016){nightUniform.value=T.MathUtils.lerp(nightUniform.value,nightTarget,1-Math.exp(-dt*1.7));wind.value=time;placeBackground();fireLight.intensity=2.4+Math.sin(time*2.2)*.2;glow=T.MathUtils.lerp(glow,glowTarget,1-Math.exp(-dt*1.7));moonflowerMaterial.emissiveIntensity=glow*(1+Math.sin(time*.55)*.10);haloMaterial.opacity=glow*.60;},treeCount:config.trees.length+(config.hillsideTrees?.length||0)+(city?.trees.length||0)};
}

export function createAmbience(){
 let context=null,gain=null,wind=null,playing=false,birdTimer=null,volume=.28;
 function bird(){if(!playing)return;const now=context.currentTime;for(let i=0;i<3;i++){const oscillator=context.createOscillator(),envelope=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(1400+i*100,now+i*.16);oscillator.frequency.exponentialRampToValueAtTime(2200-i*150,now+i*.16+.065);envelope.gain.setValueAtTime(0,now+i*.16);envelope.gain.linearRampToValueAtTime(.045,now+i*.16+.025);envelope.gain.exponentialRampToValueAtTime(.0001,now+i*.16+.13);oscillator.connect(envelope);envelope.connect(gain);oscillator.start(now+i*.16);oscillator.stop(now+i*.16+.15);}birdTimer=setTimeout(bird,8000+Math.random()*11000);}
 return {async toggle(){if(!context){context=new AudioContext();gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);const buffer=context.createBuffer(1,context.sampleRate*8,context.sampleRate),data=buffer.getChannelData(0);let sample=0;for(let i=0;i<data.length;i++){sample=.98*sample+.02*(Math.random()*2-1);data[i]=sample*2.5;}wind=context.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;wind.connect(filter);filter.connect(gain);wind.start();}await context.resume();playing=!playing;gain.gain.setTargetAtTime(playing?volume:0,context.currentTime,.45);clearTimeout(birdTimer);if(playing)birdTimer=setTimeout(bird,2500);return playing;},setVolume(value){volume=value;if(context&&playing)gain.gain.setTargetAtTime(volume,context.currentTime,.1);},visibility(hidden){if(context){if(hidden){context.suspend();clearTimeout(birdTimer);}else if(playing){context.resume();birdTimer=setTimeout(bird,3000);}}}};
}
