import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

// Painted panorama + scrolling water albedo, with a CC0 1K HDRI for reflections.
// Shared sunlight and time keep the background coherent through a full orbit.
export async function makeClearCoast(scene,camera,height,seaLevel,bay){
 const loader=new T.TextureLoader();const [skyTexture,waves,hdr]=await Promise.all([loader.loadAsync('./assets/crown-v16/painted-sky.png?v=1297b91e04d0'),loader.loadAsync('./assets/crown-v16/painted-water.png?v=7be60faee79c'),new RGBELoader().loadAsync('./assets/crown-v16/kloppenheim_06_puresky_1k.hdr?v=206c67e3a1b9')]);
 skyTexture.colorSpace=waves.colorSpace=T.SRGBColorSpace;skyTexture.wrapS=T.RepeatWrapping;skyTexture.anisotropy=4;waves.wrapS=waves.wrapT=T.RepeatWrapping;waves.anisotropy=8;hdr.mapping=T.EquirectangularReflectionMapping;hdr.wrapS=T.RepeatWrapping;scene.environment=hdr;scene.environmentIntensity=.45;
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
 gl_FragColor=vec4(c,1.);}`});skyMat.color=tint;
 const sky=new T.Mesh(new T.SphereGeometry(570,24,16),skyMat);sky.name='clear-summer-sky';sky.renderOrder=-100;scene.add(sky);
 const sun=new T.Mesh(new T.SphereGeometry(7.5,24,16),new T.MeshBasicMaterial({color:'#fff6cf',toneMapped:false}));sun.name='sun-disc';sun.position.copy(sunDirection).multiplyScalar(450);sky.add(sun);
 const n=256,pixels=new Uint8Array(n*n*4);for(let z=0;z<n;z++)for(let x=0;x<n;x++){const value=Math.round(T.MathUtils.clamp((height((x+.5)/n*320-160,(z+.5)/n*320-160)+20)/70,0,1)*255),i=(z*n+x)*4;pixels.set([value,value,value,255],i);}
 const coast=new T.DataTexture(pixels,n,n);coast.minFilter=coast.magFilter=T.LinearFilter;coast.needsUpdate=true;
 const water=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{bay:{value:new T.Vector4(bay?.x||0,bay?.z||0,bay?.nx||1,bay?.nz||0)},hasBay:{value:bay?1:0},waves:{value:waves},reflectionSky:{value:hdr},clock:time,night,sunset,tint:{value:tint},coast:{value:coast},sunDirection:{value:sunDirection},seaLevel:{value:seaLevel}},vertexShader:`varying vec3 worldPoint;void main(){worldPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);}`,fragmentShader:`
 varying vec3 worldPoint;uniform float clock,night,sunset,seaLevel;uniform vec3 tint,sunDirection;uniform sampler2D coast,waves,reflectionSky;uniform vec4 bay;uniform float hasBay;${noise}
 void main(){vec2 p=worldPoint.xz,uv=(p+160.)/320.;vec2 bd=p-bay.xy;float bu=dot(bd,vec2(-bay.w,bay.z)),bv=dot(bd,bay.zw);float cove=hasBay*(1.-smoothstep(11.,17.,abs(bu)))*smoothstep(-3.,2.,bv)*(1.-smoothstep(19.,25.,bv));float inside=1.-smoothstep(.75,1.,max(abs(uv.x*2.-1.),abs(uv.y*2.-1.)));
 float floorHeight=mix(-55.,texture2D(coast,clamp(uv,0.,1.)).r*70.-20.,inside);float depth=max(0.,seaLevel-floorHeight);
 vec2 w=p+vec2(sin(p.y*.029)*6.,sin(p.x*.034)*4.);float swell=sin(w.x*.16+w.y*.09-clock*.45),ripple=sin(w.x*.62-w.y*.48+clock*.77),crossWave=sin(w.x*.32+w.y*.61-clock*.61);
 vec3 normal=normalize(vec3(-.065*cos(p.x*.16+p.y*.09-clock*.45)-.024*cos(p.x*.62-p.y*.48+clock*.77),1.,-.055*cos(p.x*.32+p.y*.61-clock*.61)));
 vec3 view=normalize(cameraPosition-worldPoint);float fresnel=.06+.65*pow(1.-max(dot(view,normal),0.),4.);
 float shallow=exp(-depth*.24);vec3 sea=mix(vec3(.008,.16,.44),vec3(.015,.66,.66),shallow);
 sea*=1.+swell*.025+ripple*crossWave*.018;vec3 reflection=mix(vec3(.055,.28,.63),vec3(.22,.57,.91),pow(1.-max(view.y,0.),2.));vec3 reflected=reflect(-view,normal);vec2 hdrUV=vec2(atan(reflected.z,reflected.x)/6.2831853+.5,.5+asin(clamp(reflected.y,-1.,1.))/3.14159265);reflection=mix(reflection,min(texture2D(reflectionSky,hdrUV).rgb,vec3(2.)),.24);
 vec2 paintUV=p/58.+vec2(clock*.0008,-clock*.0006);vec3 paint=texture2D(waves,paintUV+vec2(swell,crossWave)*.004).rgb;paint=mix(paint,paint*vec3(.58,1.20,1.04),shallow*.7);sea=mix(sea,paint,.82);sea=mix(sea,reflection,fresnel*.46);vec3 duskWater=vec3(.14,.075,.24)+paint*.27;sea=mix(sea,duskWater,sunset*.88);
 float goldenPath=pow(max(dot(normalize(view.xz),normalize(sunDirection.xz)),0.),20.)*(.25+.75*fresnel)*(.7+.3*ripple);sea+=vec3(.95,.32,.09)*goldenPath*sunset;
 // Soft travelling foam hugs the real island contour; no separate overlapping planes.
 float edge=(1.-smoothstep(.2,2.7,depth))*smoothstep(.04,.26,depth);
 float wash=.50+.5*sin(depth*4.-clock*.72+noise(p*.35)*2.);float foam=edge*(.34+.66*smoothstep(.25,.78,wash));
 sea=mix(sea,vec3(.035,.54,.67),cove*.20);sea=mix(sea,vec3(.72,.96,.96),foam*.88*mix(1.,.18,cove));
 float glint=pow(max(dot(reflect(-sunDirection,normal),view),0.),180.);sea+=vec3(1.,.92,.66)*glint*.85*(1.-night);
 float streak=pow(max(0.,sin(w.x*.83+w.y*.43-clock*.7)),24.)*pow(max(0.,cos(w.y*.28-w.x*.17+clock*.25)),12.);
 sea+=vec3(.08,.22,.24)*streak*(.28+.5*shallow)*(1.-night);
 sea*=tint;sea=mix(sea,sea*vec3(.23,.34,.54),night*.76);
 float distance=length(cameraPosition-worldPoint);float haze=smoothstep(340.,620.,distance);vec3 horizon=mix(vec3(.18,.54,.96),vec3(.86,.31,.16),sunset)*tint;horizon=mix(horizon,vec3(.024,.065,.14),night*.88);sea=mix(sea,horizon,haze*.80);
 gl_FragColor=vec4(sea,mix(1.,.87,cove));}`});
 const ocean=new T.Mesh(new T.PlaneGeometry(2400,2400),water);ocean.rotation.x=-Math.PI/2;ocean.position.y=seaLevel;ocean.name='clear-turquoise-ocean';scene.add(ocean);
 return {material:skyMat,setSunset(v){sunset.value=v;sunDirection.set(-31,T.MathUtils.lerp(23,9,v),26).normalize();sun.position.copy(sunDirection).multiplyScalar(450);sun.scale.setScalar(1+v*.25);sun.material.color.lerp(new T.Color('#ffb54e'),v*.85);},setNight(v){night.value=v;scene.environmentIntensity=.45*(1.-v*.8);sun.material.color.setRGB(1-v*.56,.94-v*.44,.72+v*.09);},update(t){time.value=t;sky.position.copy(camera.position);}};
}
