import * as T from 'three';
// Seeded landing sites are sampled once. The vertex shader moves every flake in one draw.
export function winterSnowSites(island,height,count){
 const weather=island.weather||{},centre=weather.centre||island.centre,radius=weather.radius||[54,54],ceiling=weather.ceiling||72;
 const positions=[],phases=[],floors=[];let seed=921024;
 const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 for(let attempt=0;phases.length<count&&attempt<count*24;attempt++){
  const a=random()*Math.PI*2,r=Math.sqrt(random()),x=centre[0]+Math.cos(a)*r*radius[0],z=centre[1]+Math.sin(a)*r*radius[1];
  const y=height(x,z);if(y<1||y>ceiling-7)continue;
  // Clear nearby banks as flakes drift, avoiding snow falling upward out of slopes.
  const floor=Math.max(y,height(x+.8,z),height(x-.8,z),height(x,z+.6),height(x,z-.6))+.3;
  positions.push(x,0,z);floors.push(floor);phases.push(random());
 }
 return {positions:new Float32Array(positions),phases:new Float32Array(phases),floors:new Float32Array(floors),ceiling,count:phases.length};
}
export function makeWinterWeather(scene,island,height,{mobile=false,night={value:0}}={}){
 if(!island)return {count:0,update(){}};
 const w=island.weather||{},sites=winterSnowSites(island,height,mobile?(w.mobileFlakes||700):(w.desktopFlakes||1900));
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(sites.positions,3));g.setAttribute('phase',new T.BufferAttribute(sites.phases,1));g.setAttribute('floorY',new T.BufferAttribute(sites.floors,1));
 const clock={value:0},m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{clock,night,ceiling:{value:sites.ceiling}},vertexShader:`
 attribute float phase,floorY;uniform float clock,ceiling;varying float fade;
 void main(){
  vec3 p=position;float range=max(7.,ceiling-floorY);
  float f=fract(phase-clock*(1.5+phase*.85)/range);
  p.y=floorY+f*range;p.x+=sin(clock*.34+phase*71.)*.8;p.z+=cos(clock*.23+phase*45.)*.6;
  vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;
  gl_PointSize=clamp((310.+phase*180.)/max(1.,-v.z),1.25,5.2);
  fade=smoothstep(0.,.025,f)*(1.-smoothstep(.92,1.,f));
 }`,fragmentShader:`
 uniform float night;varying float fade;
 void main(){float d=length(gl_PointCoord-.5),a=1.-smoothstep(.12,.5,d);
 gl_FragColor=vec4(mix(vec3(1.,.99,.98),vec3(.72,.84,1.),night),a*fade*.88);
 #include <colorspace_fragment>
 }`});
 const snow=new T.Points(g,m);snow.name='winter-local-snow';snow.frustumCulled=false;scene.add(snow);
 return {count:sites.count,ceiling:sites.ceiling,update(t,reducedMotion){snow.visible=!reducedMotion;if(!reducedMotion)clock.value=t;}};
}
