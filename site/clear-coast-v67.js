import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {makeLiquidWater} from './liquid-water-v67.js?v=573fab3a318f';

// Painted panorama and shared liquid surfaces use the existing CC0 1K HDRI.
// Shared sunlight and time keep the background coherent through a full orbit.
export async function makeClearCoast(scene,camera,height,seaLevel,bay,options={}){
 const loader=new T.TextureLoader();const [skyTexture,hdr]=await Promise.all([loader.loadAsync('./assets/crown-v16/painted-sky.png?v=1297b91e04d0'),new RGBELoader().loadAsync('./assets/crown-v16/kloppenheim_06_puresky_1k.hdr?v=206c67e3a1b9')]);
 skyTexture.colorSpace=T.SRGBColorSpace;skyTexture.wrapS=T.RepeatWrapping;skyTexture.anisotropy=4;hdr.mapping=T.EquirectangularReflectionMapping;hdr.wrapS=T.RepeatWrapping;scene.environment=hdr;scene.environmentIntensity=.45;
 const time={value:0},night={value:0},sunset={value:0},tint=new T.Color('white'),sunDirection=new T.Vector3(-31,23,26).normalize();
 const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 float clouds(vec2 p){return noise(p)*.57+noise(p*2.03+7.)*.28+noise(p*4.09-3.)*.15;}`;
 const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{skyTexture:{value:skyTexture},tint:{value:tint},night,sunset,clock:time,sunDirection:{value:sunDirection}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
 varying vec3 direction;uniform sampler2D skyTexture;uniform vec3 tint,sunDirection;uniform float night,clock,sunset;${noise}
 void main(){vec3 d=normalize(direction);float h=pow(clamp(d.y,0.,1.),.52);
 vec2 uv=vec2(fract(atan(d.z,d.x)/6.2831853+.5+clock*.000035),.5+asin(clamp(d.y,-1.,1.))/3.14159265);
 vec3 painted=texture2D(skyTexture,uv).rgb;float seam=1.-smoothstep(0.,.018,min(uv.x,1.-uv.x));vec3 edge=(texture2D(skyTexture,vec2(.01,uv.y)).rgb+texture2D(skyTexture,vec2(.99,uv.y)).rgb)*.5;painted=mix(painted,edge,seam);
 vec3 c=painted;float cover=smoothstep(.35,.85,painted.r);
 vec3 dusk=mix(vec3(.92,.34,.12),vec3(.53,.17,.32),smoothstep(0.,.45,h));dusk=mix(dusk,vec3(.105,.085,.27),smoothstep(.35,1.,h));float cloudMask=smoothstep(.32,.84,dot(painted,vec3(.2126,.7152,.0722)));vec3 cloudLight=mix(vec3(.33,.16,.29),vec3(1.0,.67,.32),smoothstep(.20,.86,painted.r));dusk=mix(dusk,cloudLight,cloudMask*.9);c=mix(c,dusk,sunset);
 float alignment=max(dot(d,sunDirection),0.);c+=vec3(1.,.87,.58)*(pow(alignment,18.)*.14+pow(alignment,170.)*.32);
 c*=tint;vec3 nightSky=mix(vec3(.024,.065,.14),vec3(.003,.012,.045),h);c=mix(c,nightSky+cover*vec3(.035,.055,.085),night*.88);
 float stars=step(.997,hash(floor(vec2(atan(d.z,d.x),asin(d.y))*vec2(160.,140.))));c+=vec3(.52,.70,1.)*stars*night*smoothstep(.06,.2,d.y);
 vec3 horizon=mix(vec3(.18,.54,.96),vec3(.86,.31,.16),sunset);horizon=mix(horizon,vec3(.024,.065,.14),night*.88);c=mix(horizon,c,smoothstep(-.015,.12,d.y));
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>}`});skyMat.color=tint;
 const sky=new T.Mesh(new T.SphereGeometry(9500,24,16),skyMat);sky.name='clear-summer-sky';sky.renderOrder=-100;scene.add(sky);
 const sun=new T.Mesh(new T.SphereGeometry(7.5,24,16),new T.MeshBasicMaterial({color:'#fff6cf',toneMapped:false}));sun.name='sun-disc';sun.position.copy(sunDirection).multiplyScalar(450);sky.add(sun);
 const detailed=!!options.shoreDetail,n=detailed?(options.depthSize||512):256,span=detailed?(options.depthWidth||128):320,pixels=new Uint8Array(n*n*4);
 // Linear RG decoding retains 16-bit height precision with universally filterable
 // RGBA8, rather than requiring float-texture linear filtering on mobile.
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){const y=height((x+.5)/n*span-span/2,(z+.5)/n*span-span/2),i=(z*n+x)*4;if(detailed){const v=Math.round(T.MathUtils.clamp((y+8)/40,0,1)*65535);pixels.set([v>>8,v&255,0,255],i);}else{const v=Math.round(T.MathUtils.clamp((y+20)/70,0,1)*255);pixels.set([v,v,v,255],i);}}
 const coast=new T.DataTexture(pixels,n,n);coast.minFilter=coast.magFilter=T.LinearFilter;coast.needsUpdate=true;
 const disturbances=Array.from({length:4},()=>new T.Vector4(0,0,0,10));
 const waterContext={reflectionSky:{value:hdr},clock:time,night,sunset,coast:{value:coast},coastBounds:{value:new T.Vector3(-span/2,-span/2,span)},coastDecode:{value:detailed?new T.Vector3(256*255/65535*40,255/65535*40,-8):new T.Vector3(70,0,-20)},shoreDetail:{value:detailed?1:0},sunDirection:{value:sunDirection},seaLevel:{value:seaLevel},disturbances:{value:disturbances}};
 const water=makeLiquidWater(waterContext,{ocean:true});
 const ocean=new T.Mesh(new T.PlaneGeometry(20000,20000,64,64),water);ocean.rotation.x=-Math.PI/2;ocean.position.y=seaLevel;ocean.name='clear-turquoise-ocean';ocean.userData.keepCrayonMaterial=true;scene.add(ocean);
 return {material:skyMat,waterContext,setSunset(v){sunset.value=v;sunDirection.set(-31,T.MathUtils.lerp(23,9,v),26).normalize();sun.position.copy(sunDirection).multiplyScalar(450);sun.scale.setScalar(1+v*.25);sun.material.color.lerp(new T.Color('#ffb54e'),v*.85);},setNight(v){night.value=v;scene.environmentIntensity=.45*(1.-v*.8);sun.material.color.setRGB(1-v*.56,.94-v*.44,.72+v*.09);},update(t){time.value=t;sky.position.copy(camera.position);}};
}
