export const ENCOUNTER_KINDS=Object.freeze(['po','ribbon','crown','dress','moa']);
export const encounterKind=kind=>{const id=String(kind||'po').toLowerCase();if(['po','base','coral','short','plump'].includes(id))return 'po';return ({'드레스 po':'dress','왕관 po':'crown','리본 po':'ribbon'})[id]||id;};
export const pairKey=(a,b)=>[encounterKind(a),encounterKind(b)].sort().join(':');
const definitions=[
 ['po','ribbon','ribbon','리본처럼 휘어진 초상','tilt','flutter'],
 ['po','crown','royal','금빛 왕실 초상','proud','bow'],
 ['po','dress','fan','펼쳐지는 드레스','turn','flourish'],
 ['po','moa','portrait','오늘의 모델 Moa','playful','nod'],
 ['ribbon','crown','ceremony','왕관과 리본의 인사','proud','bow'],
 ['ribbon','dress','dance','두 가지 색의 춤','turn','flutter'],
 ['crown','dress','royal-duet','작은 왕실의 기념사진','proud','bow'],
 ['moa','crown','pretend-king','Moa의 왕 흉내','hero','flourish'],
 ['moa','ribbon','mirror','반대로 고개를 갸웃','tilt','tilt'],
 ['moa','dress','imitation','같은 포즈 다른 모습','playful','turn']
];
export const ENCOUNTER_RULES=Object.freeze(Object.fromEntries(definitions.map(([a,b,id,title,pose,greeting],i)=>[pairKey(a,b),Object.freeze({id,title,pose,greeting,styleOffset:i*7,durations:{greet:2.2,pose:1.6,paint:8.8,admire:3.2,release:.6}})])));
const additionalRules=new Map();
export function encounterRule(a,b){const key=pairKey(a,b);if(encounterKind(a)===encounterKind(b))return null;if(ENCOUNTER_RULES[key])return ENCOUNTER_RULES[key];if(!additionalRules.has(key)){let hash=0;for(const c of key)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;additionalRules.set(key,Object.freeze({id:'portrait:'+key,title:'새 친구의 색',pose:['tilt','proud','playful'][hash%3],greeting:'nod',styleOffset:hash%100,durations:{greet:2.2,pose:1.6,paint:8.8,admire:3.2,release:.6}}));}return additionalRules.get(key);}

// Broad phase runs on a short cadence. Simulation and camera still run at their
// normal frame rate. One bounded stage prevents N² active scenes/canvas textures.
export function createEncounterScheduler({range=9,cooldown=70,interval=.35,eligible=()=>true,score=()=>0,begin=()=>true,end=()=>{}}={}){
 let active=null,clock=0,nextScan=1.5,serial=0;const until=new Map(),history=new Map();
 const done=(cancelled=false)=>{if(!active)return;for(const a of active.actors)until.set(a.id,clock+cooldown);end(active,cancelled);active=null;nextScan=clock+4;};
 function update(dt,actors){
  clock+=dt;if(active)return active;if(clock<nextScan)return null;nextScan=clock+interval;
  const cells=new Map();for(const a of actors){if((until.get(a.id)||0)>clock||!eligible(a))continue;const k=Math.floor(a.x/range)+','+Math.floor(a.z/range);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(a);}
  let best=null,bestScore=-Infinity;
  for(const a of actors){if((until.get(a.id)||0)>clock||!eligible(a))continue;const ix=Math.floor(a.x/range),iz=Math.floor(a.z/range);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)for(const b of cells.get((ix+dx)+','+(iz+dz))||[]){
    if(a.id>=b.id)continue;const rule=encounterRule(a.kind,b.kind);if(!rule||Math.abs(a.y-b.y)>.65)continue;
    const d=Math.hypot(a.x-b.x,a.z-b.z);if(d>range||d<1.1)continue;
    const rank=score(a,b,rule)-d-(history.get(rule.id)||0)*12;
    if(rank>bestScore){best={actors:[a,b],rule,serial:serial+1};bestScore=rank;}
   }
  }
  if(best){if(begin(best)!==false){serial++;active=best;history.set(best.rule.id,(history.get(best.rule.id)||0)+1);}else until.set(best.actors[0].id,clock+2.5);}
  return active;
 }
 return {update,finish:done,get active(){return active;},get clock(){return clock;},get history(){return Object.fromEntries(history);}};
}
