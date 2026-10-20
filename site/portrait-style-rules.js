// 10 mark languages × 10 pigment sets = 100 small rule presets. No image bundle.
const families=[
 ['crayon','부서진 크레파스',8,1.18],['gouache','두꺼운 과슈',5,1.12],
 ['riso','두 겹 리소 인쇄',4,1.20],['watercolour','번지는 수채',12,.95],
 ['cutout','오려 붙인 종이',5,1.10],['pencil','색연필 괴짜',6,1.15],
 ['chalk','파스텔 가루',7,1.12],['poster','네 가지 포스터 잉크',4,1.35],
 ['mosaic','작은 색종이 조각',6,1.05],['gesture','장난스러운 선 드로잉',5,1.20]
];
const pigments=[
 ['#293dbe','#ffcd34','#ff627c'],['#087caa','#ff9e47','#b84cce'],
 ['#ed4385','#ffe35d','#2e78d5'],['#7546d0','#3ed0ab','#ff9170'],
 ['#008f9e','#ffb522','#ec559f'],['#4b38b0','#fc773c','#badb40'],
 ['#2367df','#ff6da8','#e7d72c'],['#db472e','#ffce40','#1bb5c2'],
 ['#397549','#ffc15d','#b167ed'],['#a147bb','#ffcf3b','#00b8ad']
];
export const PORTRAIT_STYLE_PRESETS=Object.freeze(Array.from({length:100},(_,id)=>{
 const f=families[Math.floor(id/10)];return Object.freeze({id,family:f[0],name:f[1],levels:f[2],saturation:f[3],pigments:pigments[id%10],paper:id%10===6?'#f0e7dc':'#fff0d8',markScale:6+id%7,bleed:.13+(id%5)*.025,warp:.025+(id%4)*.009});
}));
export function styleForWork(seed,serial,fixed){const id=Number.isInteger(fixed)?((fixed%100)+100)%100:((seed%100)+serial*37)%100;return PORTRAIT_STYLE_PRESETS[id];}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const clamp=(x,a=0,b=255)=>Math.max(a,Math.min(b,x));
const hash=(x,y,s)=>{let n=(Math.imul(x+17,374761393)^Math.imul(y+71,668265263)^s)>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};

// Pure pixel rules run in a worker; the fallback yields every 8 rows. The
// The posed character is the source. Low-frequency warps, colour separation,
// coarse paint masses and misregistered ink deliberately break photo precision.
export function* stylePortraitRows(source,w,h,preset,seed=1){
 const out=new Uint8ClampedArray(w*h*4),paper=rgb(preset.paper),inks=preset.pigments.map(rgb),family=preset.family;
 const sample=(x,y,c)=>source[((h-1-Math.max(0,Math.min(h-1,Math.round(y))))*w+Math.max(0,Math.min(w-1,Math.round(x))))*4+c];
 const phase=(seed%997)*.013+preset.id*.137,block=Math.max(3,Math.round(w/(55+(preset.id%6)*5))),blur=Math.max(2,w*.008),warp=(preset.warp||.03)*w;
 const luminance=(x,y)=>(sample(x,y,0)+sample(x,y,1)+sample(x,y,2))/3;
 for(let y=0;y<h;y++){
  for(let x=0;x<w;x++){
   const k=(y*w+x)*4;
   const xx=x+Math.sin(y/h*9+phase)*warp+Math.sin(x/w*11-phase)*warp*.23;
   const yy=y+Math.sin(x/w*8+phase*.7)*warp*.58;
   const sx=Math.floor(xx/block)*block+block*.5,sy=Math.floor(yy/block)*block+block*.5;
   let a=(sample(xx,yy,3)*.55+sample(sx,sy,3)*.25+sample(xx+blur,yy-blur,3)*.20)/255;
   const background=a<.025,grain=hash(x,y,seed),broad=hash(Math.floor(xx/(block*3)),Math.floor(yy/(block*3)),seed);
   let colour=[0,1,2].map(c=>sample(sx,sy,c)*.52+(sample(xx+blur,yy,c)+sample(xx-blur,yy,c)+sample(xx,yy+blur,c)+sample(xx,yy-blur,c))*.12),edge=0;
   const l=.2126*colour[0]+.7152*colour[1]+.0722*colour[2];
   if(!background){
    edge=Math.min(1,(Math.abs(l-luminance(xx+blur*1.4,yy))+Math.abs(l-luminance(xx,yy+blur*1.4)))/115);
    const field=Math.sin(xx/w*8+phase)+Math.cos(yy/h*7-phase*.6)+Math.sin((xx+yy)/w*12+phase)*.45;
    const tone=l<65?0:((Math.floor((field+2.5)*1.7)+Math.floor(l/82)+preset.id)%3+3)%3;
    const ink=inks[tone],value=l<65?.48:l>205?1.07:.86;
    colour=colour.map((v,c)=>clamp(ink[c]*value*.80+v*.14+paper[c]*.06));
    if(l>220)colour=colour.map((v,c)=>v*.83+paper[c]*.17);
    if(family==='watercolour'){a*=.90;colour=colour.map((v,c)=>v*.83+paper[c]*.17);}
    if(family==='mosaic'){const line=(Math.floor(xx)%block===0||Math.floor(yy)%block===0);if(line)colour=colour.map((v,c)=>v*.82+paper[c]*.18);}
    if(family==='riso'){const dx=(x%7)-3,dy=(y%7)-3;if(dx*dx+dy*dy>12)colour=colour.map((v,c)=>v*.75+paper[c]*.25);}
    if(family==='pencil'&&((x+y*2+seed)%13>10))colour=colour.map((v,c)=>v*.8+paper[c]*.2);
    if(family==='poster')colour=colour.map(v=>Math.round(v/32)*32);
    const shifted=sample(xx-w*.012,yy+h*.006,3)/255;
    const inkEdge=Math.max(edge*.42,Math.abs(a-shifted)*.55);
    if(family==='pencil'||family==='gesture'||family==='cutout')colour=colour.map((v,c)=>v*(1-inkEdge)+inks[0][c]*.40*inkEdge);
    const brush=family==='crayon'||family==='chalk'?(.97+broad*.06):(.98+Math.sin(xx*.08+yy*.035+phase)*.025);
    colour=colour.map((v,c)=>clamp(v*brush*(grain>.986?.92:1)+(grain>.986?paper[c]*.08:0)));
   }
   // One broad offset underprint creates bleeding pigment around the body.
   const shadow=background?sample(xx-w*.022,yy-h*.012,3)/255*.24:0;
   for(let c=0;c<3;c++)out[k+c]=clamp(paper[c]*(1-a-shadow)+colour[c]*a+inks[2][c]*shadow);
   out[k+3]=255;
  }
  if(y%8===7)yield null;
 }
 return out;
}
export function renderPortraitStyle(source,w,h,preset,seed){const work=stylePortraitRows(source,w,h,preset,seed);let r;do{r=work.next();}while(!r.done);return r.value;}
