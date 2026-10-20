import * as T from 'three';

// One world-space surface model for ocean and stream. No screen capture,
// refraction render, fluid solver or per-frame texture uploads are needed.
export function makeLiquidWater(context,{river=false}={}){
 return new T.ShaderMaterial({side:T.DoubleSide,uniforms:{...context,river:{value:river?1:0}},vertexShader:`
 varying vec3 waterPoint;
 void main(){waterPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(waterPoint,1.);}`,
 fragmentShader:`
 varying vec3 waterPoint;
 uniform sampler2D coast,reflectionSky;
 uniform float clock,night,sunset,seaLevel,river;
 uniform vec3 sunDirection;
 uniform vec4 disturbances[4];
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
  // Below the mouth the ocean owns the surface; no coplanar ribbon remains.
  if(river>.5&&waterPoint.y<=seaLevel+.001)discard;
  vec2 p=waterPoint.xz,uv=(p+160.)/320.;
  float inside=1.-smoothstep(.88,1.,max(abs(uv.x*2.-1.),abs(uv.y*2.-1.)));
  float floorY=mix(-55.,texture2D(coast,clamp(uv,0.,1.)).r*70.-20.,inside);
  float depth=max(0.,waterPoint.y-floorY);
  float a=dot(p,vec2(.52,.31))-clock*.72+sin(dot(p,vec2(.071,-.083)))*1.5;
  float b=dot(p,vec2(-.39,.64))+clock*.53+sin(dot(p,vec2(.093,.067)))*1.2;
  float c=dot(p,vec2(1.42,.83))-clock*1.12;
  // Filter subpixel waves in the distance, rather than letting repeated
  // reflections alias into horizontal lines or shimmer during camera orbit.
  vec3 filtered=1.-smoothstep(vec3(.32),vec3(2.),vec3(fwidth(a),fwidth(b),fwidth(c)));
  vec2 slope=vec2(.52,.31)*cos(a)*.075*filtered.x+vec2(-.39,.64)*cos(b)*.045*filtered.y+vec2(1.42,.83)*cos(c)*.018*filtered.z;
  float contact=0.;
  for(int i=0;i<4;i++){
   vec2 delta=p-disturbances[i].xy;float d=length(delta),fade=exp(-d*1.1)*disturbances[i].z;
   slope+=delta/max(d,.12)*cos(d*10.-clock*6.)*fade*.16;
   contact+=pow(max(0.,sin(d*10.-clock*6.)),12.)*fade;
  }
  vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
  vec3 view=normalize(cameraPosition-waterPoint);
  float fresnel=.045+.74*pow(1.-max(dot(view,normal),0.),4.);
  float shallow=exp(-depth*.25);
  vec3 colour=mix(vec3(.009,.17,.43),vec3(.025,.64,.64),shallow);
  // Broad caustic cells replace the old evenly spaced white cross-stripes.
  float cell=sin(a+sin(b)*.7)*sin(b+sin(c)*.22);
  float caustic=pow(max(0.,1.-abs(cell)*6.),3.);
  colour+=vec3(.025,.10,.075)*caustic*shallow*.55*filtered.x*filtered.y;
  vec3 reflected=reflect(-view,normal);
  vec2 hdrUV=vec2(atan(reflected.z,reflected.x)/6.2831853+.5,.5+asin(clamp(reflected.y,-1.,1.))/3.14159265);
  vec3 reflection=min(texture2D(reflectionSky,hdrUV).rgb,vec3(1.8));
  reflection=mix(reflection,vec3(.78,.26,.13),sunset*.65);
  colour=mix(colour,reflection,fresnel*.74);
  colour=mix(colour,colour*vec3(.53,.46,.70),sunset*.66);
  float glint=pow(max(dot(reflect(-sunDirection,normal),view),0.),115.);
  colour+=vec3(1.,.91,.65)*glint*.75*(1.-night);
  float edge=(1.-smoothstep(.12,1.15,depth))*smoothstep(.025,.18,depth);
  float foam=edge*smoothstep(.13,.77,.5+.5*sin(depth*6.-clock*.8+noise(p*.9)*3.));
  colour=mix(colour,vec3(.70,.94,.91),min(.75,foam*.65+contact*.45));
  colour=mix(colour,colour*vec3(.20,.33,.56),night*.84);
  float haze=smoothstep(340.,650.,length(cameraPosition-waterPoint));
  vec3 horizon=mix(vec3(.18,.54,.96),vec3(.86,.31,.16),sunset);
  horizon=mix(horizon,vec3(.024,.065,.14),night*.88);
  gl_FragColor=vec4(mix(colour,horizon,haze*.80),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
}
