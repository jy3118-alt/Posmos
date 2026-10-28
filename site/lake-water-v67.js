import * as T from 'three';
import {makeLiquidWater} from './liquid-water-v67.js?v=4baf9416a5b8';
// Shares the existing depth atlas, HDRI, day cycle, clock and four ripple slots.
// No reflection camera, new depth render, fluid solver or per-frame upload.
export function makeLakeWater(context,lake){
 const material=makeLiquidWater(context);material.uniforms.lakeBounds={value:new T.Vector4(...lake.centre,...lake.radii)};
 material.fragmentShader='uniform vec4 lakeBounds;\n'+material.fragmentShader;
 material.fragmentShader=material.fragmentShader.replace('float inside=','vec2 lakeLocal=(waterPoint.xz-lakeBounds.xy)/lakeBounds.zw;float lakeAngle=atan(lakeLocal.y,lakeLocal.x);float lakeRadius=length(lakeLocal)*(1.+.045*sin(lakeAngle*3.+.7)+.025*sin(lakeAngle*5.-.5));if(lakeRadius>1.006)discard;\nfloat inside=');
 material.fragmentShader=material.fragmentShader.replace('float depth=max(0.,waterPoint.y-floorY);','float depth=max(0.,waterPoint.y-floorY);\nif(depth<.008)discard;').replace('clock*.72','clock*.21').replace('clock*.53','clock*.18').replace('clock*1.12','clock*.35').replace('cos(a)*.075','cos(a)*.040').replace('cos(b)*.045','cos(b)*.025');
 return material;
}
