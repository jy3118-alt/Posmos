import * as T from 'three';
export function makeDistrictCycle(scene,sun,hemi,coast,lighting,lamps,config){
 const phases=[
  {at:0,lit:'#fff8e8',shadow:'#85839e',sky:'#b7e8f8',sun:'#fff0cf',hemi:'#b6ddf2',ground:'#716488',night:0,sunset:0,height:65},
  {at:.24,lit:'#fffcef',shadow:'#8587a2',sky:'#b7e8f8',sun:'#fff1cc',hemi:'#b9def1',ground:'#76648a',night:0,sunset:0,height:65},
  {at:.44,lit:'#ffd5ae',shadow:'#6a527e',sky:'#b88ea4',sun:'#ff9e4c',hemi:'#c5a7d1',ground:'#59446f',night:0,sunset:1,height:22},
  {at:.63,lit:'#8eaccb',shadow:'#3e4168',sky:'#20344c',sun:'#a9c6f0',hemi:'#839abb',ground:'#373456',night:1,sunset:0,height:38},
  {at:.82,lit:'#8eaccb',shadow:'#3e4168',sky:'#20344c',sun:'#a9c6f0',hemi:'#839abb',ground:'#373456',night:1,sunset:0,height:38},
  {at:1,lit:'#fff8e8',shadow:'#85839e',sky:'#b7e8f8',sun:'#fff0cf',hemi:'#b6ddf2',ground:'#716488',night:0,sunset:0,height:65}
 ];
 for(const p of phases)for(const k of ['lit','shadow','sky','sun','hemi','ground'])p[k]=new T.Color(p[k]);
 let offset=config.startPhase??.1,elapsed=0,night=0,sunset=0,phase=offset,sunHeight=65,lightDistance=1;const anchor=new T.Vector3(-4,5,-9);const colour=new T.Color();
 function update(dt){elapsed+=dt;phase=(offset+elapsed/(config.seconds||720))%1;let i=0;while(phase>phases[i+1].at)i++;const a=phases[i],b=phases[i+1],u=T.MathUtils.smoothstep(phase,a.at,b.at),f=dt>1?1:1-Math.exp(-dt*3);
  for(const [key,destination]of [['lit',lighting.lit.value],['shadow',lighting.shadow.value],['sky',scene.fog.color],['sun',sun.color],['hemi',hemi.color],['ground',hemi.groundColor]])destination.lerp(colour.copy(a[key]).lerp(b[key],u),f);
  night=T.MathUtils.lerp(night,T.MathUtils.lerp(a.night,b.night,u),f);sunset=T.MathUtils.lerp(sunset,T.MathUtils.lerp(a.sunset,b.sunset,u),f);coast.setNight(night);coast.setSunset(sunset);sunHeight=T.MathUtils.lerp(sunHeight,T.MathUtils.lerp(a.height,b.height,u),f);sun.position.set(anchor.x-41*lightDistance,anchor.y+sunHeight*lightDistance,anchor.z+47*lightDistance);sun.target.position.copy(anchor);sun.intensity=3-night*1.7;hemi.intensity=1.1-night*.55;
  for(const lamp of lamps){lamp.material.color.set('#d8bd89').lerp(colour.set('#ffe4a0'),night);}
  const active=phase<.32||phase>.93?'morning':phase<.57?'afternoon':'night';for(const el of document.querySelectorAll('[data-time]'))if(el.getAttribute('aria-pressed')!==String(el.dataset.time===active))el.setAttribute('aria-pressed',String(el.dataset.time===active));
 }
 for(const button of document.querySelectorAll('[data-time]'))button.addEventListener('click',()=>{offset=Number(button.dataset.phase);elapsed=0;});update(10);elapsed=0;
 return {update,setAnchor(v,distance=1){lightDistance=distance;anchor.set(Math.round(v.x/2)*2,Math.round(v.y/2)*2,Math.round(v.z/2)*2);},diagnostics:()=>({phase:+phase.toFixed(4),night:+night.toFixed(3),sunset:+sunset.toFixed(3),seconds:config.seconds||720})};
}
