// Shared water-column lighting. Own lightweight WebGL implementation, informed
// by Tidewater's separation of material lighting and camera-path extinction.
// No additional render target, postprocessing pass or downloaded shader.
export function oceanLighting(material,context,{ground=false}={}){
 const prior=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=s=>{
  prior.call(material,s);s.uniforms.oceanLightTime=context.time;s.uniforms.oceanNight=context.night;
  s.vertexShader='varying vec3 oceanWorldPoint;varying float oceanLocalHeight;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 oceanVertex=vec4(transformed,1.);
   #ifdef USE_INSTANCING
    oceanVertex=instanceMatrix*oceanVertex;
   #endif
   oceanWorldPoint=(modelMatrix*oceanVertex).xyz;
   oceanLocalHeight=position.y;`);
  s.fragmentShader='varying vec3 oceanWorldPoint;varying float oceanLocalHeight;uniform float oceanLightTime,oceanNight;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
   float oceanWet=1.-smoothstep(-1.5,-.15,oceanWorldPoint.y);
   float oceanDepth=max(0.,-oceanWorldPoint.y);
   vec3 oceanTransmittance=exp(-vec3(.028,.012,.007)*oceanDepth);
   outgoingLight*=mix(vec3(1.),oceanTransmittance,oceanWet);
   ${ground?'':'outgoingLight*=mix(.72,1.,smoothstep(-.15,.7,oceanLocalHeight));'}
   vec3 oceanNormal=inverseTransformDirection(normal,viewMatrix);
   float causticA=oceanWorldPoint.x*.41+oceanWorldPoint.z*.23+sin(oceanWorldPoint.z*.21+oceanLightTime*.38);
   float causticB=oceanWorldPoint.x*-.26+oceanWorldPoint.z*.39+cos(oceanWorldPoint.x*.19-oceanLightTime*.31);
   float causticLines=pow(max(0.,1.-abs(sin(causticA)*sin(causticB))*6.),3.);
   float causticAA=1.-smoothstep(.25,.9,max(fwidth(causticA),fwidth(causticB)));
   outgoingLight+=diffuseColor.rgb*vec3(.24,.35,.26)*causticLines*causticAA*oceanWet*exp(-oceanDepth*.036)*max(0.,oceanNormal.y)*(1.-oceanNight);
   // The existing scene fog provides the scattered-light term. Only attenuate
   // the additional red/green part of the actual submerged camera path here.
   float oceanPath=length(vViewPosition)*clamp(min(-cameraPosition.y,-oceanWorldPoint.y)/2.,0.,1.);
   outgoingLight*=exp(-vec3(.009,.003,.001)*max(0.,oceanPath-3.));
   #include <opaque_fragment>`);
 };material.customProgramCacheKey=()=>key()+'-water-column77-'+ground;
}
