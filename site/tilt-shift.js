import * as T from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

// Downsample before applying a densely sampled Gaussian. Scaling the old five
// taps far apart left repeated outlines; here bilinear pairs always span actual
// adjacent half-resolution pixels, then a smooth composite keeps the focus sharp.
export function makeTiltShift(config={}){
 const shared={texel:{value:new T.Vector2(1,1)},radius:{value:config.radius??8},focusY:{value:.36},halfBand:{value:config.halfBand??.14},feather:{value:config.feather??.24},slope:{value:config.slope??.04}};
 const options={type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false,stencilBuffer:false};
 const reduced=new T.WebGLRenderTarget(1,1,options),horizontalTarget=reduced.clone(),verticalTarget=reduced.clone();
 const halfTexel={value:new T.Vector2(1,1)},pairOffsets={value:new Float32Array(6)},pairWeights={value:new Float32Array(6)},centerWeight={value:1};
 const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 const copy=new T.ShaderMaterial({uniforms:{tDiffuse:{value:null}},vertexShader,fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){gl_FragColor=texture2D(tDiffuse,vUv);}',depthTest:false,depthWrite:false});
 function gaussian(x,y){return new T.ShaderMaterial({uniforms:{tDiffuse:{value:null},axis:{value:new T.Vector2(x,y)},halfTexel,pairOffsets,pairWeights,centerWeight},vertexShader,fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 axis,halfTexel;uniform float pairOffsets[6],pairWeights[6];uniform float centerWeight;varying vec2 vUv;
 vec4 sampleAt(vec2 p){return texture2D(tDiffuse,clamp(p,vec2(0.),vec2(1.)));}
 void main(){vec4 c=sampleAt(vUv)*centerWeight;for(int i=0;i<6;i++){vec2 d=axis*halfTexel*pairOffsets[i];c+=(sampleAt(vUv+d)+sampleAt(vUv-d))*pairWeights[i];}gl_FragColor=c;}`,depthTest:false,depthWrite:false});}
 const horizontalBlur=gaussian(1,0),verticalBlur=gaussian(0,1);
 const composite=new T.ShaderMaterial({uniforms:{tDiffuse:{value:null},blurred:{value:verticalTarget.texture},...shared},vertexShader,fragmentShader:`uniform sampler2D tDiffuse,blurred;uniform float focusY,halfBand,feather,slope;varying vec2 vUv;
 void main(){float band=abs(vUv.y-focusY+(vUv.x-.5)*slope);float amount=smoothstep(halfBand,halfBand+feather,band);amount*=mix(1.,.60,smoothstep(.80,.98,vUv.y));gl_FragColor=mix(texture2D(tDiffuse,vUv),texture2D(blurred,vUv),amount);}`,depthTest:false,depthWrite:false});
 const quad=new FullScreenQuad(copy);let width=0,height=0,lastRadius=-1;
 function resize(w,h){const hw=Math.max(1,Math.ceil(w*.5)),hh=Math.max(1,Math.ceil(h*.5));if(hw===width&&hh===height)return;width=hw;height=hh;for(const target of [reduced,horizontalTarget,verticalTarget])target.setSize(hw,hh);halfTexel.value.set(1/hw,1/hh);lastRadius=-1;}
 function kernel(){const r=Math.min(8,Math.max(1,shared.radius.value*.5));if(Math.abs(r-lastRadius)<.001)return;lastRadius=r;const sigma=Math.max(.6,r/2),weights=Array.from({length:13},(_,i)=>Math.exp(-.5*i*i/(sigma*sigma))),sum=weights[0]+2*weights.slice(1).reduce((a,b)=>a+b,0),offsets=[],pairs=[];centerWeight.value=weights[0]/sum;for(let i=1;i<=12;i+=2){const total=weights[i]+weights[i+1];offsets.push((i*weights[i]+(i+1)*weights[i+1])/total);pairs.push(total/sum);}pairOffsets.value.set(offsets);pairWeights.value.set(pairs);}
 function draw(renderer,material,target){quad.material=material;renderer.setRenderTarget(target);quad.render(renderer);}
 class Horizontal extends Pass{
  constructor(){super();this.needsSwap=false;}
  setSize(w,h){resize(w,h);}
  render(renderer,writeBuffer,readBuffer){kernel();copy.uniforms.tDiffuse.value=readBuffer.texture;draw(renderer,copy,reduced);horizontalBlur.uniforms.tDiffuse.value=reduced.texture;draw(renderer,horizontalBlur,horizontalTarget);}
 }
 class Vertical extends Pass{
  constructor(){super();this.uniforms=shared;this.horizontal=new Horizontal();}
  setSize(w,h){resize(w,h);}
  render(renderer,writeBuffer,readBuffer){verticalBlur.uniforms.tDiffuse.value=horizontalTarget.texture;draw(renderer,verticalBlur,verticalTarget);composite.uniforms.tDiffuse.value=readBuffer.texture;draw(renderer,composite,this.renderToScreen?null:writeBuffer);}
  dispose(){for(const target of [reduced,horizontalTarget,verticalTarget])target.dispose();for(const material of [copy,horizontalBlur,verticalBlur,composite])material.dispose();quad.dispose();}
 }
 return new Vertical();
}
