import {makeMonumentReflections} from './world-monument-v97.js?v=5bc4fcffc216';
import {makeWinterWeather} from './world-winter-v92.js?v=5bc4fcffc216';
import {makeIslandWind} from './world-wind-v85.js?v=5bc4fcffc216';
import {oceanLighting} from './ocean-light-v77.js?v=5bc4fcffc216';
import {makeCoastFish} from './world-fish-v81.js?v=5bc4fcffc216';
import * as T from 'three';
import {MeshoptDecoder} from './vendor/meshoptimizer/meshopt_decoder.mjs?v=5bc4fcffc216';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {chooseBudget,queuedLoader,checkedJSON,yieldTask,recoveryState,installRecovery,shareModelTextures,prepareTextures,loadModel} from './runtime-budget-v69.js?v=5bc4fcffc216';
import {triangleSurface} from './world-surface-v81.js?v=5bc4fcffc216';
import {makeDistrictResidents} from './district-residents-v100.js?v=5bc4fcffc216';
import {makeDistrictGallery} from './district-gallery-v69.js?v=5bc4fcffc216';
import {makeDistrictCycle} from './district-cycle-v66.js?v=5bc4fcffc216';
import {makeClearCoast} from './world-ocean-v81.js?v=5bc4fcffc216';
import {makeLiquidWater} from './world-water-v81.js?v=5bc4fcffc216';
import {makePoExplorer} from './ocean-po-v100.js?v=5bc4fcffc216';
import {makeLandPlayer} from './land-player-v100.js?v=5bc4fcffc216';
import {prepareWorldDepth} from './depth-stability-v67.js?v=5bc4fcffc216';
import {sampleCoastRiver} from './coast-surface-v79.js?v=5bc4fcffc216';
try{localStorage.removeItem('posmos.colour-walk.v1');}catch{}
const query=new URLSearchParams(location.search),canvas=document.querySelector('#district'),qualityLight={value:.72};
const lighting={lit:{value:new T.Color('#fff8e8')},shadow:{value:new T.Color('#85839e')}};
const budget=chooseBudget({search:location.search,coarse:matchMedia('(pointer:coarse)').matches,touch:navigator.maxTouchPoints,memory:navigator.deviceMemory,mobileUA:/Android|iPhone|iPad|iPod/.test(navigator.userAgent),recovery:recoveryState()}),recovery=installRecovery(canvas),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),texturePool=new Map();
const mobileAssets=budget.mobile?checkedJSON('./assets/mobile-v69/manifest.json?v=9fb974229341').then(m=>new Map(Object.entries(m.assets).map(([k,v])=>[k.split('?')[0],v]))):Promise.resolve(new Map());
const load=queuedLoader(async file=>{const paths=await mobileAssets,g=await loadModel(loader,paths.get(file.split('?')[0])||file);return budget.mobile?shareModelTextures(g,texturePool):g;},budget.loadConcurrency);
function loading(value){const f=document.querySelector('#loading-fill');if(f)f.style.transform=`scaleX(${value})`;document.querySelector('#loading-progress')?.setAttribute('aria-valuenow',String(Math.round(value*100)));}
function cel(source,{skin=false,tree=false}={}){
 const m=new T.MeshLambertMaterial({color:source.color?.clone()||new T.Color('white'),map:source.map||null,normalMap:source.normalMap||null,normalScale:source.normalScale?.clone()||new T.Vector2(1,1),vertexColors:!!source.vertexColors,side:source.side??T.FrontSide,transparent:source.transparent??false,alphaTest:source.alphaTest??0});
 const hook=m.onBeforeCompile;
 m.onBeforeCompile=s=>{hook.call(m,s);s.uniforms.worldQuality=qualityLight;s.uniforms.districtLit=lighting.lit;s.uniforms.districtShade=lighting.shadow;s.fragmentShader='uniform float worldQuality;uniform vec3 districtLit,districtShade;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
  float facing=1.,coverage=1.;
  #if NUM_DIR_LIGHTS > 0
   facing=max(0.,dot(normal,directionalLights[0].direction));
   float original=max(.015,dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)));
   float lit=dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722))/original;
   float full=facing*RECIPROCAL_PI*dot(directionalLights[0].color,vec3(.2126,.7152,.0722));
   coverage=clamp(lit/max(.0001,full),0.,1.);
  #endif
  float band=mix(smoothstep(.18,.23,facing),.22+.78*smoothstep(-.08,.90,facing),worldQuality)*coverage;
  outgoingLight=diffuseColor.rgb*mix(${skin?'mix(districtShade,districtLit,.30)':'districtShade'},districtLit,band);
  outgoingLight*=1.;
  #include <opaque_fragment>`);};m.customProgramCacheKey=()=>`district-cel-${skin}-${tree}`;return m;
}
async function main(){
 loading(.03);canvas.dataset.phase='environment';canvas.dataset.budget=JSON.stringify(budget);
 const [plan,config,world]=await Promise.all([checkedJSON('./assets/world-v81/scene.json?v=0b19fc1254e0'),checkedJSON('./assets/forest/scene.json?v=5a0e2065edb1'),load('./assets/world-v81/world.glb?v=de8d9785aac7')]);
 const scene=new T.Scene();scene.background=new T.Color('#b7e8f8');scene.fog=new T.Fog('#b7e8f8',900,5000);
 const renderer=new T.WebGLRenderer({canvas,antialias:budget.antialias,powerPreference:'high-performance',logarithmicDepthBuffer:true});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.LinearToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const camera=new T.PerspectiveCamera(42,1,.15,12000),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=5;controls.maxDistance=innerWidth/innerHeight<.8?1100:720;controls.maxPolarAngle=Math.PI*.48;
 const hemi=new T.HemisphereLight('#b6ddf2','#716488',1.1),sun=new T.DirectionalLight('#ffefce',3);scene.add(hemi,sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(budget.shadowSize,budget.shadowSize);Object.assign(sun.shadow.camera,{left:-130,right:130,top:130,bottom:-130,near:1,far:350});if(plan.worldBounds){const e=plan.worldBounds.shadowExtent;Object.assign(sun.shadow.camera,{left:-e,right:e,top:e,bottom:-e,near:1,far:1600});sun.shadow.mapSize.setScalar(budget.mobile?1536:3072);}canvas.dataset.budget=JSON.stringify({...budget,shadowSize:sun.shadow.mapSize.x,coastDepthSize:plan.worldBounds?(budget.mobile?1024:1536):(budget.mobile?768:1024)});sun.shadow.normalBias=.07;sun.shadow.bias=-.00012;
 // Stable world-anchored shadow projection. Orbiting the camera never moves it.
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 world.scene.updateMatrixWorld(true);const terrainMeshes=[],walkable=[],snowReceivers=[],opaque=[],batches=new Map(),staticGeos=[],water=[],papers=[],clouds=[],paintGeos=[],floatingGeos=[];
 world.scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);
  if(/^(Winter90_Cabin_|Winter92_Building_|Winter92_RoofSnow_|Walkable_Winter92_FrozenLake)/.test(o.name)||/^(Winter90_Cabin_|Winter92_Building_)/.test(o.parent?.name||''))snowReceivers.push(g.clone());
  if(o.name.startsWith('Navigation_')){walkable.push(g);return;}
  if(o.name.startsWith('Walkable_')){walkable.push(g);if(o.name.startsWith('Walkable_Terrain'))terrainMeshes.push(g);}
  if(o.name.startsWith('River_Water')){water.push(g);return;}
  if(o.name.startsWith('GalleryPaper'))return;
  if(/^Floating(?:88|89)_/.test(o.name)){floatingGeos.push(g);return;}
  if(/^Paint(?:87|89)_/.test(o.name)){paintGeos.push(g);return;}
  if(o.name.startsWith('Cloud')){clouds.push(g);return;}
  if(/^(tree_|grass_|plant_|rock_|coral_)/.test(o.name)||/^(tree_|grass_|plant_|rock_|coral_)/.test(o.parent?.name||'')||['tree','village','art-prop'].includes(o.userData.assetKind)||['tree','village','art-prop'].includes(o.parent?.userData.assetKind)){
   const key=o.geometry.uuid;if(!batches.has(key))batches.set(key,{geometry:o.geometry,source:o.material,originalAppearance:o.userData.originalAppearance||o.parent?.userData.originalAppearance,matrices:[],name:/^(tree_|grass_|plant_|rock_|coral_)/.test(o.parent?.name||'')?o.parent.name:o.name});batches.get(key).matrices.push(o.matrixWorld.clone());g.dispose();return;
  }
  staticGeos.push(g);
 });
 const terrainGround=triangleSurface(terrainMeshes,-65),ground=triangleSurface(walkable,-65);
 const coast=await makeClearCoast(scene,camera,terrainGround,0,null,{shoreDetail:true,depthSize:plan.worldBounds?(budget.mobile?1024:1536):(budget.mobile?768:1024),depthWidth:plan.worldBounds?.coastWidth||360,depthOrigin:plan.worldBounds?.coastOrigin,facetedClouds:true});
 const material=cel({color:new T.Color('white'),vertexColors:true});const waterLight={time:coast.waterContext.clock,night:coast.waterContext.night};oceanLighting(material,waterLight,{ground:true});
 // Common vertex palette makes kit parts, authored land, and props one draw group.
 const clean=g=>{const out=g.index?g.toNonIndexed():g.clone();for(const key of Object.keys(out.attributes))if(!['position','normal','color'].includes(key))out.deleteAttribute(key);const source=out.attributes.color,colors=new Float32Array(out.attributes.position.count*3).fill(1);if(source)for(let i=0;i<source.count;i++){colors[i*3]=source.getX(i);colors[i*3+1]=source.getY(i);colors[i*3+2]=source.getZ(i);}out.setAttribute('color',new T.Float32BufferAttribute(colors,3));return out;};
 const prepared=staticGeos.map(clean),staticMesh=new T.Mesh(mergeGeometries(prepared),material);for(const g of prepared)g.dispose();staticMesh.name='coast-authored-surface';staticMesh.receiveShadow=staticMesh.castShadow=true;scene.add(staticMesh);opaque.push(staticMesh);
 // Opaque smooth paint is one merged draw group. The existing art lighting keeps its palette coherent.
 if(paintGeos.length){
  const pieces=paintGeos.map(clean),paintMaterial=cel({color:new T.Color('white'),vertexColors:true});
  oceanLighting(paintMaterial,waterLight,{ground:true});
  const paintMesh=new T.Mesh(mergeGeometries(pieces),paintMaterial);paintMesh.name='paint-kitbash-surfaces';paintMesh.receiveShadow=true;paintMesh.castShadow=false;scene.add(paintMesh);opaque.push(paintMesh);
  for(const g of [...pieces,...paintGeos])g.dispose();
 }
 const snowSurface=triangleSurface(snowReceivers),snowLanding=(x,z)=>Math.max(terrainGround(x,z),snowSurface(x,z));
 const winterWeather=makeWinterWeather(scene,plan.winterIsland,snowLanding,{mobile:budget.mobile,night:coast.waterContext.night});
 for(const g of snowReceivers)g.dispose();
 const motionPreference=matchMedia('(prefers-reduced-motion: reduce)'),wind=makeIslandWind({reducedMotion:motionPreference.matches});
 motionPreference.addEventListener('change',event=>wind.setReducedMotion(event.matches));
 const livingMaterial=cel({color:new T.Color('white'),vertexColors:true});oceanLighting(livingMaterial,waterLight,{ground:true});wind.patch(livingMaterial);
 const texturedMaterials=new Map(),metalMonuments=[];
 for(const {geometry,source,originalAppearance,matrices,name}of batches.values()){
  const motionKind=name.startsWith('tree_')?'tree':/^plant_detail(?:84|85)_/.test(name)?'plant':null;
  let renderMaterial=motionKind?livingMaterial:material;
  if(source?.map||originalAppearance){
   if(!texturedMaterials.has(source.uuid)){
    const m=source.metalness>=.95?source.clone():cel({...source,vertexColors:!!geometry.attributes.color});m.vertexColors=!!geometry.attributes.color;m.name=source.name;m.alphaTest=/^Leaves/.test(source.name)||source.alphaTest>0?.45:0;m.transparent=false;if(m.map)m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    if(motionKind)wind.patch(m);texturedMaterials.set(source.uuid,m);
   }
   renderMaterial=texturedMaterials.get(source.uuid);
  }
  const b=new T.InstancedMesh(geometry,renderMaterial,matrices.length);b.name=name;matrices.forEach((m,i)=>b.setMatrixAt(i,m));b.castShadow=!/grass_|plant_|coral_/.test(name);b.receiveShadow=!(source?.metalness>=.95);if(source?.metalness>=.95)metalMonuments.push(b);b.computeBoundingSphere();if(motionKind)wind.prepare(b,motionKind);scene.add(b);opaque.push(b);}
 const floating=floatingGeos.map(g=>{const m=new T.Mesh(g,material);m.name='watercraft-prop';m.castShadow=m.receiveShadow=true;scene.add(m);opaque.push(m);return m;});
 const preparedClouds=clouds.map(clean);const cloudMesh=new T.Mesh(mergeGeometries(preparedClouds),new T.MeshLambertMaterial({color:'#ffffff',vertexColors:true,emissive:'#9daec3',emissiveIntensity:.24}));scene.add(cloudMesh);for(const g of preparedClouds)g.dispose();for(const g of [...staticGeos,...clouds])g.dispose();load.forget('./assets/world-v81/world.glb?v=de8d9785aac7');
 for(const g of water){const mesh=new T.Mesh(g,makeLiquidWater(coast.waterContext,{river:true,pool:plan.upperPool}));mesh.name='coastal-river';scene.add(mesh);}
 const atlas=await new T.TextureLoader().loadAsync('./assets/forest/character-graffiti-atlas-v9.png?v=e047e382cfbb'),gallery=await makeDistrictGallery(atlas);atlas.dispose();atlas.image=null;
 plan.gallery.forEach((p,i)=>{const o=new T.Mesh(new T.PlaneGeometry(1.2,1.5),new T.MeshBasicMaterial({map:gallery.entries[i].map,side:T.DoubleSide}));o.position.fromArray(p);o.name='coast-gallery-'+i;scene.add(o);o.geometry.computeBoundingSphere();gallery.entries[i].mesh=o;papers.push(o);});
 const city={height:ground,terrainHeight:terrainGround,sea:0,buildings:plan.buildings,treePositions:plan.treePositions,swimmingBay:plan.swimmingBay,crowdRegions:plan.crowdRegions,lakeCrossings:[],visitorRoutes:Object.entries(plan.routes).filter(([k])=>k.endsWith('-link')),river:plan.river,streamSurface:{disturbances:coast.waterContext.disturbances.value}};
 city.streamNear=(x,z,out={})=>{sampleCoastRiver(plan.river,x,z,out);return out.d<out.width+2.7?out:null;};
 city.waterAt=(x,z,out={})=>{const r=city.streamNear(x,z,out);if(!r||r.d>r.width)return null;const depth=r.level-ground(x,z);if(depth<.035)return null;r.waterDepth=depth;r.surfaceY=r.level;return r;};
 // Encounter sight checks use authored terrain and house footprint bounds.
 city.visiblePair=(a,b)=>{const dx=b.x-a.x,dz=b.z-a.z;for(let i=1;i<16;i++){const t=i/16,x=a.x+dx*t,z=a.z+dz*t,y=T.MathUtils.lerp(a.y,b.y,t)+1.2;if(terrainGround(x,z)>y)return false;for(const p of plan.buildings)if(Math.abs(x-p.x)<p.width*.5&&Math.abs(z-p.z)<p.depth*.5&&y<p.y+p.height)return false;}return true;};
 loading(.60);canvas.dataset.phase='residents';const residents=await makeDistrictResidents(scene,renderer,camera,city,plan,config,load,cel);
 const cycle=makeDistrictCycle(scene,sun,hemi,coast,lighting,[],config.timeCycle);cycle.setAnchor(new T.Vector3(...(plan.worldBounds?.shadowCentre||[0,4,0])),plan.worldBounds?4.5:1);
 const crowdActors=residents.crowd.placements.map(p=>{const body=p.body||{x:p.position[0],y:p.position[1],z:p.position[2]};p.pickBody=body;return {id:'crowd:'+p.id,skin:p.skin,body,height:p.height,person:p,get root(){return {visible:!p.social};}};});
 const actors=[...residents.actors,...crowdActors],ray=new T.Raycaster(),pointer=new T.Vector2(),point=new T.Vector3(),sphere=new T.Sphere(),projected=new T.Vector3();let followed=null,down=null,multiTouch=false;const pointers=new Set();
 const actorY=a=>a.person?.water?.2:a.body.y+a.height*.55;
 const ring=new T.Mesh(new T.RingGeometry(.73,.79,32),new T.MeshBasicMaterial({color:'#fff2cf',transparent:true,opacity:.6,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
 const fallbackViews={village:{position:[43,30,51],target:[-4,5,-6]},porch:{position:[-1,19,15],target:[-21,8,-10]},shore:{position:[24,16,51],target:[-7,3,19]},overview:plan.camera};const views=plan.views||fallbackViews;
 let currentView=null,portraitMode=innerWidth/innerHeight<.8;function view(id){currentView=id;const v=views[id]||views.village;followed=null;ring.visible=false;camera.position.fromArray(v.position);controls.target.fromArray(v.target);if(innerWidth/innerHeight<.8)camera.position.sub(controls.target).multiplyScalar(id==='overview'?2.6:1.45).add(controls.target);controls.update();}
 const fish=makeCoastFish(scene,terrainGround,waterLight,cel,{mobile:budget.mobile});
 const habitat={collision:plan.underwaterRocks||[],update:fish.update,diagnostics:()=>({fish:fish.count,corals:plan.corals,source:'MiniPoly CC0 / CC BY 3.0; THREE.Terrain MIT',authored:true})};
 let land;const explore=makePoExplorer({scene,camera,controls,canvas,height:terrainGround,habitat,coast,gltf:await load(config.waterActivities.model),cel,onEnter:()=>{land?.suspend();followed=null;ring.visible=false;controls.update();},onLeave:()=>land?.resume()});
 land=makeLandPlayer({camera,controls,canvas,actors,residents,height:ground,buildings:plan.buildings,isDiving:()=>explore.active,leaveWater:()=>explore.leave(),onSelect:()=>{followed=null;ring.visible=false;}});
 canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size>1){multiTouch=true;down=null;followed=null;ring.visible=false;return;}down={x:e.clientX,y:e.clientY,button:e.button,at:performance.now()};if(e.button===2){followed=null;ring.visible=false;}});
 canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);down=null;if(!pointers.size)multiTouch=false;});
 canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(multiTouch){down=null;if(!pointers.size)multiTouch=false;return;}const p=down;down=null;if(explore.active||!p||p.button!==0||performance.now()-p.at>250||Math.hypot(e.clientX-p.x,e.clientY-p.y)>6)return;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.far=Infinity;ray.setFromCamera(pointer,camera);let best=null,distance=Infinity;
  for(const a of actors){if(!a.root.visible)continue;sphere.center.set(a.body.x,actorY(a),a.body.z);sphere.radius=a.height*.45;if(ray.ray.intersectSphere(sphere,point)){const d=camera.position.distanceTo(point);if(d<distance){best=a;distance=d;}}}
  const hit=ray.intersectObjects(papers,false)[0];if(hit&&hit.distance<distance){ray.far=hit.distance-.1;if(!ray.intersectObjects(opaque,false).length){gallery.show(papers.indexOf(hit.object));return;}}
  if(best){ray.far=distance-.2;if(!ray.intersectObjects(opaque,false).length){land.select(best);}}
 });
 function resize(){const portrait=innerWidth/innerHeight<.8,changed=portrait!==portraitMode;portraitMode=portrait;controls.maxDistance=innerWidth/innerHeight<.8?1100:720;const dpr=Math.min(devicePixelRatio,budget.dpr),scale=Math.min(1,Math.sqrt(budget.pixelLimit/(innerWidth*innerHeight*dpr*dpr)));renderer.setSize(Math.round(innerWidth*dpr*scale),Math.round(innerHeight*dpr*scale),false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(changed&&currentView&&!explore.active&&!land?.active&&!followed)view(currentView);}addEventListener('resize',resize);resize();view(query.get('view')||'overview');
 const monumentReflections=makeMonumentReflections({scene,renderer,meshes:metalMonuments,position:plan.monuments?.[0]?.position||[0,0,0],mobile:budget.mobile,canvas});
 loading(.86);canvas.dataset.phase='shaders';canvas.dataset.depth=JSON.stringify(prepareWorldDepth(scene));await prepareTextures(renderer,scene);monumentReflections.capture(coast.waterContext.night.value,cycle.diagnostics().sunset);await renderer.compileAsync(scene,camera);await residents.warmup();await explore.warmup(renderer);loading(1);document.querySelector('#loading').remove();canvas.dataset.phase='ready';canvas.dataset.ready='true';canvas.dataset.version='81';canvas.dataset.release='100';land.select(actors.find(a=>a.id==='district:0'));canvas.dataset.environment=JSON.stringify({trees:plan.treeCount,corals:plan.corals,houses:plan.buildings.length,drawGroups:batches.size+3+(paintGeos.length?1:0)+floating.length,artRevision:plan.artRevision||79,texturedMaterials:texturedMaterials.size,glb:'world.glb',effects:false,sharedTerrain:true,clouds:plan.clouds||null,upperPool:plan.upperPool||null,detailCounts:plan.detailCounts||null,finish:plan.finish||null,villageAssets:plan.villageAssets||null,paintKitbash:plan.paintKitbash||null,playgroundAssets:plan.playgroundAssets||null,sceneryExpansion:plan.sceneryExpansion||null,monuments:plan.monuments||[],winterIsland:plan.winterIsland?{...plan.winterIsland,bridge:{...plan.winterIsland.bridge,deckSamples:undefined},snowParticles:winterWeather.count}:null,wind:wind.diagnostics()});
 let last=performance.now(),clock=0,lastDiagnostics=0,lastShadow=0,displayedWorks=0;const frameTimes=[];
 addEventListener('visibilitychange',()=>{last=performance.now();});
 function animate(now){requestAnimationFrame(animate);const ms=now-last,dt=Math.min(.05,ms/1000);last=now;if(document.hidden||gallery.open||recovery.lost)return;clock+=dt;
  land.prepare(dt);residents.prepare(dt,clock);residents.update(dt,clock);for(const p of residents.crowd.placements)if(p.water)Object.assign(p.pickBody,{x:p.position[0],y:p.position[1],z:p.position[2]});cycle.update(dt);
  if(residents.completedWorks>displayedWorks&&residents.latestPicture)displayedWorks=gallery.complete(residents.latestPicture,residents.lastWork,residents.latestWork);
  if(followed&&!explore.active){point.set(followed.body.x,actorY(followed),followed.body.z).sub(controls.target).multiplyScalar(1-Math.exp(-dt*5));camera.position.add(point);controls.target.add(point);ring.position.set(followed.body.x,followed.person?.water?.05:followed.body.y+.06,followed.body.z);}
  if(!explore.active&&!land.active){controls.update();camera.position.y=Math.max(camera.position.y,ground(camera.position.x,camera.position.z)+1.5,1.5);}
  explore.update(dt,clock);land.update(dt,clock);coast.update(clock);winterWeather.update(clock,motionPreference.matches);for(let i=0;i<floating.length;i++)floating[i].position.y=motionPreference.matches?0:Math.sin(clock*.7+i*1.3)*.035;residents.crowd.detailUpdate();wind.update(clock);cloudMesh.position.x=Math.sin(clock*.015)*4;cloudMesh.position.z=-Math.sin(clock*.015)*2;
  const cloudNight=coast.waterContext.night.value;cloudMesh.material.color.setRGB(1-cloudNight*.62,1-cloudNight*.48,1-cloudNight*.28);cloudMesh.material.emissiveIntensity=.24*(1-cloudNight)+.025;
  monumentReflections.update(now,cloudNight,cycle.diagnostics().sunset,explore.active);
  if(now-lastShadow>100){renderer.shadowMap.needsUpdate=true;lastShadow=now;}renderer.render(scene,camera);
  if(clock>5&&ms<500){frameTimes.push(ms);if(frameTimes.length>300)frameTimes.shift();}
  if(budget.inspect&&now-lastDiagnostics>1500){const sorted=frameTimes.slice().sort((a,b)=>a-b);canvas.dataset.performance=JSON.stringify({viewport:[innerWidth,innerHeight],buffer:[canvas.width,canvas.height],samples:sorted.length,p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)],longFrames:sorted.filter(t=>t>50).length});canvas.dataset.renderer=JSON.stringify({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures});canvas.dataset.residents=JSON.stringify(residents.diagnostics());canvas.dataset.gallery=JSON.stringify(gallery.diagnostics());canvas.dataset.camera=JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray()});canvas.dataset.following=followed?.id||'';canvas.dataset.actorScreens=JSON.stringify(actors.filter(a=>a.root.visible).map(a=>{projected.set(a.body.x,actorY(a),a.body.z).project(camera);return {id:a.id,skin:a.skin,x:Math.round((projected.x*.5+.5)*innerWidth),y:Math.round((.5-projected.y*.5)*innerHeight),visible:Math.abs(projected.x)<1&&Math.abs(projected.y)<1};}));canvas.dataset.timeCycle=JSON.stringify(cycle.diagnostics());canvas.dataset.wind=JSON.stringify(wind.diagnostics());lastDiagnostics=now;}
 }
 requestAnimationFrame(animate);
}
main().catch(e=>{canvas.dataset.phase='failed';canvas.dataset.error=e.message;recovery.fail(e);});
