// All city walls continue beyond the camera's far plane. There is no exposed
// downward-facing cap: this viewing space is a skyline, not a floating diorama.
export const CITY_BASE=-300;
export function createCityLayout(config={}){
  if(config.cityComposition==='districts')return createComposedCity(config);
  const buildings=[
    {x:-20,z:-25.5,width:6.8,depth:7.4,top:-9.8,type:'terraced',frame:2,yaw:.04},
    {x:-29,z:-25,width:5.8,depth:5.4,top:-15,type:'gabled',frame:1,yaw:-.07},
    {x:-14.5,z:-38,width:4.2,depth:5.8,top:-15,type:'twin',frame:3,yaw:.05},
    {x:-31,z:-39,width:5.1,depth:5.5,top:-4,type:'round',frame:0,yaw:0},
    {x:-42,z:-30,width:6.1,depth:6.3,top:-18,type:'terraced',frame:3,yaw:.08},
    {x:19,z:-24,width:6.3,depth:6.8,top:-15,type:'gabled',frame:0,yaw:-.04},
    {x:29,z:-27,width:5.1,depth:5.6,top:-9,type:'twin',frame:2,yaw:.02},
    {x:14,z:-38,width:4.6,depth:5.9,top:-12,type:'terraced',frame:1,yaw:-.03},
    {x:26,z:-42,width:6.2,depth:6.2,top:-15.8,type:'round',frame:3,yaw:.04},
    {x:41,z:-29,width:6.9,depth:7.1,top:-18,type:'tapered',frame:2,yaw:0},
    {x:-37,z:-54,width:6.2,depth:5.6,top:2,type:'tapered',frame:1,yaw:.03},
    {x:39,z:-57,width:5.9,depth:6,top:-1,type:'tapered',frame:0,yaw:-.03},
  ];
  let seed=557;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const types=['terraced','gabled','twin','tapered','round'];
  // Staggered neighbourhoods flank an open street canyon; small setbacks avoid
  // a wall of identical towers. Shared fog blends far blocks into the painting.
  for(let row=0;row<(config.cityDensity||4);row++)for(let col=0;col<13;col++){
    const x=(col-6)*10.5+(row%2?4:0)+(random()-.5)*2.4,z=-57-row*17+(random()-.5)*3;
    if(Math.abs(x)<4.5||row===0&&Math.abs(x)>32&&Math.abs(x)<45)continue;
    const width=3.4+random()*3.4,depth=4+random()*3;
    buildings.push({x,z,width,depth,top:-16+random()*18+(row>1?4:0),type:types[(col+row*3)%5],frame:(col+row)%4,yaw:(random()-.5)*.10});
    if(row<2&&col%4===1)buildings.push({x:x+width*.65,z:z+depth*.5,width:width*.58,depth:depth*.65,top:-23+random()*3,type:'gabled',frame:(col+row+1)%4,yaw:0});
  }
  for(const [i,b] of buildings.entries()){
    b.id='city-block-'+i;b.sourceAnchor=[b.x,b.z];
    const scale=config.cityScale||1;b.x*=scale;b.z*=scale;
    const home=config.cells?.find(c=>c.enabled);if(home&&Math.abs(b.x)<home.size[0]/2+b.width/2+2&&Math.abs(b.z)<home.size[1]/2+b.depth/2+2)b.z=-home.size[1]/2-b.depth/2-3;
  }
  if(config.citySurround){
    const landmarks=[
      {id:'near-south-art',x:0,z:45,width:8,depth:7,top:-9,type:'slab',frame:1,yaw:0},
      {id:'near-east-art',x:45,z:0,width:7,depth:7,top:-10,type:'slab',frame:2,yaw:0},
      {id:'basilica-plaza',x:-46,z:-20,width:13,depth:14,top:-12,type:'slab',frame:0,yaw:0},
      {id:'lotus-landmark',x:39,z:-61,width:9,depth:8,top:30,type:'lotus-tower',frame:2,yaw:0},
      {id:'temple-landmark',x:30,z:54,width:13,depth:12,top:-6,type:'temple',frame:0,yaw:.12},
      {id:'cathedral-landmark',x:-53,z:44,width:11,depth:13,top:-2,type:'cathedral',frame:3,yaw:-.12},
      {id:'near-west-art',x:-45,z:0,width:8,depth:6,top:-7,type:'slab',frame:3,yaw:0},
    ];
    buildings.push(...landmarks.map(b=>({...b,sourceAnchor:[b.x,b.z]})));
    for(const b of buildings)for(const p of config.cityParks||[]){if(((b.x-p.center[0])/(p.radius[0]+2))**2+((b.z-p.center[1])/(p.radius[1]+2))**2<1)b.x=p.center[0]+(b.x<p.center[0]?-1:1)*(p.radius[0]+b.width/2+3);}
    const reserved=buildings.slice(),radius=config.cityRadius||258;
    const shapes=['slab','terraced','round','gabled','twin','tapered','stepped','needle','lotus-tower','temple','cathedral','basilica'];
    function addGrid(spacing,minimum,maximum){
      const extent=Math.ceil(maximum/spacing);
      for(let row=-extent;row<=extent;row++)for(let col=-extent;col<=extent;col++){
        const x=col*spacing+(row%2)*spacing*.2+(random()-.5)*.65,z=row*spacing+(random()-.5)*.65,r=Math.hypot(x,z);
        if(r<minimum||r>maximum||(config.cells||[]).some(c=>c.enabled&&Math.abs(x-c.origin[0])<c.size[0]/2+4&&Math.abs(z-c.origin[2])<c.size[1]/2+4))continue;
        if((config.cityParks||[]).some(p=>((x-p.center[0])/(p.radius[0]+3))**2+((z-p.center[1])/(p.radius[1]+3))**2<1))continue;
        const riverX=-88+Math.sin(z*.018)*15;if(Math.abs(x-riverX)<7)continue;
        const width=(spacing<10?4.1:5.8)+random()*(spacing<10?2.7:4.0),depth=(spacing<10?4.0:5.4)+random()*(spacing<10?2.5:3.6);
        if(reserved.some(b=>Math.abs(x-b.x)<(width+b.width)/2+.7&&Math.abs(z-b.z)<(depth+b.depth)/2+.7))continue;
        let top=r<46?-24+random()*15:r<130?-17+random()*25:-8+random()*34;
        if(r>65&&random()<.06)top+=10;
        buildings.push({id:'district-'+row+'-'+col+'-'+spacing,sourceAnchor:[x,z],x,z,width,depth,top,type:shapes[Math.floor(random()*shapes.length)],frame:Math.floor(random()*4),yaw:(random()-.5)*.06,distance:r});
      }
    }
    addGrid(8.5,20,134);addGrid(13.5,134,radius);
  }else{
    for(const b of buildings)b.top-=Math.max(0,-b.z-35)*.52;
  }
  return buildings.filter(b=>!((config.cityParks||[]).some(p=>((b.x-p.center[0])/(p.radius[0]+2))**2+((b.z-p.center[1])/(p.radius[1]+2))**2<1))); 
}

// A composed skyline: quiet low neighbourhoods, open park/river corridors and
// a few tall accents. These are intentional districts rather than random towers.
function createComposedCity(config){
 let seed=7251;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const buildings=[],ground=config.cityGroundY??-54,roof=config.cells.find(c=>c.enabled),quietShapes=['slab','gabled','round','terraced','stepped'];
 const anchors=[[-20,-25.5],[-29,-25],[19,-24],[-31,-39],[41,-29],[26,-42]];
 anchors.forEach(([x,z],i)=>buildings.push({id:'old-anchor-'+i,sourceAnchor:[x,z],x:x*1.6,z:z*1.7,width:9+(i%3)*3,depth:8+(i%2)*3,top:-24+(i%3)*5,type:quietShapes[i%quietShapes.length],frame:i%4,yaw:0}));
 const landmarks=[
 {id:'basilica-plaza',x:-77,z:-110,width:80,depth:120,top:-52,type:'slab',frame:0},
 {id:'brush-plaza',x:67,z:-89,width:20,depth:20,top:-26,type:'round',frame:2},
 {id:'lotus-landmark',x:119,z:-148,width:12,depth:12,top:19,type:'lotus-tower',frame:2},
 {id:'temple-landmark',x:-119,z:57,width:27,depth:26,top:-26,type:'temple',frame:0},
 {id:'cathedral-landmark',x:-130,z:-145,width:14,depth:17,top:-28,type:'gabled',frame:3},
 {id:'near-south-art',x:-35,z:155,width:18,depth:16,top:-31,type:'slab',frame:1},
 {id:'near-east-art',x:155,z:35,width:16,depth:18,top:-27,type:'slab',frame:2},
 {id:'near-west-art',x:-145,z:50,width:18,depth:16,top:-26,type:'stepped',frame:3},
 {id:'search-west-roof',x:-43,z:32,width:14,depth:12,top:-20,type:'slab',frame:0},
 {id:'statue-west-base',x:-110,z:-195,width:24,depth:24,top:-32,type:'slab',frame:0},
 {id:'statue-east-base',x:150,z:-175,width:25,depth:23,top:-36,type:'slab',frame:2},
 ];
 for(const b of landmarks)buildings.push({...b,sourceAnchor:[b.x,b.z],yaw:b.yaw||0});
 const reserved=buildings.slice();
 for(const spacing of [17,25]){
  const extent=Math.ceil((config.cityRadius||220)/spacing);
  for(let row=-extent;row<=extent;row++)for(let col=-extent;col<=extent;col++){
   const x=col*spacing+(row%2)*spacing*.26+(random()-.5)*3,z=row*spacing+(random()-.5)*3,r=Math.hypot(x,z);
   if(r<40||r>(config.cityRadius||220)||(spacing===17?r>116:r<116))continue;
   if(Math.abs(x)<roof.size[0]/2+8&&Math.abs(z)<roof.size[1]/2+8)continue;
   if((config.cityParks||[]).some(p=>((x-p.center[0])/(p.radius[0]+4))**2+((z-p.center[1])/(p.radius[1]+4))**2<1))continue;
   const river=-88+Math.sin(z*.018)*15;if(Math.abs(x-river)<11)continue;
   // A low winding avenue gives the eye a route towards the horizon.
   if(z<-50&&Math.abs(x-12-Math.sin(z*.018)*20)<12)continue;
   if(random()<.20)continue;
   const width=7+random()*5,depth=7+random()*6;
   if(reserved.some(b=>Math.abs(x-b.x)<(width+b.width)/2+5&&Math.abs(z-b.z)<(depth+b.depth)/2+5))continue;
   const district=Math.floor((Math.atan2(z,x)+Math.PI)/(Math.PI/2));
   let height=13+random()*22;if(z>20)height*=.65;
   if(r>135)height=9+random()*23;
   if(district===0&&r>85&&random()<.09)height+=23;
   let type=quietShapes[(row+col+100)%quietShapes.length];if(random()<.08&&r>80)type='twin';
   buildings.push({id:'paint-district-'+row+'-'+col+'-'+spacing,sourceAnchor:[x,z],x,z,width,depth,top:ground+height,type,frame:district%4,yaw:(random()-.5)*.18,distance:r});
  }
 }
 return buildings;
}
