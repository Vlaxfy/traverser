'use strict';
// TRAVERSER - online 3D obby. Zero-dependency Node 18+ server (HTTP + Server-Sent Events).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.env.PORT||3000,KEY=process.env.ADMIN_KEY||'',FILE=process.env.DATA_FILE||path.join(__dirname,'data.json');
const UR=(process.env.UPSTASH_REDIS_REST_URL||'').replace(/\/$/,''),UT=process.env.UPSTASH_REDIS_REST_TOKEN||'',DBKEY='traverser:db';
const PC=['#ef4444','#f97316','#f59e0b','#facc15','#a3e635','#22c55e','#10b981','#14b8a6','#06b6d4','#38bdf8','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#fb7185','#fda4af','#fde68a','#ffffff','#94a3b8','#475569','#1f2937'];
// ---- SHARED (identical copy in server.js and index.html): cosmetics catalog, battle pass, shop, levels
const PALS=[['Sunset','#fb923c','#f43f5e'],['Ocean','#0ea5e9','#1e3a8a'],['Mint','#34d399','#ecfdf5'],['Bubblegum','#f472b6','#fdf2f8'],['Lava','#ef4444','#facc15'],['Galaxy','#7c3aed','#0f172a'],['Gold','#facc15','#a16207'],['Midnight','#1e293b','#38bdf8'],['Forest','#15803d','#a3e635'],['Candy','#f43f5e','#ffffff'],['Ice','#bae6fd','#ffffff'],['Neon','#a3e635','#e879f9'],['Coral','#fb7185','#fde68a'],['Royal','#4338ca','#facc15'],['Cocoa','#78350f','#fcd34d'],['Shadow','#111827','#ef4444'],['Toxic','#84cc16','#1a2e05'],['Ruby','#be123c','#fda4af'],['Sapphire','#1d4ed8','#93c5fd'],['Emerald','#047857','#6ee7b7'],['Pearl','#f8fafc','#e9d5ff'],['Holo','#a5f3fc','#f0abfc'],['Aurora','#22d3ee','#a855f7'],['Peach','#fdba74','#fecdd3']];
const KINDS={hat:[['tophat','Top Hat',1],['cone','Traffic Cone',0],['party','Party Hat',0],['crown','Crown',3],['beanie','Beanie',0],['cowboy','Cowboy Hat',1],['propeller','Propeller Cap',2],['halo','Halo',3],['horns','Horns',2],['chef','Chef Hat',1],['bucket','Bucket Hat',0],['cap','Cap',0],['viking','Viking Helmet',2],['flower','Flower',0],['bow','Bow',0],['catears','Cat Ears',1],['bunny','Bunny Ears',1],['antenna','Alien Antennae',2],['headphones','Headphones',1],['mohawk','Mohawk',2],['wizard','Wizard Hat',2],['santa','Santa Hat',1],['pirate','Pirate Hat',2],['gradcap','Grad Cap',1],['tiara','Tiara',3],['astro','Space Helmet',3],['headband','Headband',0],['sombrero','Sombrero',1],['fez','Fez',0],['beret','Beret',0],['hardhat','Hard Hat',0],['pumpkin','Pumpkin Head',2],['mushroom','Mushroom Cap',1],['unicorn','Unicorn Horn',3],['flamehair','Flame Hair',3],['icecream','Ice Cream',1],['ufo','Mini UFO',3],['duck','Rubber Duck',1],['antlers','Antlers',2],['jester','Jester Hat',2]],
face:[['shades','Shades',1],['glasses','Round Glasses',0],['monocle','Monocle',2],['mustache','Mustache',1],['eyepatch','Eye Patch',1],['goggles','Goggles',2],['mask','Bandit Mask',1],['heartshades','Heart Shades',2],['starshades','Star Shades',2],['clownnose','Clown Nose',0],['beard','Big Beard',1],['vr','VR Headset',3],['pixelshades','Pixel Shades',3],['freckles','Freckles',0],['snorkel','Snorkel',1]],
neck:[['tie','Tie',0],['bowtie','Bow Tie',1],['scarf','Scarf',0],['bandana','Bandana',0],['medal','Medal',2],['bell','Bell Collar',1],['chain','Chain',2],['lei','Flower Lei',1],['pearls','Pearls',2],['dogtag','Dog Tag',0],['sheriff','Sheriff Badge',2],['ruff','Fancy Ruff',2],['pendant','Gem Pendant',3]],
back:[['cape','Cape',2],['backpack','Backpack',0],['wings','Wings',3],['jetpack','Jetpack',3],['shell','Shell',1],['fin','Shark Fin',1],['tail','Tail',1],['angel','Angel Wings',3],['batwings','Bat Wings',2],['dragon','Dragon Wings',3],['guitar','Guitar',2],['sword','Toy Sword',2],['surfboard','Surfboard',1],['balloon','Balloon',0],['rocket','Rocket',3],['butterfly','Butterfly Wings',2],['skateboard','Skateboard',1],['flagback','Banner',1],['crystals','Crystal Spikes',3]],
pat:[['stripes','Stripes',0],['spots','Spots',0],['checker','Checkers',1],['zigzag','Zigzag',1],['swirl','Swirl',2],['gradient','Fade',1],['diagonal','Diagonals',0],['camo','Camo',2],['stars','Stars',2],['sprinkles','Sprinkles',1],['rings','Rings',2],['bricks','Bricks',0],['galaxy','Galaxy',3,15],['lava','Lava',3,16],['tiger','Tiger',2,17],['leopard','Leopard',2,18],['zebra','Zebra',1,19],['rainbow','Rainbow',3,20],['plaid','Plaid',1,21],['waves','Waves',1,22],['hex','Hex',2,23],['bigdots','Big Dots',0,24],['tiedye','Tie-Dye',2,25],['hearts','Hearts',2,26]]};
const SLOTS=['hat','face','neck','back','pat'],SLOTN={hat:'Hats',face:'Face',neck:'Neck',back:'Back',pat:'Patterns'},RARN=['Common','Rare','Epic','Legendary'],RARC=['#94a3b8','#38bdf8','#c084fc','#fbbf24'],PRICE=[150,400,900,2000];
const shRng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const CAT=[],CATI={};for(const s of SLOTS)KINDS[s].forEach(([k,kn,rb,pid],ki)=>PALS.forEach(([pn,c1,c2],pi)=>{const r=Math.min(3,rb+([5,6,13,15,17,21,22].includes(pi)?1:0)),it={id:s+'.'+k+'.'+pi,s,k,n:pn+' '+kn,r,c:[c1,c2],pi:s=='pat'?(pid||ki+1):0};CAT.push(it);CATI[it.id]=it}));
const XPT=600,TIERS=100;
const BP=(()=>{const r=shRng(2026),out=[],used=new Set();const pick=minR=>{for(let i=0;i<500;i++){const it=CAT[Math.floor(r()*CAT.length)];if(it.r>=minR&&!used.has(it.id)&&(minR>=2||it.r<=minR+1)){used.add(it.id);return it.id}}return CAT[0].id};
for(let t=1;t<=TIERS;t++){if(t%10==0)out.push({t,i:pick(t>=50?3:2)});else if(t%5==0)out.push({t,i:pick(1),c:150});else out.push({t,i:pick(0)})}return out})();
const BPSET=new Set(BP.map(b=>b.i));
const dayKey=ms=>Math.floor((ms||Date.now())/86400000);
function shopFor(d){const r=shRng(d*7919+13),out=[],seen=new Set();let g=0;while(out.length<8&&g++<2000){const it=CAT[Math.floor(r()*CAT.length)];if(BPSET.has(it.id)||seen.has(it.id))continue;if(out.length<2&&it.r<2)continue;seen.add(it.id);out.push(it.id)}return out}
const lvlNeed=L=>Math.round(150*Math.pow(L,1.4));
function lvlInfo(xp){let L=1,x=xp||0;while(L<500&&x>=lvlNeed(L)){x-=lvlNeed(L);L++}return{lvl:L,into:x,need:lvlNeed(L)}}
const tierOf=xp=>Math.min(TIERS,Math.floor((xp||0)/XPT));
// ---- END SHARED

// ================= WORLD (shared by server and client): themes, maps, obstacles, physics, bots =================
const hx=h=>{h=String(h||'#38bdf8').replace('#','');if(h.length==3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
function mMul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
function mTRS(x,y,z,rx,ry,rz,sx,sy,sz){const cx=Math.cos(rx),snx=Math.sin(rx),cy=Math.cos(ry),sny=Math.sin(ry),cz=Math.cos(rz),snz=Math.sin(rz);
const A=[[cy,sny*snx,sny*cx],[0,cx,-snx],[-sny,cy*snx,cy*cx]],m=new Float32Array(16);
for(let i=0;i<3;i++){const r0=A[i][0]*cz+A[i][1]*snz,r1=-A[i][0]*snz+A[i][1]*cz,r2=A[i][2];m[i]=r0*sx;m[4+i]=r1*sy;m[8+i]=r2*sz}m[12]=x;m[13]=y;m[14]=z;m[15]=1;return m}
const tvRng=shRng;
// ---- themes
const THEMES=[
 {id:'beach',name:'Sunny Beach',sky:['#2f8ff0','#bfe6ff'],fog:[.76,.89,1],sun:[1,.96,.85],sea:[.03,.42,.72],seaK:0,plat:['#ffd166','#ff6b9a','#4ade80','#5aa9ff','#ff9f43'],mv:'#a78bfa',hz:'#ff4757',trim:'#ffffff',props:'beach'},
 {id:'candy',name:'Candy Land',sky:['#ff7ab6','#ffe3f1'],fog:[1,.9,.95],sun:[1,.93,.95],sea:[.98,.55,.75],seaK:4,plat:['#ff8fc8','#9be7ff','#fff27a','#b8ff9e','#d7a6ff'],mv:'#ff5c8a',hz:'#e11d48',trim:'#ffffff',props:'candy'},
 {id:'jungle',name:'Jungle Ruins',sky:['#3fbf8a','#e7ffd6'],fog:[.82,.95,.82],sun:[1,.97,.8],sea:[.06,.42,.34],seaK:0,plat:['#b9a17a','#8fbf5a','#d8c49a','#6fa86b','#c98f5a'],mv:'#f59e0b',hz:'#dc2626',trim:'#f5ecd7',props:'jungle'},
 {id:'ice',name:'Frozen Peaks',sky:['#6fb6ff','#f2f9ff'],fog:[.88,.94,1],sun:[1,1,1],sea:[.28,.62,.9],seaK:0,plat:['#e9f6ff','#9fd8ff','#c7b8ff','#7ee0ff','#ffffff'],mv:'#5b8cff',hz:'#ef4444',trim:'#bfe3ff',props:'ice'},
 {id:'lava',name:'Lava Forge',sky:['#1a0505','#ff6a2b'],fog:[.55,.2,.12],sun:[1,.6,.35],sea:[1,.32,.04],seaK:1,plat:['#3b2a2a','#5a3a32','#4a2f2a','#6b4038','#2f2424'],mv:'#ff8a3d',hz:'#ffcc00',trim:'#ff6a2b',props:'lava'},
 {id:'neon',name:'Neon Night',sky:['#05031a','#3a1878'],fog:[.12,.06,.26],sun:[.7,.6,1],sea:[.06,.05,.22],seaK:2,plat:['#ff2fd1','#21f3ff','#a3ff3c','#ffd23f','#8b5cff'],mv:'#ff2fd1',hz:'#ff3b3b',trim:'#ffffff',props:'neon',glow:1},
 {id:'skyk',name:'Sky Kingdom',sky:['#58b8ff','#fff1d6'],fog:[1,.97,.92],sun:[1,.95,.85],sea:[.98,.98,1],seaK:3,plat:['#ffe08a','#ffb4c8','#a8e6ff','#c6f6a8','#ffffff'],mv:'#ff9f43',hz:'#ff4757',trim:'#ffd700',props:'sky'},
 {id:'space',name:'Space Station',sky:['#01030f','#1b1650'],fog:[.05,.05,.15],sun:[.85,.9,1],sea:[.2,.08,.45],seaK:2,plat:['#cbd5e1','#94a3b8','#38bdf8','#e2e8f0','#a78bfa'],mv:'#22d3ee',hz:'#f43f5e',trim:'#22d3ee',props:'space',glow:1}];
const MAPN=[['Sunny Steps','Coral Crossing','Tidal Twist','Lighthouse Lunge'],['Gumdrop Gauntlet','Lollipop Lane','Sugar Rush','Jelly Jam'],['Vine Valley','Ruins Rush','Monkey Business','Totem Trail'],['Frosty Flip','Glacier Gauntlet','Snowball Slide','Polar Pursuit'],['Magma Mile','Volcano Vault','Ember Escape','Molten Madness'],['Neon Nights','Laser Lane','Synth City','Glow Rush'],['Cloud Hopper','Sky High','Balloon Bash','Windy Heights'],['Orbit Obby','Asteroid Alley','Zero-G Zone','Galaxy Gauntlet']];
const SEGL={gap:18,beam:16,zig:18,mover:20,lift:16,spin:16,tiles:16,stairs:16,pend:18,conv:16,bounce:20,pillars:18,walls:18,fan:20,turn:22,doors:18,tiptoe:22,punch:18,logs:24,bumpers:18,speed:12,cp:8};
const SEGP=[['gap','zig','stairs','conv','bounce','beam','speed','fan','bumpers','turn','doors'],['mover','lift','spin','pillars','punch','tiptoe','logs'],['pend','tiles','walls']];
const MAPS=(()=>{const out=[];let id=0;THEMES.forEach((th,ti)=>MAPN[ti].forEach((name,mi)=>{const d=[1,2,3,4,5][(ti*3+mi*2)%5],seed=4000+id*7919,r=shRng(seed);
 let pool=SEGP[0].slice();if(d>=2)pool=pool.concat(SEGP[1].slice(0,d>=3?7:4));if(d>=4)pool=pool.concat(SEGP[2],SEGP[1]);if(d>=5)pool=pool.concat(SEGP[2],SEGP[1].slice(2));
 const n=9+d+Math.floor(r()*3),segs=[];let cur=6,prev='',since=0;
 for(let k=0;k<n;k++){let t;do t=pool[Math.floor(r()*pool.length)];while(t===prev);prev=t;segs.push({k:t,z:cur,L:SEGL[t],sd:seed*31+k});cur+=SEGL[t];since++;if(since>=4&&k<n-2){segs.push({k:'cp',z:cur,L:SEGL.cp,sd:0});cur+=SEGL.cp;since=0}}
 out.push({id:id++,name,d,th:ti,segs,fin:cur,minT:cur/12})}));return out})();
const roundMs=m=>Math.round((50+m.segs.length*9)*1000);
// ---- world
function tvWorld(map,props){const W={sol:[],hz:[],fans:[],cps:[],doorRows:[],tiles:[],deco:[],th:THEMES[map?map.th:0],lobby:!map,map,rev:new Set()};const th=W.th,pc=th.plat.map(hx),mvc=hx(th.mv),hzc=hx(th.hz);let ci=0;const nc=()=>pc[(ci++)%pc.length];
const add=(x,top,z,w,h,d,o)=>{const s=Object.assign({bx:x,by:top-h/2,bz:z,w,h,d,c:nc(),x,y:top-h/2,z,px:x,py:top-h/2,pz:z,dx:0,dy:0,dz:0,act:true,id:W.sol.length},o||{});if(s.mv&&!(o&&o.c))s.c=mvc;W.sol.push(s);return s};
const D=(g,M,c,o)=>{if(props)W.deco.push(Object.assign({g,M,c},o||{}))};
if(!map){// lobby island
 add(0,0,0,30,3,30,{c:hx('#ffe29a'),st:2,r:1.2});add(0,-.04,0,20,3.2,36,{c:hx('#ffd166'),st:2,r:1.2});add(0,-.08,0,36,3.1,20,{c:hx('#ffc94d'),st:2,r:1.2});
 add(0,1.2,0,7,1.2,7,{c:hx('#5aa9ff'),r:.5});add(0,2.4,0,3.4,1.2,3.4,{c:hx('#ff6b9a'),r:.5});
 [[-12,-12],[12,-12],[-12,12],[12,12]].forEach(([x,z])=>add(x,.45,z,3.2,.5,3.2,{bn:1,c:hx('#2ee59d'),k:'pad',r:.25}));
 for(let k=0;k<12;k++){const a=k/12*Math.PI*2;add(Math.cos(a)*23,.4+(k%3)*.5,Math.sin(a)*23,2.6,1,2.6,{r:.4})}
 W.fans.push({x:0,z:-8,hw:1.3,hd:1.3,y0:0,y1:9,on:()=>true});add(0,.2,-8,2.6,.4,2.6,{k:'fan',c:hx('#cbd5e1'),r:.2});
 W.spawn=()=>{const a=Math.random()*Math.PI*2,r=4+Math.random()*7;return[Math.cos(a)*r,0.1,Math.sin(a)*r]};W.finZ=1e9;if(props)propsLobby(W);wBuck(W);return W}
add(0,0,0,12,1,12,{c:hx('#f8fafc'),st:3,c2:hx('#dbe4ef'),r:.4});W.cps.push({z:0,top:0});
const d=map.d;
for(const sg of map.segs){const z0=sg.z,L=sg.L,r=shRng(sg.sd||1),rr=(a,b)=>a+(b-a)*r(),c0=z0+3,mid=c0+(L-3)/2;
 if(sg.k=='cp'){add(0,0,z0+L/2,9,1,L,{c:hx('#f8fafc'),st:3,c2:hx(th.trim),r:.4,cp:1});W.cps.push({z:z0+1,top:0});if(props){for(const x of[-4,4]){D('cyl',mTRS(x,1.6,z0+1,0,0,0,.1,3.2,.1),[.95,.95,.95]);D('flag',mTRS(x,2.9,z0+1,0,0,0,1,1,1),hx('#22c55e'),{flag:1})}}continue}
 add(0,0,z0+1.5,6,1,3,{r:.35});
 switch(sg.k){
 case'gap':{let z=c0+1.6;while(z<z0+L-1.2){add(rr(-1.5,1.5),rr(0,.7),z,2.2-d*.08,1,2.2-d*.08,{r:.35});z+=3.1+rr(0,.4)}break}
 case'beam':{const w=Math.max(.8,1.3-d*.1),n=3,len=(L-3)/n;let x=0;for(let k=0;k<n;k++){add(x,0,c0+len*k+len/2,w,1,len+.4,{r:.25});x=k%2?-.5:.6}break}
 case'zig':{let z=c0+1.4,k=0;while(z<z0+L-1){add(k%2?2:-2,0,z,2.6,1,2.6,{r:.35});z+=3;k++}break}
 case'mover':{let z=c0+2;while(z<z0+L-2){const ph=rr(0,6.28),sp=.8+d*.15+rr(0,.35);add(0,0,z,3,1,3,{mv:t=>[Math.sin(t*sp+ph)*2.6,0,0],r:.35});z+=4.2}break}
 case'lift':{let z=c0+2;while(z<z0+L-2){const ph=rr(0,6.28),sp=.9+d*.12;add(rr(-1,1),0,z,3,1,3,{mv:t=>[0,Math.sin(t*sp+ph)*1.3,0],r:.35});z+=4.2}break}
 case'spin':{add(0,0,mid,8,1,L-3,{r:.4});const n=1+(d>3?1:0);for(let k=0;k<n;k++){const sp=(1.1+d*.15)*(r()<.5?-1:1),ph=rr(0,6.28);W.hz.push({t:'spin',x:0,y:.55,z:c0+(L-3)*(k+1)/(n+1),len:4.2,sp,ph})}break}
 case'tiles':{let z=c0+1.05;while(z<z0+L-.9){for(const x of[-2.1,0,2.1]){const ph=rr(0,3.5),sp=.8+d*.08;add(x,0,z,2,1,2,{on:t=>((t*sp+ph)%3.5)<2.45,tp:t=>((t*sp+ph)%3.5),r:.25})}z+=2.1}break}
 case'stairs':{const n=Math.floor((L-3)/2);for(let k=0;k<n;k++){const top=.55*Math.min(k+1,n-k);add(0,top,c0+1+k*2,5,top+1,2,{r:.2})}break}
 case'pend':{add(0,0,mid,3.4,1,L-3,{r:.3});const n=2+(d>3?1:0);for(let k=0;k<n;k++)W.hz.push({t:'pend',x:0,y:7,z:c0+(L-3)*(k+1)/(n+1),l:6.2,amp:1.05,sp:1.4+d*.13,ph:rr(0,6.28)});break}
 case'conv':{add(0,0,mid,4.4,1,L-3,{cv:[0,-(2.2+d*.5)],c:hx('#2b3446'),k:'conv',r:.3});break}
 case'bounce':{add(0,.45,c0+1.5,3.2,1.5,3.2,{bn:1,c:hx('#2ee59d'),k:'pad',r:.3});add(0,2.5,c0+11.5,4.6,3.5,4.6,{r:.4});break}
 case'pillars':{let z=c0+1.5;while(z<z0+L-1){const top=rr(0,1.1);add(rr(-1.2,1.2),top,z,1.5,top+6,1.5,{r:.35,k:'pillar'});z+=2.6}break}
 case'walls':{add(0,0,mid,5.2,1,L-3,{r:.3});const n=2+(d>3?1:0);for(let k=0;k<n;k++){const ph=rr(0,6.28),sp=1+d*.18;add(0,2.2,c0+(L-3)*(k+1)/(n+1),2.2,2.2,.8,{mv:t=>[Math.sin(t*sp+ph)*2.7,0,0],kn:1,c:hzc,r:.25,k:'wall'})}break}
 case'fan':{add(0,0,c0+3,6.4,1,6,{r:.35});const ph=rr(0,6);for(const x of[-1.6,1.6]){add(x,.25,c0+4.4,2.4,.5,2.4,{k:'fan',c:hx('#cbd5e1'),r:.2,ph});W.fans.push({x,z:c0+4.4,hw:1.25,hd:1.25,y0:0,y1:6.6,on:t=>((t+ph)%6)<4.6,ph})}add(0,5,c0+10.6,5,4,6.4,{r:.4});break}
 case'turn':{add(0,0,c0+1.25,4,1,2.5,{r:.3});const sp=(.45+d*.1)*(r()<.5?-1:1);add(0,0,c0+9.5,14,1,14,{disc:7,rot:sp,k:'turn',r:.35});add(0,0,z0+L-1.25,4,1,2.5,{r:.3});
  for(let k=0;k<3;k++){const a=k/3*Math.PI*2+rr(0,1);W.hz.push({t:'bump',disc:{x:0,z:c0+9.5,sp,a,R:4},x:0,z:0,r:.6,y0:0,y1:1.4})}break}
 case'doors':{add(0,0,mid,10.4,1,L-3,{r:.3});for(const rz of[c0+5,c0+11]){const nf=1+Math.floor(r()*2),idx=[0,1,2,3,4].sort(()=>r()-.5).slice(0,nf),xs=[-4.1,-2.05,0,2.05,4.1];
  xs.forEach((x,i)=>add(x,2.8,rz,2,2.8,.5,{door:1,fake:idx.includes(i),c:pc[i%pc.length],r:.15,k:'door'}));W.doorRows.push({z:rz,xs})}break}
 case'tiptoe':{const cols=[-3.3,-1.1,1.1,3.3];let safe=Math.floor(r()*4);for(let z=c0+1.2,row=0;z<z0+L-1;z+=2.4,row++){if(row)safe=Math.max(0,Math.min(3,safe+Math.floor(r()*3)-1));cols.forEach((x,i)=>{const fake=i!==safe&&r()<.55;const s=add(x,0,z,2.1,.6,2.1,{fake,k:'tip',r:.2,c:hx(th.plat[(row+i)%2?0:1])});W.tiles.push(s)})}break}
 case'punch':{add(0,0,mid,4.2,1,L-3,{r:.3});for(let k=0;k<3;k++){const side=k%2?1:-1,ph=rr(0,6.28),sp=1.3+d*.15;add(side*3.4,1.3,c0+3+k*4.6,1.4,1.4,1.6,{mv:t=>[-side*2.6*Math.pow(Math.max(0,Math.sin(t*sp+ph)),6),0,0],kn:1,c:hzc,r:.3,k:'punch'})}break}
 case'logs':{add(0,0,mid,6.4,1,L-3,{r:.3});const n=d>=4?2:1,sp=3+d*.25;for(let k=0;k<n;k++)W.hz.push({t:'log',x:0,w:6,r:.75,z0:c0+1,z1:z0+L-1.5,sp,ph:k*(L-2.5)/n,y:.75});break}
 case'bumpers':{add(0,0,mid,8.4,1,L-3,{r:.35});const n=4+Math.floor(d/2);for(let k=0;k<n;k++)W.hz.push({t:'bump',x:rr(-3,3),z:c0+2+k*(L-6)/n+rr(0,1.2),r:.7,y0:0,y1:1.5});break}
 case'speed':{add(0,0,mid,5,1,L-3,{r:.3});for(let z=c0+1.5;z<z0+L-2;z+=3.2)add(0,.02,z,2.6,.06,2,{sp:1,k:'speed',c:hx('#ffd23f'),r:.03,thin:1});break}}}
W.finZ=map.fin;add(0,0,map.fin+5,12,1,10,{c:hx('#f8fafc'),st:3,c2:hx('#111827'),r:.4});
W.spawn=i=>[((i||0)%8-3.5)*1.3,0.1,3-Math.floor((i||0)/8)*1.3];
W.cpSpawn=(cz,i)=>{let c=W.cps[0];for(const p of W.cps)if(p.z<=cz+.5)c=p;return c.z===0?W.spawn(i):[((i||0)%5-2)*1.4,.1,c.z+1.5]};
if(props)propsCourse(W);wBuck(W);return W}
function propsLobby(W){}function propsCourse(W){}
const BK=8;function wBuck(W){W.bk=new Map();for(const s of W.sol){const z0=Math.floor((s.z-s.d/2-3)/BK),z1=Math.floor((s.z+s.d/2+3)/BK);for(let k=z0;k<=z1;k++){if(!W.bk.has(k))W.bk.set(k,[]);W.bk.get(k).push(s)}}}
function wNear(W,z,ahead){const k0=Math.floor(z/BK)-1,k1=Math.floor((z+(ahead||0))/BK)+1,key=k0*1000+k1;W.nc=W.nc||new Map();let r=W.nc.get(key);if(!r){const out=new Set();for(let k=k0;k<=k1;k++){const l=W.bk.get(k);if(l)for(const s of l)out.add(s)}r=[...out];W.nc.set(key,r)}return r}

// ================= PHYSICS =================
const TVR=.42,TVH=1.55;
function tvSolidsUpd(W,t){for(const s of W.sol){s.px=s.x;s.py=s.y;s.pz=s.z;if(s.mv){const o=s.mv(t);s.x=s.bx+o[0];s.y=s.by+o[1];s.z=s.bz+o[2]}s.dx=s.x-s.px;s.dy=s.y-s.py;s.dz=s.z-s.pz;s.act=s.on?s.on(t):true}
for(const h of W.hz)if(h.t=='log')h.lz=h.z1-((t*h.sp+h.ph)%(h.z1-h.z0));
for(const h of W.hz)if(h.disc){const a=h.disc.a+t*h.disc.sp;h.x=h.disc.x+Math.cos(a)*h.disc.R;h.z=h.disc.z+Math.sin(a)*h.disc.R}}
const tvOv=(P,s)=>{if(s.disc){if(Math.hypot(P.x-s.x,P.z-s.z)>s.disc+TVR*.3)return false;return P.y+TVH>s.y-s.h/2&&P.y<s.y+s.h/2}return P.x+TVR>s.x-s.w/2&&P.x-TVR<s.x+s.w/2&&P.z+TVR>s.z-s.d/2&&P.z-TVR<s.z+s.d/2&&P.y+TVH>s.y-s.h/2&&P.y<s.y+s.h/2};
const mkBody=(x,y,z)=>({x,y,z,vx:0,vy:0,vz:0,ry:0,gr:null,kt:0,hk:0,co:0,walk:0,air:false,w:{},bst:0,cpz:0,ev:[]});
function knock(P,vx,vz,vy,kt,tilt){P.vx=vx;P.vz=vz;P.vy=vy;P.kt=kt;P.gr=null;P.hk=.5;P.w.tv=(P.w.tv||0)+(tilt||5);P.ev.push('hit')}
function physStep(P,W,dt,t,wx,wz,jump,frozen,sp){sp=(sp||9)*(P.bst>0?1.75:1);if(frozen){wx=wz=0}P.bst=Math.max(0,P.bst-dt);
const tx=wx*sp,tz=wz*sp;if(P.kt>0){P.kt-=dt;const a=1.2*dt;P.vx+=(tx-P.vx)*a;P.vz+=(tz-P.vz)*a}else{const a=Math.min(1,(P.gr?14:5)*dt);P.vx+=(tx-P.vx)*a;P.vz+=(tz-P.vz)*a}
if(Math.hypot(wx,wz)>.1&&!frozen){const tr=Math.atan2(wx,wz);let d=tr-P.ry;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;P.ry+=d*Math.min(1,dt*14);P.w.tv=(P.w.tv||0)-d*1.2}
P.walk=P.gr?Math.hypot(P.vx,P.vz)/9:0;
if(P.gr){const g=P.gr;if(g.disc&&g.rot){const a=g.rot*dt,dx=P.x-g.x,dz=P.z-g.z,c=Math.cos(a),s=Math.sin(a);P.x=g.x+dx*c-dz*s;P.z=g.z+dx*s+dz*c;P.ry-=a}P.x+=g.dx;P.y+=g.dy;P.z+=g.dz;if(g.cv){P.x+=g.cv[0]*dt;P.z+=g.cv[1]*dt}if(g.sp&&P.bst<.5){P.bst=.9;P.ev.push('boost')}P.co=.12}else P.co-=dt;
if(jump&&!frozen&&(P.gr||P.co>0)){P.vy=12;P.gr=null;P.co=0;P.w.sqv=(P.w.sqv||0)+1.6;P.ev.push('jump')}
P.vy=Math.max(-40,P.vy-32*dt);
for(const f of W.fans){if(Math.abs(P.x-f.x)<f.hw&&Math.abs(P.z-f.z)<f.hd&&P.y>=f.y0-.5&&P.y<f.y1&&f.on(t)){P.vy=Math.min(13,P.vy+62*dt);P.gr=null;P.co=0;P.infan=.3}}
const near=[];for(const s of wNear(W,P.z,0))if(s.act&&!s.fake&&Math.abs(s.z-P.z)<s.d/2+3&&Math.abs(s.x-P.x)<s.w/2+3)near.push(s);
for(const s of near)if(s.mv&&!P.gr&&tvOv(P,s)){const top=s.y+s.h/2;if(P.y>=top-.4)P.y=top;else{if(Math.abs(s.dx)>Math.abs(s.dz))P.x=s.dx>0?s.x+s.w/2+TVR:s.x-s.w/2-TVR;if(s.kn&&P.hk<=0)knock(P,Math.sign(s.dx||1)*(s.k=='punch'?20:15),P.vz,7,.7,Math.sign(s.dx||1)*5)}}
const prevY=P.y,wasAir=!P.gr,vy0=P.vy;
P.x+=P.vx*dt;for(const s of near)if(!s.disc&&tvOv(P,s)){const top=s.y+s.h/2;if(top-P.y<=.6&&P.vy<=0){P.y=top;continue}P.x=P.vx>0?s.x-s.w/2-TVR-.001:s.x+s.w/2+TVR+.001;if(s.kn&&P.hk<=0)knock(P,-Math.sign(P.vx||1)*12,P.vz,4,.5);else P.vx=0}
P.z+=P.vz*dt;for(const s of near)if(!s.disc&&tvOv(P,s)){const top=s.y+s.h/2;if(top-P.y<=.6&&P.vy<=0){P.y=top;continue}P.z=P.vz>0?s.z-s.d/2-TVR-.001:s.z+s.d/2+TVR+.001;P.vz=0}
P.y+=P.vy*dt;P.gr=null;for(const s of near)if(tvOv(P,s)){const top=s.y+s.h/2;if(P.vy<=0&&prevY>=top-.45){P.y=top;P.vy=0;P.gr=s;if(s.bn){P.vy=22;P.gr=null;P.bounced=s;s.sq=1;P.w.sqv=(P.w.sqv||0)-2;P.ev.push('bounce')}}else if(P.vy>0&&!s.disc){P.y=s.y-s.h/2-TVH;P.vy=0}}
// fake tiles: reveal when someone drops through
for(const s of W.tiles)if(Math.abs(s.z-P.z)<2&&s.fake&&!W.rev.has(s.id)&&Math.abs(P.x-s.x)<s.w/2&&Math.abs(P.z-s.z)<s.d/2&&P.y<s.y+s.h/2-.15&&P.y>s.y-1.5){W.rev.add(s.id);P.ev.push('crack')}
P.hk-=dt;
for(const h of W.hz){if(Math.abs(h.z-P.z)>8)continue;
 if(h.t=='spin'){const a=t*h.sp+h.ph,c=Math.cos(a),s=Math.sin(a),dx=P.x-h.x,dz=P.z-h.z,al=dx*c+dz*s,pp=-dx*s+dz*c;if(Math.abs(al)<h.len&&Math.abs(pp)<.55+TVR&&P.y<h.y+.3&&P.y+TVH>h.y-.3&&P.hk<=0){const sg=Math.sign(al)*Math.sign(h.sp);knock(P,-s*sg*16,c*sg*16,7,.7,6)}}
 else if(h.t=='pend'){const an=h.amp*Math.sin(t*h.sp+h.ph),bx=h.x+Math.sin(an)*h.l,by=h.y-Math.cos(an)*h.l,dx=P.x-bx,dy=P.y+.8-by,dz=P.z-h.z;if(Math.hypot(dx,dy,dz)<1.5&&P.hk<=0){const v=Math.cos(t*h.sp+h.ph);knock(P,Math.sign(v||1)*18,P.vz,7,.8,-Math.sign(v||1)*7)}}
 else if(h.t=='log'){const lz=h.lz;if(Math.abs(P.z-lz)<h.r+TVR&&Math.abs(P.x-h.x)<h.w/2&&P.y<h.y+h.r&&P.y+TVH>h.y-h.r&&P.hk<=0)knock(P,P.vx,-11,7,.6,4)}
 else if(h.t=='bump'){const dx=P.x-h.x,dz=P.z-h.z,dd=Math.hypot(dx,dz);if(dd<h.r+TVR&&P.y<h.y1&&P.y+TVH>h.y0&&P.hk<=0){const nx=dx/(dd||1),nz=dz/(dd||1);knock(P,nx*11,nz*11,5,.45,4);h.sq=1}}}
P.air=!P.gr;if(P.gr&&P.gr.cp)P.cpz=Math.max(P.cpz||0,P.gr.z-P.gr.d/2+1);
if(wasAir&&P.gr&&vy0<-9)P.ev.push('land');
if(typeof wobUpd=='function')wobUpd(P.w,dt,Math.hypot(P.vx,P.vz),P.air,wasAir&&P.gr?Math.max(0,-vy0):0);
return P.y<-3.2?'fell':''}

// ================= BOTS =================
const BOTA=['sky','nova','jelly','pixel','frost','blaze','luna','turbo','ziggy','mango','echo','cosmo','bubbles','rocket','sunny','shadow','storm','peachy','noodle','biscuit','comet','flare','gummy','kiwi','maple','orbit','panda','quartz','raptor','sprout','toast','vortex','waffle','yeti','zest','blue','lucky','misty','dash','ember'];
const BOTB=['','_','x','.'],BOTC=['','99','7','2012','_yt','xd','123','4life','TTV','2k','08','11','gg','pro','HD','_ok','42','3'];
function botName(r){r=r||Math.random;const a=BOTA[Math.floor(r()*BOTA.length)],b=BOTA[Math.floor(r()*BOTA.length)],form=Math.floor(r()*5),cap=s=>s[0].toUpperCase()+s.slice(1),num=BOTC[Math.floor(r()*BOTC.length)];
return(form==0?cap(a)+cap(b):form==1?a+BOTB[Math.floor(r()*BOTB.length)]+b:form==2?cap(a)+num:form==3?a+b+num:cap(a)+'_'+cap(b)).slice(0,16)}
function botLook(r){r=r||Math.random;const eq={};for(const s of['hat','face','neck','back','pat'])if(r()<[.7,.35,.35,.3,.5][SLOTS.indexOf(s)]){const pool=CAT.filter(c=>c.s==s);eq[s]=pool[Math.floor(r()*pool.length)].id}return eq}
function botMake(i,W,o){const sp=W.spawn(i+1),b=mkBody(sp[0],sp[1],sp[2]);b.bot=Object.assign({skill:.8+Math.random()*.18,ax:(Math.random()-.5)*.8,fin:false,bad:new Set(),dz0:0,stuck:0},o||{});return b}
function botAI(b,W,t,dt){const B=b.bot;if(B.fin){const dz=(B.fz||b.z)-b.z;return[0,Math.abs(dz)>.5?Math.sign(dz)*.4:0,Math.random()<.004]}let best=null,bs=1e9;const g=b.gr,gz=g?g.z+g.d/2:b.z;
if(g)B.lastG=g;if(b.bounced){B.lastG=b.bounced;B.lock=null;b.bounced=null}
const hmax=g&&g.k=='fan'||b.infan>0?8:2.1;if(b.infan>0)b.infan-=dt;
for(const s of wNear(W,b.z,9)){if(!s.act||s.kn||s.door||s.thin)continue;if(s.k=='tip'&&s.fake&&W.rev.has(s.id))continue;const top=s.y+s.h/2,near=s.z-s.d/2,far=s.z+s.d/2;if(far<b.z+.8||near>b.z+7.5||top>b.y+hmax)continue;
 if(s===g){if(far>b.z+1.6){const sc=(far-b.z)*.2;if(sc<bs){bs=sc;best=s}}continue}let sc=Math.max(0,near-gz)+.5*Math.abs(s.x-b.x)+(near<gz-.3?2:0);if(s.k=='tip')sc+=(B.tipR=B.tipR||{},B.tipR[s.id]=B.tipR[s.id]??Math.random()*2.2);if(s.k=='fan')sc-=1.5;if(sc<bs){bs=sc;best=s}}
if(!g&&B.lastG&&B.lastG.k=='fan'){const ft=B.lastG.y+B.lastG.h/2;let T=null;for(const s2 of wNear(W,b.z,11)){const top=s2.y+s2.h/2;if(top>ft+2&&!s2.kn&&s2.z+s2.d/2>b.z&&s2.z-s2.d/2<b.z+10){T=s2;break}}if(T){const top=T.y+T.h/2;if(b.y>top+.3){const ex=T.x-b.x,ez=T.z-b.z,l=Math.hypot(ex,ez)||1;return[ex/l,ez/l,false]}return[0,0,false]}}
if(g&&g.k=='fan'){const f=W.fans.find(f=>Math.abs(f.x-g.x)<.1&&Math.abs(f.z-g.z)<.1);if(f){const ex=f.x-b.x,ez=f.z-b.z,l=Math.hypot(ex,ez);return l<.3?[0,0,false]:[ex/l*.6,ez/l*.6,false]}}
const L=.45;let tx=b.x,tz=b.z+3,ty=b.y,bw=1;if(best){const o=best.mv?best.mv(t+L):[best.x-best.bx,best.y-best.by,0];tx=best.bx+o[0]+B.ax*Math.min(.45,best.w/2-.3);ty=best.by+o[1]+best.h/2;bw=best.w;tz=Math.min(best.z+best.d/2-.4,Math.max(best.z-best.d/2+.6,b.z+2.5));if(best.disc){tx=best.x+B.ax;tz=best.z+best.d/2-1}}
// door dash: pick a door that has not blocked us
for(const row of W.doorRows){if(row.z>b.z-.3&&row.z<b.z+6){const key=x=>row.z+':'+x;let opts=row.xs.filter(x=>!B.bad.has(key(x)));if(!opts.length){row.xs.forEach(x=>B.bad.delete(key(x)));opts=row.xs}if(B.door==null||B.bad.has(key(B.door))||B.drow!==row.z){B.door=opts[Math.floor(Math.random()*opts.length)];B.drow=row.z}tx=B.door;tz=row.z+2;
 if(row.z-b.z<1.3&&Math.hypot(b.vx,b.vz)<1.2){B.stuck+=dt;if(B.stuck>.35){B.bad.add(key(B.door));B.door=null;B.stuck=0}}else B.stuck=0;break}}
for(const h of W.hz)if(h.t=='bump'&&h.z>b.z-.3&&h.z-b.z<3&&Math.abs(h.x-tx)<1.5)tx=h.x+(tx>=h.x?1.7:-1.7);
let dx=tx-b.x,dz=Math.max(.6,tz-b.z),jump=false,wait=false;
if(g&&best&&best!==g&&!(g.k=='fan')){const edge=g.disc?g.z+g.disc:g.z+g.d/2,ready=Math.abs(tx-b.x)<bw/2+.5&&ty<b.y+2;
 if(!ready&&best.mv){wait=true;dx=(Math.max(g.x-g.w/2+.5,Math.min(g.x+g.w/2-.5,tx))-b.x);dz=(edge-.7)-b.z}
 else{const fx=b.x+b.vx*.14,fz=b.z+b.vz*.14,walkOn=(best.z-best.d/2)-edge<.3&&ty-b.y<.55&&Math.abs(tx-b.x)<best.w/2;const off=g.disc?Math.hypot(fx-g.x,fz-g.z)>g.disc-.2:(fx<g.x-g.w/2+.05||fx>g.x+g.w/2-.05||fz>edge-.05);if(!walkOn&&(off||(ty>b.y+.5&&Math.hypot(tx-b.x,(best.z-best.d/2)-b.z)<2.6)))jump=true}}
for(const h of W.hz){if(Math.abs(h.z-b.z)>4.5&&h.t!='log')continue;if(h.t=='spin'&&g&&!jump){for(const dtp of[.12,.25]){const a=(t+dtp)*h.sp+h.ph,c=Math.cos(a),sn=Math.sin(a),px=b.x-h.x,pz=b.z-h.z;if(Math.abs(px*c+pz*sn)<h.len&&Math.abs(-px*sn+pz*c)<1&&Math.random()<B.skill)jump=true}}
 else if(h.t=='log'&&g&&h.lz!=null){const cl=Math.max(0,b.vz)+h.sp,gp=h.lz-b.z-h.r;if(gp>0&&gp<cl*.3+.4&&Math.random()<B.skill+.1)jump=true}
 else if(h.t=='pend'&&b.z<h.z-.8&&b.z>h.z-3.4){const w=t*h.sp+h.ph,an=h.amp*Math.sin(w),bx=Math.sin(an)*h.l,v=Math.cos(w),out=Math.sign(bx)==Math.sign(v)&&Math.abs(bx)>.9;if(!out&&!B.pgo){wait=true;dz=(h.z-3)-b.z;dx=-b.x*.5}else B.pgo=out||B.pgo}
else if(h.t=='pend'&&b.z>=h.z+.8)B.pgo=false;}
if(jump&&best)B.lock=best;if(g&&!jump)B.lock=null;
if(!g&&(!B.lock||B.lock===B.lastG)){const mh=b.y+Math.max(0,b.vy)*Math.max(0,b.vy)/64+.2+(b.infan>0?3:0);let bb=null,sc=1e9;for(const s2 of wNear(W,b.z,13)){if(!s2.act||s2.kn||s2.fake&&W.rev.has(s2.id)||s2===B.lastG||s2.door)continue;const top=s2.y+s2.h/2,nr=s2.z-s2.d/2,fr=s2.z+s2.d/2;if(fr<b.z+.5||nr>b.z+12||top>mh)continue;const v=Math.max(0,nr-b.z)+.5*Math.abs(s2.x-b.x)-top*.3;if(v<sc){sc=v;bb=s2}}if(bb)B.lock=bb}
if(!g&&B.lock&&B.lock.act&&!B.lock.bn&&!(b.infan>0&&B.lock.y+B.lock.h/2>b.y)){const T=B.lock,o=T.mv?T.mv(t+.25):[T.x-T.bx,T.y-T.by,0],cx=T.bx+o[0],top=T.by+o[1]+T.h/2,disc=b.vy*b.vy+64*(b.y-top);if(disc>0){const ta=Math.max(.08,(b.vy+Math.sqrt(disc))/32),sp=9*B.skill,far=T.z+T.d/2-.6,near=T.z-T.d/2+.7,zf=b.z+Math.max(b.vz,sp*.8)*ta,cz=zf<=far&&zf>=near?b.z+sp*ta:Math.min(far,Math.max(near,zf));return[Math.max(-1,Math.min(1,(cx-b.x)/ta/sp)),Math.max(-1,Math.min(1,(cz-b.z)/ta/sp)),false]}}
if(b.infan>0&&B.lock){const T=B.lock;return[Math.max(-1,Math.min(1,(T.x-b.x)*.5)),b.y>T.y+T.h/2+.3?1:.05,false]}
const l=Math.hypot(dx,dz);if(l<.15)return[0,0,jump];dx/=l;dz/=l;if(wait&&l<1){dx*=l;dz*=l}
if(g&&Math.random()<.0015)jump=true;return[dx,dz,jump]}

const OWNER_HASH=process.env.OWNER_HASH||'ff36c6ad5096f25ea298db6361fe655e90681e9a5b848f12d65898c7062df032',sha=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
let DB={users:{}};let canSave=!UR,dirty=false,saving=false,lastUp=0;
const save=()=>{dirty=true};
async function ucmd(a){const r=await fetch(UR,{method:'POST',headers:{authorization:'Bearer '+UT,'content-type':'application/json'},body:JSON.stringify(a)}),j=await r.json();if(j.error)throw new Error(j.error);return j.result}
async function flush(force){if(!dirty&&!force)return;dirty=false;const s=JSON.stringify(DB);try{fs.writeFileSync(FILE+'.tmp',s);fs.renameSync(FILE+'.tmp',FILE)}catch(e){}
if(UR&&canSave&&!saving&&(force||Date.now()-lastUp>5000)){saving=true;try{await ucmd(['SET',DBKEY,s]);lastUp=Date.now()}catch(e){console.error('cloud save failed',e.message);dirty=true}saving=false}else if(UR&&!force)dirty=true}
setInterval(()=>flush(),3000);
for(const sg of['SIGTERM','SIGINT'])process.on(sg,async()=>{await flush(true);process.exit(0)});
const byTok=new Map(),cl=new Map();
async function loadAll(){let v=null;if(UR){let ok=false;for(let i=0;i<6&&!ok;i++){try{const r=await ucmd(['GET',DBKEY]);v=r?JSON.parse(r):null;ok=true}catch(e){console.error('cloud load failed',e.message);await new Promise(r=>setTimeout(r,2000))}}if(!ok){console.error('Cannot reach cloud storage; exiting so saved data is never overwritten');process.exit(1)}canSave=true}
if(!v){try{v=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){}}if(v)Object.assign(DB,v);DB.users=DB.users||{};Object.values(DB.users).forEach(u=>byTok.set(u.tok,u));console.log('loaded',Object.keys(DB.users).length,'players'+(UR?' (cloud storage on)':''))}
const rid=n=>crypto.randomBytes(n).toString('hex'),nk=s=>String(s).toLowerCase().replace(/\s+/g,'');
function freeName(){for(let i=0;i<60;i++){const n='Traveller'+(100+crypto.randomInt(9900));if(!Object.values(DB.users).some(o=>nk(o.name)===nk(n)))return n}return'Traveller'+rid(3)}
function mkUser(tk){const id=rid(6),u={id,tok:tk||rid(16),name:freeName(),color:PC[crypto.randomInt(PC.length)],coins:0,xp:0,inv:[],eq:{},rounds:0,tv:{fin:0,win:0,best:{}},ts:Date.now()};DB.users[id]=u;byTok.set(u.tok,u);save();return u}
const send=(r,ev,d)=>r.write(`event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`),to=(u,ev,d)=>{const s=cl.get(u.id);if(s)for(const r of s)send(r,ev,d)};
const me=u=>{const L=lvlInfo(u.xp||0),t=tierOf(u.xp||0);return{id:u.id,name:u.name,color:u.color,coins:u.coins||0,tv:u.tv||{fin:0,win:0,best:{}},adm:!!u.adm,xp:u.xp||0,lvl:L.lvl,into:L.into,need:L.need,tier:t,tp:t>=TIERS?XPT:(u.xp||0)-t*XPT,inv:u.inv||[],eq:u.eq||{},rounds:u.rounds||0,day:dayKey(),bought:(u.bought&&u.bought.d===dayKey())?u.bought.l:[],saved:!!u.saved,own:!!u.own,isAdm:!!(u.own||u.adm),spush:!!u.spush,tool:u.tool||''}},push=u=>to(u,'me',me(u)),nmu=id=>(DB.users[id]||{}).name||'Player';
const BADW=['fuck','fuk','fck','shit','bitch','cunt','asshole','arsehole','dick','dickhead','pussy','bastard','slut','whore','nigger','nigga','faggot','fag','retard','twat','wanker','motherfucker','cock','prick','bollocks'].map(w=>w.replace(/(.)\1+/g,'$1')),BADRE=new RegExp('\\b(?:'+BADW.join('|')+')(?:s|ed|er|ers|ing|in|y|head|z)?\\b');
const strong=t=>{const x=String(t).toLowerCase().replace(/[@4]/g,'a').replace(/[$5]/g,'s').replace(/0/g,'o').replace(/[1!|]/g,'i').replace(/3/g,'e').replace(/7/g,'t').replace(/[^a-z]/g,'');return['fuck','bitch','cunt','nigger','nigga','faggot','whore','pussy','asshole','motherfucker','shit','dickhead'].some(w=>x.includes(w))};
const bad=t=>BADRE.test(String(t).toLowerCase().replace(/[@4]/g,'a').replace(/[$5]/g,'s').replace(/0/g,'o').replace(/[1!|]/g,'i').replace(/3/g,'e').replace(/7/g,'t').replace(/[^a-z\s]/g,'').replace(/(.)\1+/g,'$1'));

function muteUser(u,ms){u.mute=Date.now()+ms;save()}
function award(u,gain){const o=lvlInfo(u.xp||0),ot=tierOf(u.xp||0);u.xp=(u.xp||0)+gain;const nL=lvlInfo(u.xp),nt=tierOf(u.xp),rw=[];u.inv=u.inv||[];
for(let t=ot+1;t<=nt;t++){const b=BP[t-1];if(!u.inv.includes(b.i))u.inv.push(b.i);rw.push({t:'tier',n:t,i:b.i});if(b.c){u.coins=(u.coins||0)+b.c;rw.push({t:'coins',n:b.c})}}
for(let L=o.lvl+1;L<=nL.lvl;L++){const c=Math.min(1000,50*L);u.coins=(u.coins||0)+c;rw.push({t:'lvl',n:L,c});if(L%5==0){const pool=CAT.filter(i=>i.r>=1&&!u.inv.includes(i.id)&&!BPSET.has(i.id));if(pool.length){const it=pool[crypto.randomInt(pool.length)];u.inv.push(it.id);rw.push({t:'item',i:it.id})}}}
save();return rw}

const G={};
G.me=u=>({me:me(u)});
G.profile=(u,b)=>{if(b.name!==undefined){const n=String(b.name||'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,16);if(n.length<3)throw'Name must be at least 3 characters';if(bad(n)||strong(n))throw'Please pick a clean name';if(Object.values(DB.users).some(o=>o.id!==u.id&&nk(o.name)===nk(n)))throw'That name is taken';u.name=n}
if(b.color!==undefined){if(!PC.includes(b.color))throw'Pick one of the colours';u.color=b.color}save();return{me:me(u)}};
G['locker/equip']=(u,b)=>{const sl=String(b.slot||'');if(!SLOTS.includes(sl))throw'Pick a slot';u.eq=u.eq||{};if(!b.id){delete u.eq[sl]}else{const it=CATI[b.id];if(!it||it.s!==sl)throw'Unknown item';if(!(u.inv||[]).includes(it.id))throw'You do not own that yet';u.eq[sl]=it.id}save();push(u);for(const R of ROOMS.values())if(R.P.has(u.id))rState(R);return{me:me(u)}};
G['shop/buy']=(u,b)=>{const d=dayKey(),it=CATI[b.id];if(!it||!shopFor(d).includes(it.id))throw'That item is not in the shop today';u.inv=u.inv||[];if(u.inv.includes(it.id))throw'You already own that';const pr=PRICE[it.r];if((u.coins||0)<pr)throw'Not enough coins';u.coins-=pr;u.inv.push(it.id);if(!u.bought||u.bought.d!==d)u.bought={d,l:[]};u.bought.l.push(it.id);save();push(u);return{me:me(u)}};
G.maps=u=>({maps:MAPS});
G.saved=u=>{u.saved=true;save();return{me:me(u)}};
// ---- lobby chat + leaderboard + online list
const GC=[];
G.gchat=(u,b)=>{const x=String(b.text||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,160),n=Date.now();if(!x)throw'Empty';if(u.mute>n)throw'You are timed out for '+Math.ceil((u.mute-n)/60000)+' more min';if(n-(u.gct||0)<900)throw'Slow down';if(bad(x)){muteUser(u,600000);throw'Watch your language! You are timed out for 10 minutes.'}u.gct=n;const m={u:u.id,n:u.name,c:u.color,l:lvlInfo(u.xp||0).lvl,x,ts:n};GC.push(m);if(GC.length>60)GC.shift();for(const id of cl.keys()){const x2=DB.users[id];if(x2)to(x2,'gc',m)}return{ok:1}};
G.lb=u=>{const all=Object.values(DB.users).filter(x=>(x.tv&&x.tv.win)||x.xp).map(x=>({id:x.id,n:x.name,c:x.color,w:(x.tv||{}).win||0,l:lvlInfo(x.xp||0).lvl,e:x.eq||{}})).sort((a,b)=>b.w-a.w||b.l-a.l);const i=all.findIndex(x=>x.id===u.id);return{top:all.slice(0,50),rank:i+1,total:all.length}};
const pubU=x=>({id:x.id,n:x.name,c:x.color,l:lvlInfo(x.xp||0).lvl,e:x.eq||{}});
G.online=u=>({list:[...cl.keys()].filter(id=>id!==u.id&&DB.users[id]).map(id=>Object.assign(pubU(DB.users[id]),{p:!!partyOf(id)}))});

// ---- PARTIES (up to 20)
const PARTIES=new Map();const partyOf=id=>{for(const p of PARTIES.values())if(p.mem.includes(id))return p;return null};
const pView=p=>({id:p.id,leader:p.leader,mem:p.mem.filter(i=>DB.users[i]).map(i=>Object.assign(pubU(DB.users[i]),{on:cl.has(i)})),inv:[...p.inv]});
const pSend=p=>{for(const id of p.mem){const x=DB.users[id];if(x)to(x,'party',pView(p))}};
function pLeave(u){const p=partyOf(u.id);if(!p)return;p.mem=p.mem.filter(i=>i!==u.id);to(u,'party',null);if(!p.mem.length){PARTIES.delete(p.id);return}if(p.leader===u.id)p.leader=p.mem[0];pSend(p)}
G['party/get']=u=>({party:(p=>p?pView(p):null)(partyOf(u.id))});
G['party/create']=u=>{let p=partyOf(u.id);if(!p){p={id:'p'+rid(4),leader:u.id,mem:[u.id],inv:new Set()};PARTIES.set(p.id,p)}pSend(p);return{party:pView(p)}};
G['party/invite']=(u,b)=>{let p=partyOf(u.id);if(!p)p=G['party/create'](u)&&partyOf(u.id);const t=DB.users[b.to];if(!t||t.id===u.id)throw'Pick a player';if(!cl.has(t.id))throw'They are not online';if(p.mem.includes(t.id))throw'Already in your party';if(p.mem.length+p.inv.size>=20)throw'Parties can have up to 20 players';p.inv.add(t.id);to(t,'pinv',{pid:p.id,from:u.name,c:u.color,n:p.mem.length});pSend(p);return{party:pView(p)}};
G['party/accept']=(u,b)=>{const p=PARTIES.get(b.pid);if(!p||!p.inv.has(u.id))throw'That invite expired';if(p.mem.length>=20)throw'That party is full';pLeave(u);p.inv.delete(u.id);p.mem.push(u.id);pSend(p);return{party:pView(p)}};
G['party/decline']=(u,b)=>{const p=PARTIES.get(b.pid);if(p){p.inv.delete(u.id);pSend(p)}return{ok:1}};
G['party/leave']=u=>{pLeave(u);return{party:null}};
G['party/kick']=(u,b)=>{const p=partyOf(u.id);if(!p||p.leader!==u.id)throw'Only the party leader can do that';const t=DB.users[b.to];if(!t||!p.mem.includes(t.id)||t.id===u.id)throw'Pick a member';pLeave(t);to(t,'note',{x:'You were removed from the party'});return{party:pView(p)}};
G['party/start']=(u,b)=>{const p=partyOf(u.id);if(!p||p.leader!==u.id)throw'Only the party leader can start';const mode=['private','normal','hardcore'].includes(b.mode)?b.mode:'private';let R;
 if(mode=='private'){for(const r of ROOMS.values())if(r.party===p.id){R=r;break}if(!R)R=mkRoom('party',{party:p.id,botsOn:!!b.bots});R.botsOn=!!b.bots}
 else{const need=p.mem.filter(i=>cl.has(i)).length;for(const r of ROOMS.values())if(r.kind===mode&&!r.party&&r.P.size+need<=r.cap){R=r;break}if(!R)R=mkRoom(mode)}
 for(const id of p.mem){const x=DB.users[id];if(x&&cl.has(id))to(x,'pgo',{room:R.id,mode})}return{room:R.id}};

// ---- ROOMS: lobby island -> countdown -> race -> results.  Bots run on the server so everyone sees the same ones.
const TVREW=[0,20,35,55,80,120],TVPM=[3,2,1.5],ROOMS=new Map();let RIDN=0;
function mkRoom(kind,o){const R=Object.assign({id:'r'+(++RIDN),kind,st:'idle',map:0,t0:0,t1:0,rn:0,last:-1,P:new Map(),bots:[],fin:[],chat:[],res:null,racers:0,W:null,cap:kind=='party'?20:40,botsOn:kind!='party',lt:Date.now()},o||{});ROOMS.set(R.id,R);return R}
const r1=x=>Math.round(x*100)/100;
function botTarget(R){if(!R.botsOn)return 0;const real=R.P.size;if(R.kind=='hardcore')return Math.max(0,100-real);return Math.max(0,(R.bt||(R.bt=16+crypto.randomInt(5)))-real)}
function botSync(R){const want=botTarget(R);while(R.bots.length>want)R.bots.splice(crypto.randomInt(R.bots.length),1);while(R.bots.length<want){const lv=1+Math.floor(Math.pow(Math.random(),2.2)*45);R.bots.push({id:rid(6),n:botName(),c:PC[crypto.randomInt(PC.length)],e:botLook(),l:lv,b:null})}}
function tvPub(R){const pl=[...R.P.values()].map(p=>{const u=DB.users[p.id]||{};return{id:p.id,m:p.mode,n:u.name||'Player',c:u.color||'#38bdf8',e:u.eq||{},l:lvlInfo(u.xp||0).lvl,f:p.fx&&(p.fx.rb>Date.now()||p.fx.sz!=1)?{rb:p.fx.rb>Date.now()?1:0,sz:p.fx.sz||1}:0,a:u.own?1:0}});for(const b of R.bots)pl.push({id:b.id,m:'play',n:b.n,c:b.c,e:b.e,l:b.l});
return{room:R.id,kind:R.kind,st:R.st,map:R.st==='idle'||R.st==='lobby'?null:MAPS[R.map],t0:R.t0,t1:R.t1,rn:R.rn,res:R.res,now:Date.now(),pl,rev:R.W?[...R.W.rev]:[]}}
const rTo=(R,ev,d)=>{for(const p of R.P.values()){const u=DB.users[p.id];if(u)to(u,ev,d)}};
const rState=R=>rTo(R,'tvs',tvPub(R));
function rPhase(R,st,ms){R.st=st;R.t0=Date.now();R.t1=ms?R.t0+ms:0;if(st==='lobby'){R.W=tvWorld(null,false);botSync(R);R.bots.forEach((b,i)=>{const s=R.W.spawn(i);b.b=botMake(i,R.W);Object.assign(b.b,{x:s[0],y:s[1],z:s[2]});b.b.bot.wander=1})}rState(R)}
function rStart(R){const pool=MAPS.filter(m=>R.kind!='hardcore'||m.d>=3);let m;if(R.forceMap!=null){m=R.forceMap;R.forceMap=null}else do m=pool[crypto.randomInt(pool.length)].id;while(m===R.last&&pool.length>1);R.map=m;R.last=m;R.rn++;R.fin=[];R.res=null;R.W=tvWorld(MAPS[m],false);botSync(R);let n=0;
for(const p of R.P.values()){p.mode='play';p.fin=null;p.ok=true;p.sv=0;p.lx=null;p.raced=true;p.cpz=0;n++}R.racers=n;
R.bots.forEach((b,i)=>{b.b=botMake(n+i,R.W,{skill:(R.kind=='hardcore'?.84:.78)+Math.random()*.17});const s=R.W.spawn(n+i);Object.assign(b.b,{x:s[0],y:s[1],z:s[2]});b.fin=null});rPhase(R,'count',4500)}
function rEnd(R){const M=MAPS[R.map];const multi=R.racers+R.bots.length>1;R.res={map:M.name,n:R.racers+R.bots.length,list:R.fin.map((f,i)=>({id:f.id,ms:f.ms,rw:f.rw,pl:i+1}))};
for(const p of R.P.values()){if(!p.raced)continue;p.raced=false;const u=DB.users[p.id];if(!u)continue;const parts=[['Played a round',25]];const i=R.fin.findIndex(f=>f.id===p.id);if(i>=0&&p.ok){parts.push(['Qualified',75]);if(multi&&i<3)parts.push([['1st','2nd','3rd'][i]+' place',[60,40,25][i]])}const gain=parts.reduce((a,x)=>a+x[1],0);u.rounds=(u.rounds||0)+1;const pc=5;u.coins=(u.coins||0)+pc;const got=(R.fin.find(f=>f.id===p.id)||{}).rw||0;const rw=award(u,gain);to(u,'tvxp',{gain,parts,rw,coins:pc+got,me:me(u)});push(u)}
rPhase(R,'end',7000);rSys(R,R.fin.length?'🏁 Round over! '+R.fin.length+' qualified.':'🏁 Round over! Nobody made it this time.')}
function rSys(R,x){const m={u:'',x,ts:Date.now(),sys:1};R.chat.push(m);if(R.chat.length>40)R.chat.shift();rTo(R,'tvc',m)}
const SEND=new Map();
function rTick(R,n,dt){for(const p of [...R.P.values()])if(n-p.seen>8000){R.P.delete(p.id);rSys(R,(DB.users[p.id]||{}).name+' left')}
if(!R.P.size){if(n-R.lt<30000)return;if(R.kind==='party'||[...ROOMS.values()].some(o=>o!==R&&o.kind===R.kind&&!o.party)){ROOMS.delete(R.id);return}R.st='idle';R.bots=[];return}
const realAct=[...R.P.values()].filter(p=>p.mode==='play'&&!p.fin).length;
if(R.st==='idle')rStart(R);else if(R.st==='lobby'&&n>=R.t1)rStart(R);else if(R.st==='count'&&n>=R.t1)rPhase(R,'race',roundMs(MAPS[R.map]));
else if(R.st==='race'&&(n>=R.t1||!realAct)){if(!R.endAt)R.endAt=n+(n>=R.t1?0:2500);if(n>=R.endAt){R.endAt=0;rEnd(R)}}
else if(R.st==='end'&&n>=R.t1){for(const p of R.P.values()){p.mode='play';p.fin=null}rPhase(R,'lobby',R.kind=='party'?10000:12000)}
// bots
const W=R.W,t=(n/1000)%20000;if(W&&R.bots.length){tvSolidsUpd(W,t);const frozen=R.st==='count'||R.st==='end';
 for(const bo of R.bots){const b=bo.b;if(!b)continue;b.ev.length=0;let inp;
  if(W.lobby){const B=b.bot;if(!B.tg||Math.random()<.01){const a=Math.random()*Math.PI*2,r=Math.random()*12;B.tg=[Math.cos(a)*r,Math.sin(a)*r]}const dx=B.tg[0]-b.x,dz=B.tg[1]-b.z,l=Math.hypot(dx,dz);inp=l<.6?[0,0,Math.random()<.01]:[dx/l*.7,dz/l*.7,Math.random()<.008]}
  else{let near=false;for(const p of R.P.values())if(p.z!=null&&Math.abs(p.z-b.z)<45){near=true;break}bo.lod=near?0:1;bo.tk=(bo.tk||0)+1;inp=frozen?[0,0,false]:(near||bo.tk%2||!bo.inp)?(bo.inp=botAI(b,W,t,dt)):bo.inp}
  const ns=bo.lod?1:2;let fell='';for(let k=0;k<ns;k++)fell=physStep(b,W,dt/ns,t,inp[0],inp[1],inp[2]&&k==0,frozen,9*b.bot.skill)||fell;
  if(fell){const sp=W.lobby?W.spawn():W.cpSpawn(b.cpz||0,Math.floor(Math.random()*5)),B=b.bot,cz=b.cpz;Object.assign(b,mkBody(sp[0],sp[1]+.5,sp[2]));b.bot=B;b.cpz=cz}
  if(R.st==='race'&&!bo.fin&&!W.lobby&&b.z>W.finZ+.5&&b.y>-.5){bo.fin=n-R.t0;b.bot.fin=true;b.bot.fz=W.finZ+2+Math.random()*6;R.fin.push({id:bo.id,ms:bo.fin,rw:0});rState(R)}
  bo.pa=Math.max(0,(bo.pa||0)-dt);
  if(!frozen&&Math.random()<.03)for(const p of R.P.values()){if(p.mode!=='play'||p.x==null)continue;if(Math.abs(p.x-b.x)<1.3&&Math.abs(p.z-b.z)<1.3&&Math.abs(p.y-b.y)<1&&n-(p.kt||0)>2500&&Math.random()<.35){const dx=p.x-b.x,dz=p.z-b.z,l=Math.hypot(dx,dz)||1;p.kt=n;bo.pa=.35;const u=DB.users[p.id];if(u)to(u,'tvk',{from:bo.id,dx:dx/l,dz:dz/l})}}}}
// positions 10Hz
if(n-(R.lp||0)>=100){R.lp=n;const pl=[];for(const p of R.P.values())if(p.x!=null&&p.mode!=='spec')pl.push([p.id,r1(p.x),r1(p.y),r1(p.z),Math.round((p.ry||0)*100)/100,p.s|0,p.fin?1:0]);
 for(const bo of R.bots){const b=bo.b;if(!b)continue;pl.push([bo.id,r1(b.x),r1(b.y),r1(b.z),Math.round(b.ry*100)/100,(bo.pa>0?1:0)|(b.walk>.1?2:0)|(b.gr?0:8),bo.fin?1:0])}
 const pay={t:n,p:pl};if(W&&W.rev.size!==R.revN){R.revN=W.rev.size;pay.rv=[...W.rev]}rTo(R,'tvp',pay)}}
let LTK=Date.now();setInterval(()=>{const n=Date.now(),dt=Math.min(.1,(n-LTK)/1000);LTK=n;for(const R of [...ROOMS.values()])rTick(R,n,dt);
 for(const p of [...PARTIES.values()])for(const id of p.mem)if(!cl.has(id)){const u=DB.users[id];if(u&&n-(u.offAt||(u.offAt=n))>90000){u.offAt=0;pLeave(u)}}else{const u=DB.users[id];if(u)u.offAt=0}},50);
function tvMe(u){for(const R of ROOMS.values()){const p=R.P.get(u.id);if(p){p.seen=Date.now();return[R,p]}}throw'Join Traverser first'}
Object.assign(G,{
'tv/join'(u,b){for(const R of ROOMS.values())if(R.P.has(u.id)){R.P.delete(u.id)}let R=null;const mode=['normal','hardcore'].includes(b.mode)?b.mode:'normal';
 if(b.room){R=ROOMS.get(b.room);if(!R)throw'That match has ended';if(R.party){const p=partyOf(u.id);if(!p||p.id!==R.party)throw'That is a private party match'}}
 if(!R){for(const r of ROOMS.values())if(r.kind===mode&&!r.party&&r.P.size<r.cap){R=r;break}if(!R)R=mkRoom(mode)}
 if(R.P.size>=R.cap)throw'That match is full';const n=Date.now(),hist=R.chat.slice(-30);const act=[...R.P.values()].filter(q=>q.mode==='play'&&!q.fin).length+(R.st==='race'?R.bots.filter(x=>!x.fin).length:0);
 const p={id:u.id,mode:'play',x:null,seen:n,fin:null,ok:true,pt:0,kt:0,cpz:0};if((R.st==='race'||R.st==='end')&&act>0)p.mode='spec';if(R.st==='count'){p.raced=true;R.racers++}
 R.P.set(u.id,p);R.lt=n;if(R.st==='race'&&act===0)rStart(R);else rSys(R,u.name+' joined');rState(R);u.tv=u.tv||{fin:0,win:0,best:{}};return{s:tvPub(R),chat:hist,me:p.mode,stats:u.tv,maps:MAPS}},
'tv/leave'(u){for(const R of ROOMS.values())if(R.P.delete(u.id)){rSys(R,u.name+' left');rState(R)}return{ok:1}},
'tv/pos'(u,b){const[R,p]=tvMe(u);if(p.mode==='spec')return{ok:1};const x=+b.x,y=+b.y,z=+b.z,n=Date.now();if(![x,y,z].every(Number.isFinite))throw'Bad position';
 if(R.st==='race'&&p.lx!=null&&!p.fin){const dt=Math.min(3,Math.max(.1,(n-p.lt)/1000)),dist=Math.hypot(x-p.lx,z-p.lz),allow=8+(n-p.kt<3000?70:30)*dt,cp=R.W?R.W.cps.some(c=>Math.abs(z-c.z-1.5)<8):false,resp=(b.s&4)&&cp&&Math.abs(x)<9;if(dist>allow&&!resp&&n>(p.free||0)){p.sv=(p.sv||0)+(dist>allow*3?2:1);if(p.sv>=4)p.ok=false}}
 p.x=Math.max(-500,Math.min(500,x));p.y=Math.max(-50,Math.min(200,y));p.z=Math.max(-500,Math.min(900,z));p.ry=+b.ry||0;p.s=b.s|0;p.lx=x;p.lz=z;p.lt=n;
 if(Array.isArray(b.rev)&&R.W)for(const id of b.rev.slice(0,8)){const s=R.W.sol[id|0];if(s&&s.fake)R.W.rev.add(s.id)}return{ok:1}},
'tv/push'(u,b){const[R,p]=tvMe(u),n=Date.now();if(p.mode==='spec'||p.x==null)throw'Nobody to push';if(R.st==='count')throw'Wait for GO';if(n-p.pt<800)throw'Too fast';
 const bo=R.bots.find(x=>x.id===b.to);if(bo&&bo.b){const dx=bo.b.x-p.x,dz=bo.b.z-p.z,d=Math.hypot(dx,dz);if(d>3.2||Math.abs(bo.b.y-p.y)>2.5)throw'Too far away';p.pt=n;const pw=u.spush&&(u.own||u.adm)?3.5:1;knock(bo.b,dx/(d||1)*28*pw,dz/(d||1)*28*pw,10*pw,1,8);return{ok:1}}
 const t=R.P.get(b.to);if(!t||t.id===u.id||t.mode==='spec'||t.x==null)throw'Nobody to push';const dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz);if(d>3.2||Math.abs(t.y-p.y)>2.5)throw'Too far away';p.pt=n;t.kt=n;const nx=d>.01?dx/d:Math.sin(p.ry||0),nz=d>.01?dz/d:Math.cos(p.ry||0);const tu=DB.users[t.id];const pw=u.spush&&(u.own||u.adm)?3.5:1;if(pw>1)t.free=n+12000;if(tu)to(tu,'tvk',{from:u.id,dx:nx,dz:nz,pw});return{ok:1}},
'tv/fin'(u){const[R,p]=tvMe(u),M=MAPS[R.map],n=Date.now();if(R.st!=='race'||p.mode!=='play')throw'Not racing';if(p.fin)return{place:R.fin.findIndex(f=>f.id===u.id)+1};if(p.z==null||p.z<M.fin-3)throw'Reach the finish first';const ms=n-R.t0;if(ms<M.minT*1000)p.ok=false;
 const place=R.fin.length+1;let rw=0;if(p.ok){rw=Math.round(TVREW[M.d]*(TVPM[place-1]||1)*(R.kind=='hardcore'?1.5:1));u.coins=(u.coins||0)+rw;u.tv=u.tv||{fin:0,win:0,best:{}};u.tv.fin++;u.tv.win++;if(place===1)u.tv.first=(u.tv.first||0)+1;const b0=u.tv.best[M.id];if(!b0||ms<b0)u.tv.best[M.id]=ms;save();push(u)}
 p.fin=ms;R.fin.push({id:u.id,ms,rw});rSys(R,'👑 '+u.name+' qualified #'+place+' in '+(ms/1000).toFixed(1)+'s');rState(R);return{place,ms,rw,ok:p.ok,of:R.racers+R.bots.length,stats:u.tv,coins:u.coins}},
'tv/hit'(u,b){if(!(u.own||u.adm))throw'Admins only';const[R,p]=tvMe(u),n=Date.now();if(p.x==null)throw'Move first';if(n-(p.ht||0)<500)throw'Too fast';p.ht=n;const kind=b.kind==='blaster'?'blaster':'bat',ry=+b.ry||0,fx=Math.sin(ry),fz=Math.cos(ry);let hits=0;
 const tgts=[];for(const t of R.P.values())if(t.id!==u.id&&t.x!=null&&t.mode!=='spec')tgts.push({id:t.id,x:t.x,y:t.y,z:t.z,real:t});for(const bo of R.bots)if(bo.b)tgts.push({id:bo.id,x:bo.b.x,y:bo.b.y,z:bo.b.z,bot:bo});
 const pick=[];if(kind==='bat'){for(const g of tgts){const dx=g.x-p.x,dz=g.z-p.z,d=Math.hypot(dx,dz);if(d<7.5&&Math.abs(g.y-p.y)<4)pick.push(g)}}else{let best=null,bd=45;for(const g of tgts){const dx=g.x-p.x,dz=g.z-p.z,d=Math.hypot(dx,dz);if(d<bd&&d>.3&&(dx*fx+dz*fz)/d>.86&&Math.abs(g.y-p.y)<8){bd=d;best=g}}if(best)pick.push(best)}
 for(const g of pick){hits++;if(g.real){g.real.free=n+15000;g.real.kt=n;const tu=DB.users[g.id];if(tu)to(tu,kind==='bat'?'moon':'zap',{from:u.name})}else if(g.bot){const b2=g.bot.b,dx=b2.x-p.x,dz=b2.z-p.z,d=Math.hypot(dx,dz)||1;if(kind==='bat')knock(b2,dx/d*30,dz/d*30,70,3,10);else{b2.y=-10}}}
 rTo(R,'tvfx',{k:kind,id:u.id,x:p.x,y:p.y,z:p.z,ry,to:pick.map(g=>g.id)});return{hits}},
'tv/chat'(u,b){const[R]=tvMe(u);const x=String(b.text||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,160),n=Date.now();if(!x)throw'Empty';if(u.mute>n)throw'You are timed out for '+Math.ceil((u.mute-n)/60000)+' more min';if(n-(u.tvct||0)<700)throw'Slow down';if(bad(x)){muteUser(u,600000);throw'Watch your language! You are timed out for 10 minutes.'}u.tvct=n;const m={u:u.id,x,ts:n};R.chat.push(m);if(R.chat.length>40)R.chat.shift();rTo(R,'tvc',m);return{ok:1}}
});
G.info=u=>{let real=0,bots=0;for(const R of ROOMS.values()){real+=R.P.size;bots+=R.bots.length}return{online:cl.size,playing:real,me:me(u),pc:PC,gc:GC.slice(-40),maps:MAPS.length}};
G.admin=(u,b)=>{const k=String(b.key||''),keyOk=!!KEY&&k.length===KEY.length&&crypto.timingSafeEqual(Buffer.from(k),Buffer.from(KEY));if(!keyOk&&!(u.own||u.adm))throw'Wrong admin key';const t=b.to==='me'?u:b.to?(DB.users[b.to]||Object.values(DB.users).find(o=>nk(o.name)===nk(b.to))):null;let R=null;for(const r of ROOMS.values())if(r.P.has(u.id))R=r;
switch(b.op){case'login':u.adm=true;save();push(u);return{nm:'Admin mode on'}
case'ann':{const x=String(b.text||'').slice(0,160);if(!x)throw'Type a message';for(const r of ROOMS.values())rSys(r,'📢 '+x);const m={u:'',n:'📢',c:'#facc15',x,ts:Date.now(),sys:1};GC.push(m);for(const id of cl.keys()){const x2=DB.users[id];if(x2)to(x2,'gc',m)}return{nm:'Announced'}}
case'kick':{if(!t)throw'No player with that name';for(const r of ROOMS.values())if(r.P.delete(t.id)){rSys(r,t.name+' was kicked');rState(r)}to(t,'tvkick',{});return{nm:t.name+' kicked'}}
case'mute':{if(!t)throw'No player with that name';const m=Math.max(1,Math.min(10080,+b.min||10));muteUser(t,m*60000);return{nm:t.name+' muted for '+m+' min'}}
case'unmute':{if(!t)throw'No player with that name';t.mute=0;save();return{nm:t.name+' unmuted'}}
case'give':{if(!t)throw'No player with that name';const n=Math.round(+b.n||0);if(!Number.isFinite(n)||Math.abs(n)>1e9)throw'Bad amount';t.coins=Math.max(0,(t.coins||0)+n);save();push(t);return{nm:t.name+' now has '+t.coins+' coins'}}
case'xp':{if(!t)throw'No player with that name';const n=Math.round(+b.n||0);if(!(n>0&&n<1e7))throw'Bad amount';const rw=award(t,n);push(t);if(rw.length)to(t,'tvxp',{gain:n,parts:[['Admin gift',n]],rw,me:me(t)});return{nm:t.name+' +'+n+' XP'}}
case'players':{const rows=[];for(const x of Object.values(DB.users)){const on=cl.has(x.id);let room=null;for(const r of ROOMS.values())if(r.P.has(x.id))room=r.kind;if(!on&&!room&&!(x.ban&&x.ban.until>Date.now()))continue;rows.push({id:x.id,n:x.name,c:x.color,l:lvlInfo(x.xp||0).lvl,on,room,ban:x.ban&&x.ban.until>Date.now()?x.ban.until:0,coins:x.coins||0,w:(x.tv||{}).win||0})}return{list:rows}}
case'ban':{if(!t||t.own)throw'Pick a player';const m=+b.min||0;t.ban={until:m>0?Date.now()+m*60000:8.64e15,by:u.name};for(const r of ROOMS.values())if(r.P.delete(t.id)){rSys(r,t.name+' was banned');rState(r)}to(t,'banned',{until:t.ban.until});save();return{nm:t.name+' banned'+(m>0?' for '+m+' min':' forever')}}
case'unban':{if(!t)throw'Pick a player';delete t.ban;save();return{nm:t.name+' unbanned'}}
case'troll':{const kinds=['fling','moon','zap','freeze','spin','bouncy','rainbow','size','unfx','tiny','giant'];const kd=String(b.kind||'');if(!kinds.includes(kd))throw'Unknown troll';const list=b.to==='all'?[...cl.keys()].map(id=>DB.users[id]).filter(x=>x&&x.id!==u.id):[t];if(!list[0])throw'Pick a player';const secs=Math.max(1,Math.min(600,+b.secs||15)),n=Date.now();
 for(const x of list){let rm=null,pp=null;for(const r of ROOMS.values()){const q=r.P.get(x.id);if(q){rm=r;pp=q}}if(pp){pp.fx=pp.fx||{sz:1};pp.free=n+15000;pp.kt=n;if(kd==='rainbow')pp.fx.rb=n+secs*1000;if(kd==='size'||kd==='tiny'||kd==='giant')pp.fx.sz=kd==='tiny'?.45:kd==='giant'?2.6:Math.max(.25,Math.min(5,+b.val||1));if(kd==='unfx')pp.fx={sz:1};if(rm)rState(rm)}
  if(['fling','moon','zap','freeze','spin','bouncy','unfx'].includes(kd))to(x,kd==='moon'?'moon':kd==='zap'?'zap':'troll',{kind:kd,secs,from:u.name})}
 return{nm:kd+' → '+(b.to==='all'?'everyone':list[0].name)}}
case'setcoins':{if(!t)throw'Pick a player';const n=Math.round(+b.n);if(!Number.isFinite(n)||n<0||n>1e12)throw'Bad amount';t.coins=n;save();push(t);return{nm:t.name+' now has '+n.toLocaleString()+' coins'}}
case'setlvl':{if(!t)throw'Pick a player';const L=Math.max(1,Math.min(400,Math.round(+b.lvl||1)));let need=0;for(let i=1;i<L;i++)need+=lvlNeed(i);const cur=t.xp||0;let rw=[];if(need>cur)rw=award(t,need-cur);else t.xp=need;save();push(t);if(rw.length)to(t,'tvxp',{gain:need-cur,parts:[['Level set by admin',need-cur]],rw:rw.slice(0,20),me:me(t)});return{nm:t.name+' is now level '+L}}
case'giveall':{if(!t)throw'Pick a player';t.inv=CAT.map(i=>i.id);save();push(t);return{nm:t.name+' now owns all '+CAT.length+' items'}}
case'spush':{u.spush=!!b.on;save();push(u);return{nm:'Super push '+(u.spush?'ON':'OFF')}}
case'tool':{u.tool=['bat','blaster'].includes(b.kind)?b.kind:'';save();push(u);return{nm:u.tool?'Equipped the '+u.tool:'Tool put away'}}
case'skip':{if(!R)throw'Join a match first';if(R.st==='race')rEnd(R);else if(R.st==='lobby'||R.st==='end')R.t1=Date.now();return{nm:'Skipped'}}
case'map':{if(!R)throw'Join a match first';const m=MAPS.find(m=>nk(m.name)===nk(b.name||''));if(!m)throw'No map called that';R.last=-1;const pick=m.id;R.st='lobby';R.t1=0;const orig=MAPS.filter;R.forceMap=pick;return{nm:'Next map: '+m.name}}
default:throw'Unknown command'}};
// ---- http
const INDEX=path.join(__dirname,'public','index.html');
const srvr=http.createServer((req,res)=>{const url=new URL(req.url,'http://x');
if(req.method=='GET'&&url.pathname=='/api/stream'){const u=byTok.get(url.searchParams.get('t'));if(!u){res.writeHead(401);return res.end()}
res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive','x-accel-buffering':'no'});let s=cl.get(u.id);if(!s)cl.set(u.id,s=new Set());s.add(res);send(res,'me',me(u));
const hb=setInterval(()=>res.write(': ping\n\n'),20000);req.on('close',()=>{clearInterval(hb);s.delete(res);if(!s.size)cl.delete(u.id)});const pp=partyOf(u.id);if(pp)to(u,'party',pView(pp));return}
if(req.method=='GET'&&url.pathname=='/healthz'){res.writeHead(200);return res.end('ok')}
if(req.method=='GET'){fs.readFile(INDEX,(e,d)=>{if(e){res.writeHead(500);return res.end('missing public/index.html')}res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});res.end(d)});return}
if(req.method=='POST'&&url.pathname.startsWith('/api/')){let raw='';req.on('data',c=>{raw+=c;if(raw.length>20000)req.destroy()});req.on('end',()=>{const reply=(code,o)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(o))};
try{const b=raw?JSON.parse(raw):{},name=url.pathname.slice(5);if(name=='restore'){const c=String(b.code||'').toLowerCase().replace(/[^0-9a-f]/g,'');const u=byTok.get(c);if(!u)return reply(404,{err:'Save code not found. Check it and try again.'});return reply(200,{tok:u.tok,name:u.name})}
if(name=='join'){let u=byTok.get(b.tok);if(!u&&typeof b.tok=='string'&&/^[0-9a-f]{32}$/.test(b.tok)&&sha(b.tok)===OWNER_HASH)u=mkUser(b.tok);if(!u)u=mkUser();if(sha(u.tok)===OWNER_HASH&&!u.own){u.own=true;save()}if(u.ban&&u.ban.until>Date.now())return reply(200,{tok:u.tok,banned:{until:u.ban.until,by:u.ban.by}});if(!u.inv||!u.inv.length){u.inv=['hat.party.0','face.glasses.1','pat.stripes.2','neck.bandana.4'];u.eq=u.eq||{}}u.seen=Date.now();save();return reply(200,{tok:u.tok,me:me(u),pc:PC,now:Date.now(),gc:GC.slice(-40)})}
const u=byTok.get(req.headers['x-token']);if(!u)return reply(401,{err:'Not signed in'});if(u.ban&&u.ban.until>Date.now())return reply(403,{err:'You are banned',banned:{until:u.ban.until}});if(!Object.prototype.hasOwnProperty.call(G,name))return reply(404,{err:'Unknown'});reply(200,G[name](u,b)||{})}catch(e){reply(400,{err:typeof e=='string'?e:'Bad request'});if(typeof e!='string')console.error(e)}});return}
res.writeHead(404);res.end()});
loadAll().then(()=>srvr.listen(PORT,'0.0.0.0',()=>console.log('Traverser running on port '+PORT+(KEY?'':' (ADMIN_KEY not set: admin commands disabled)'))));
