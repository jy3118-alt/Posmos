import * as T from 'three';

// One world-space surface model for ocean and stream. No screen capture,
// refraction render, fluid solver or per-frame texture uploads are needed.
export function makeLiquidWater(context,{river=false,ocean=false,pool=null}={}){
 return new T.ShaderMaterial({side:T.DoubleSide,transparent:ocean,depthWrite:!ocean,uniforms:{poolBounds:{value:new T.Vector4(pool?.centre[0]||0,pool?.centre[2]||0,(pool?.width||2)*.5,(pool?.length||2)*.5)},poolStrength:{value:pool?1:0},facetedCloudSky:{value:0},...context,river:{value:river?1:0},ocean:{value:ocean?1:0}},vertexShader:`
 varying vec3 waterPoint;
 void main(){waterPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(waterPoint,1.);}`,
 fragmentShader:`
 varying vec3 waterPoint;
 uniform sampler2D coast,reflectionSky,normalSampler;
 uniform float clock,night,sunset,seaLevel,river,shoreDetail,ocean,facetedCloudSky;
 uniform vec3 sunDirection,coastBounds,coastDecode;
 uniform vec4 disturbances[4];
 uniform vec4 poolBounds;
 uniform float poolStrength;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 // Four scrolling normal samples adapted from Three.js r180 Water (MIT).
 vec4 getNoise( vec2 uv ) {
					vec2 uv0 = ( uv / 103.0 ) + vec2(clock / 17.0, clock / 29.0);
					vec2 uv1 = uv / 107.0-vec2( clock / -19.0, clock / 31.0 );
					vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( clock / 101.0, clock / 97.0 );
					vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( clock / 109.0, clock / -113.0 );
					vec4 noise = texture2D( normalSampler, uv0 ) +
						texture2D( normalSampler, uv1 ) +
						texture2D( normalSampler, uv2 ) +
						texture2D( normalSampler, uv3 );
					return noise * 0.5 - 1.0;
				}


 void main(){
  // Below the mouth the ocean owns the surface; no coplanar ribbon remains.
  if(river>.5&&waterPoint.y<=seaLevel+.001)discard;
  vec2 p=waterPoint.xz;float pixelSpan=max(length(dFdx(p)),length(dFdy(p)));float nearDetail=1.-smoothstep(.12,.70,pixelSpan);vec2 uv=(p-coastBounds.xy)/coastBounds.z;
  float inside=1.-smoothstep(.88,1.,max(abs(uv.x*2.-1.),abs(uv.y*2.-1.)));
  vec2 heightCode=texture2D(coast,clamp(uv,0.,1.)).rg;
  float floorY=mix(-55.,dot(heightCode,coastDecode.xy)+coastDecode.z,inside);
  float depth=max(0.,waterPoint.y-floorY);
  if(river>.5){if(depth<.025)discard;}
  float poolCalm=river*poolStrength*(1.-smoothstep(.65,1.2,length((p-poolBounds.xy)/poolBounds.zw)));
  float stream=river*(1.-poolCalm);
  float waterOcean=max(ocean,river*(1.-smoothstep(.0,.65,waterPoint.y-seaLevel)));
  float a=dot(p,vec2(.52,.31))-clock*.72+sin(dot(p,vec2(.071,-.083)))*1.5;
  float b=dot(p,vec2(-.39,.64))+clock*.53+sin(dot(p,vec2(.093,.067)))*1.2;
  float c=dot(p,vec2(1.42,.83))-clock*1.12;
  // Filter subpixel waves in the distance, rather than letting repeated
  // reflections alias into horizontal lines or shimmer during camera orbit.
  vec3 filtered=1.-smoothstep(vec3(.10),vec3(.75),vec3(fwidth(a),fwidth(b),fwidth(c)));
  vec2 slope=vec2(.52,.31)*cos(a)*.075*filtered.x+vec2(-.39,.64)*cos(b)*.045*filtered.y+vec2(1.42,.83)*cos(c)*.018*filtered.z;
  float contact=0.;
  for(int i=0;i<4;i++){
   vec2 delta=p-disturbances[i].xy;float d=length(delta),fade=exp(-d*1.1)*disturbances[i].z;
   slope+=delta/max(d,.12)*cos(d*10.-clock*6.)*fade*.16;
   contact+=pow(max(0.,sin(d*10.-clock*6.)),12.)*fade;
  }
  vec4 sourceWave=getNoise(p*5.0);
  slope+=sourceWave.xy*.10*smoothstep(.3,3.,depth)*(0.30+0.70*nearDetail);
  // The connected upper pool reads as still water beside the narrower stream.
  // Small wavelets travel downstream (+z); the lake stays calm.
  float flowPhase=p.y*3.1-clock*2.0+noise(p*.43)*3.;
  float flowAA=1.-smoothstep(.35,1.4,fwidth(flowPhase));
  slope.y+=cos(flowPhase)*.032*stream*flowAA;
  slope*=mix(1.,.35,poolCalm);
  vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
  vec3 view=normalize(cameraPosition-waterPoint);
  float fresnel=.045+.74*pow(1.-max(dot(view,normal),0.),4.);
  float shallow=exp(-depth*mix(.25,.65,waterOcean));
  vec3 colour=mix(vec3(.009,.17,.43),vec3(.025,.64,.64),shallow);
  vec3 streamColour=mix(vec3(.035,.22,.28),vec3(.13,.40,.36),exp(-depth*.60));
  colour=mix(colour,streamColour,river*.74);
  // Broad caustic cells replace the old evenly spaced white cross-stripes.
  float cell=sin(a+sin(b)*.7)*sin(b+sin(c)*.22);
  float caustic=pow(max(0.,1.-abs(cell)*6.),3.);
  colour+=vec3(.025,.10,.075)*caustic*shallow*.55*filtered.x*filtered.y*nearDetail;
  vec3 reflected=reflect(-view,normal);
  vec2 hdrUV=vec2(atan(reflected.z,reflected.x)/6.2831853+.5,.5+asin(clamp(reflected.y,-1.,1.))/3.14159265);
  vec3 reflection=facetedCloudSky>.5?mix(vec3(.52,.78,.88),vec3(.09,.38,.66),smoothstep(-.035,.82,reflected.y)):min(texture2D(reflectionSky,hdrUV).rgb,vec3(1.8));
  reflection=mix(reflection,vec3(.78,.26,.13),sunset*.65);
  colour=mix(colour,reflection,fresnel*.74);
  colour=mix(colour,colour*vec3(.53,.46,.70),sunset*.66);
  float glint=pow(max(dot(reflect(-sunDirection,normal),view),0.),115.);
  colour+=vec3(1.,.91,.65)*(glint*.75*nearDetail+pow(max(dot(reflect(-sunDirection,normal),view),0.),18.)*.055*(1.-nearDetail))*(1.-night);
  float edge=(1.-smoothstep(.12,1.15,depth))*smoothstep(.025,.18,depth);
  float foam=edge*smoothstep(.13,.77,.5+.5*sin(depth*6.-clock*.8+noise(p*.9)*3.));
  if(shoreDetail>.5){
   float wash=.10+(.5+.5*sin(clock*.66+noise(p*.12)*3.))*.32;
   float washEdge=(1.-smoothstep(.025,.13,abs(depth-wash)))*(1.-smoothstep(.30,.80,noise(p*.53+clock*.018)));
   float bed=exp(-depth*3.2);
   vec3 wetSand=vec3(.42,.39,.23)+noise(p*.42)*.027;
   colour=mix(colour,wetSand,bed*.92);
   foam=foam*.50+washEdge*.62;
  }
  // Break up foam along the banks so the river does not read as a neon ribbon.
  float foamPatches=smoothstep(.35,.72,noise(p*vec2(.70,.31)-vec2(0.,clock*.12)));
  foam*=mix(1.,(.15+.50*foamPatches)*(1.-poolCalm*.65),river);
  float flowCrest=pow(max(0.,sin(flowPhase)),18.)*smoothstep(.58,.83,noise(p*.63-vec2(0.,clock*.32)))*stream*flowAA*nearDetail;
  colour+=vec3(.10,.16,.11)*flowCrest*.27;
  colour=mix(colour,vec3(.70,.89,.81),min(.75,foam*.65+contact*.45));
  colour=mix(colour,colour*vec3(.20,.33,.56),night*.84);
  float haze=smoothstep(1400.,8000.,length(cameraPosition-waterPoint));
  vec3 horizon=facetedCloudSky>.5?mix(vec3(.52,.78,.88),vec3(.94,.43,.20),sunset):mix(vec3(.18,.54,.96),vec3(.86,.31,.16),sunset);
  horizon=mix(horizon,vec3(.024,.065,.14),night*(facetedCloudSky>.5?.95:.88));
  float alpha=ocean>.5?mix(.24,.99,1.-exp(-depth*.105)):1.;
  if(ocean>.5&&cameraPosition.y<seaLevel-.03){
   float window=pow(max(-view.y,0.),3.);
   colour=mix(vec3(.045,.25,.29),vec3(.38,.76,.72),window);
   colour+=vec3(.10,.20,.14)*caustic*.32*filtered.x*filtered.y;
   float distanceFog=smoothstep(12.,95.,length(waterPoint-cameraPosition));
   vec3 underFog=mix(vec3(.017,.205,.287),vec3(.006,.063,.10),smoothstep(9.,42.,-cameraPosition.y));
   colour=mix(colour,underFog,distanceFog);colour*=1.-night*.52;alpha=1.;haze=0.;
  }
  gl_FragColor=vec4(mix(colour,horizon,haze),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
}
