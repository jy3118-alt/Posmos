// All levels retain every outer edge vertex, so neighbouring chunks meet exactly.
export function terrainIndices(segments=60,stride=1){
 if(segments%stride)throw Error('Terrain stride must divide the chunk.');
 const out=[],v=(x,z)=>z*(segments+1)+x;
 const tri=(a,b,c)=>{const ax=a%(segments+1),az=Math.floor(a/(segments+1)),bx=b%(segments+1),bz=Math.floor(b/(segments+1)),cx=c%(segments+1),cz=Math.floor(c/(segments+1)),area=(bx-ax)*(cz-az)-(bz-az)*(cx-ax);if(!area)throw Error('Degenerate terrain stitch.');out.push(...(area<0?[a,b,c]:[a,c,b]));};
 if(stride===1){for(let z=0;z<segments;z++)for(let x=0;x<segments;x++){tri(v(x,z),v(x+1,z),v(x,z+1));tri(v(x+1,z+1),v(x,z+1),v(x+1,z));}}
 else{
  const inner=[];for(let q=stride;q<=segments-stride;q+=stride)inner.push(q);
  for(let z=stride;z<segments-stride;z+=stride)for(let x=stride;x<segments-stride;x+=stride){tri(v(x,z),v(x+stride,z),v(x,z+stride));tri(v(x+stride,z+stride),v(x,z+stride),v(x+stride,z));}
  const edge=(side,q,d)=>side===0?v(q,d):side===1?v(segments-d,q):side===2?v(segments-q,segments-d):v(d,segments-q);
  for(let side=0;side<4;side++){let a=0,b=0;while(a<segments||b<inner.length-1){if(b===inner.length-1||(a<segments&&(a+1)<=inner[b+1])){tri(edge(side,a,0),edge(side,inner[b],stride),edge(side,a+1,0));a++;}else{tri(edge(side,a,0),edge(side,inner[b],stride),edge(side,inner[b+1],stride));b++;}}}
 }
 return Uint16Array.from(out);
}
