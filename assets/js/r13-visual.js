/* R13 presentation only. Shared rules remain in spectral-core.js. */
(() => {
'use strict';
const NS='http://www.w3.org/2000/svg', root='assets/art/r13/';
const SCENES=[{"l": "assets/art/r13/scene-01-l.webp", "p": "assets/art/r13/scene-01-p.webp", "thumb": "assets/art/r13/thumb-01.webp"}, {"l": "assets/art/r13/scene-02-l.webp", "p": "assets/art/r13/scene-02-p.webp", "thumb": "assets/art/r13/thumb-02.webp"}, {"l": "assets/art/r13/scene-03-l.webp", "p": "assets/art/r13/scene-03-p.webp", "thumb": "assets/art/r13/thumb-03.webp"}, {"l": "assets/art/r13/scene-04-l.webp", "p": "assets/art/r13/scene-04-p.webp", "thumb": "assets/art/r13/thumb-04.webp"}, {"l": "assets/art/r13/scene-05-l.webp", "p": "assets/art/r13/scene-05-p.webp", "thumb": "assets/art/r13/thumb-05.webp"}, {"l": "assets/art/r13/scene-06-l.webp", "p": "assets/art/r13/scene-06-p.webp", "thumb": "assets/art/r13/thumb-06.webp"}, {"l": "assets/art/r13/scene-07-l.webp", "p": "assets/art/r13/scene-07-p.webp", "thumb": "assets/art/r13/thumb-07.webp"}, {"l": "assets/art/r13/scene-08-l.webp", "p": "assets/art/r13/scene-08-p.webp", "thumb": "assets/art/r13/thumb-08.webp"}, {"l": "assets/art/r13/scene-09-l.webp", "p": "assets/art/r13/scene-09-p.webp", "thumb": "assets/art/r13/thumb-09.webp"}, {"l": "assets/art/r13/scene-10-l.webp", "p": "assets/art/r13/scene-10-p.webp", "thumb": "assets/art/r13/thumb-10.webp"}, {"l": "assets/art/r13/scene-11-l.webp", "p": "assets/art/r13/scene-11-p.webp", "thumb": "assets/art/r13/thumb-11.webp"}, {"l": "assets/art/r13/scene-12-l.webp", "p": "assets/art/r13/scene-12-p.webp", "thumb": "assets/art/r13/thumb-12.webp"}, {"l": "assets/art/r13/scene-13-l.webp", "p": "assets/art/r13/scene-13-p.webp", "thumb": "assets/art/r13/thumb-13.webp"}, {"l": "assets/art/r13/scene-14-l.webp", "p": "assets/art/r13/scene-14-p.webp", "thumb": "assets/art/r13/thumb-14.webp"}, {"l": "assets/art/r13/scene-15-l.webp", "p": "assets/art/r13/scene-15-p.webp", "thumb": "assets/art/r13/thumb-15.webp"}, {"l": "assets/art/r13/scene-16-l.webp", "p": "assets/art/r13/scene-16-p.webp", "thumb": "assets/art/r13/thumb-16.webp"}, {"l": "assets/art/r13/scene-17-l.webp", "p": "assets/art/r13/scene-17-p.webp", "thumb": "assets/art/r13/thumb-17.webp"}, {"l": "assets/art/r13/scene-18-l.webp", "p": "assets/art/r13/scene-18-p.webp", "thumb": "assets/art/r13/thumb-18.webp"}];
const HOUSINGS={"flask": "assets/art/r13/vessel-flask.svg", "valve": "assets/art/r13/vessel-valve.svg", "filter": "assets/art/r13/vessel-filter.svg", "dispenser": "assets/art/r13/vessel-dispenser.svg", "prism": "assets/art/r13/vessel-prism.svg", "seal": "assets/art/r13/vessel-seal.svg", "pressure": "assets/art/r13/vessel-pressure.svg", "pulse": "assets/art/r13/vessel-pulse.svg", "linked": "assets/art/r13/vessel-linked.svg", "inverter": "assets/art/r13/vessel-inverter.svg", "fragile": "assets/art/r13/vessel-fragile.svg", "phase": "assets/art/r13/vessel-phase.svg", "final": "assets/art/r13/vessel-final.svg"};
const cache=new Map();
let current={view:'menu',chapter:0},sceneKey='',imageToken=0,frame=0,previousTime=0;
const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.body.dataset.quality!=='low';
const svgNode=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));return e;};
function warm(path){
 if(!cache.has(path)){
  const image=new Image();image.decoding='async';
  const promise=new Promise(resolve=>{image.onload=()=>{(image.decode?image.decode().catch(()=>{}):Promise.resolve()).then(()=>resolve(image));};image.onerror=()=>resolve(null);image.src=path;});
  cache.set(path,promise);
  while(cache.size>6)cache.delete(cache.keys().next().value);
 }
 return cache.get(path);
}
async function scene(view,chapter=0){
 current={view,chapter:Math.max(0,Math.min(17,chapter))};
 document.body.dataset.view=view;updateAmbient();
 const portrait=innerHeight>innerWidth;
 const path=view==='menu'?(portrait?root+'menu-p.webp':root+'menu-l.webp'):
  SCENES[view==='atlas'?17:current.chapter][portrait?'p':'l'];
 const key=view+'|'+path;if(key===sceneKey)return;sceneKey=key;
 const token=++imageToken,img=await warm(path);
 if(token!==imageToken||!img)return;
 const back=document.getElementById('sceneBackdrop');if(back)back.style.backgroundImage=`url("${new URL(path,document.baseURI).href}")`;
 document.documentElement.style.setProperty('--scene-art',`url("${new URL(path,document.baseURI).href}")`);
 if(view==='game'&&chapter<17)void warm(SCENES[chapter+1][portrait?'p':'l']);
}
function heart(stage=0,completed=0,total=4){
 const svg=svgNode('svg',{viewBox:'0 0 240 240',class:'heart-art','aria-hidden':'true'});
 const defs=svgNode('defs');
 function linear(id,stops){const g=svgNode('linearGradient',{id,x1:'8%',y1:'0%',x2:'92%',y2:'100%'});for(const [at,color,opacity] of stops)g.append(svgNode('stop',{offset:at,'stop-color':color,...(opacity?{'stop-opacity':opacity}:{})}));defs.append(g);}
 linear('metalEdge',[['0','#54391c'],['.17','#fff1b8'],['.32','#936526'],['.49','#ffe7a8'],['.7','#76502c'],['.91','#f9dd91'],['1','#3b2b21']]);
 linear('heartGem',[['0','#f4fffc'],['.22','#a5f9ff'],['.48','#6fb1f8'],['.76','#634ac6'],['1','#263960']]);
 linear('heartFacet',[['0','#e6fff9'],['.44','#6dffec'],['1','#375bae']]);
 const halo=svgNode('radialGradient',{id:'heartHalo'});
 [['0','#b8fff2',completed?'.60':'.22'],['.28','#93a5ff',completed?'.3':'.12'],['1','#97c8ff','0']].forEach(([offset,color,opacity])=>halo.append(svgNode('stop',{offset,'stop-color':color,'stop-opacity':opacity})));defs.append(halo);
 const glow=svgNode('filter',{id:'heartSparkGlow',x:'-100%',y:'-100%',width:'300%',height:'300%'});glow.append(svgNode('feGaussianBlur',{stdDeviation:'4'}));defs.append(glow);
 svg.append(defs);
 svg.append(svgNode('circle',{cx:120,cy:120,r:112,fill:'url(#heartHalo)',class:'heart-aura'}));
 const ring=svgNode('g',{class:'heart-ring'});
 ring.append(svgNode('circle',{cx:120,cy:120,r:102,fill:'#0b2a48','fill-opacity':'.89',stroke:'url(#metalEdge)','stroke-width':7}));
 ring.append(svgNode('circle',{cx:120,cy:120,r:95,fill:'none',stroke:'#d9fbf5','stroke-opacity':'.32','stroke-width':2}));
 ring.append(svgNode('circle',{cx:120,cy:120,r:87,fill:'none',stroke:'#e9d199','stroke-width':1.8,'stroke-dasharray':'3 9'}));
 for(let i=0;i<32;i++){
  const a=i*Math.PI/16,rr=i%4?93:89;
  ring.append(svgNode('path',{d:`M${120+rr*Math.sin(a)} ${120-rr*Math.cos(a)}L${120+101*Math.sin(a)} ${120-101*Math.cos(a)}`,stroke:i%4?'#e6d4a0':'#f9edb6','stroke-width':i%4?1.2:3,'stroke-linecap':'round'}));
 }
 svg.append(ring);
 const orbit=svgNode('g',{class:'heart-orbit'});
 [48,-48].forEach(a=>orbit.append(svgNode('ellipse',{cx:120,cy:120,rx:48,ry:80,transform:`rotate(${a} 120 120)`,fill:'none',stroke:'url(#metalEdge)','stroke-width':2.5,'stroke-opacity':'.94'})));
 svg.append(orbit);
 for(let i=0;i<total;i++){
  const a=i*Math.PI*2/total,x=120+77*Math.sin(a),y=120-77*Math.cos(a),lit=i<completed;
  if(lit)svg.append(svgNode('circle',{cx:x,cy:y,r:10,fill:'#aefff1','fill-opacity':'.7',filter:'url(#heartSparkGlow)'}));
  svg.append(svgNode('circle',{cx:x,cy:y,r:lit?5.3:4,fill:lit?'#d9fff7':'#244b66',stroke:lit?'#fffbd5':'#b99e69','stroke-width':1.6}));
 }
 svg.append(svgNode('path',{d:'M120 49L163 112L141 171L99 171L77 112Z',fill:'#95f8ff',opacity:.29,filter:'url(#heartSparkGlow)'}));
 svg.append(svgNode('path',{d:'M120 49L163 112L141 171L99 171L77 112Z',fill:'url(#heartGem)',stroke:'#f4eece','stroke-width':2.6,'stroke-linejoin':'round',class:'heart-gem'}));
 svg.append(svgNode('path',{d:'M120 49L120 171L77 112Z',fill:'url(#heartFacet)',opacity:'.82'}));
 svg.append(svgNode('path',{d:'M120 49L163 112L120 119Z',fill:'#e5fff3',opacity:'.67'}));
 svg.append(svgNode('path',{d:'M120 119L163 112L141 171L120 171Z',fill:'#183f92',opacity:'.47'}));
 svg.append(svgNode('path',{d:'M77 112L120 119L163 112M120 49V171M77 112L99 171M163 112L141 171',fill:'none',stroke:'#e8ffff','stroke-opacity':'.62','stroke-width':1.5}));
 svg.append(svgNode('path',{d:'M120 36l4 9-4 9-4-9ZM172 112l7 3-7 4-7-4ZM68 112l7 3-7 4-7-4Z',fill:'#ffe9a3','fill-opacity':completed?1:.48}));
 const mark=svgNode('text',{x:120,y:193,'text-anchor':'middle',fill:'#fff0c5','font-size':15,'font-family':'Georgia,serif','font-weight':'bold','letter-spacing':'2'});
 mark.textContent=['I','II','III','IV'][stage%4];svg.append(mark);
 return svg;
}
function atlas(container){
 if(!container?.isConnected)return;
 container.querySelector('.atlas-paths')?.remove();
 const cards=[...container.querySelectorAll('.chapter-node')],cols=innerWidth<=600?3:innerWidth<=960?4:6;
 cards.forEach((card,i)=>{const row=Math.floor(i/cols),column=i%cols;card.style.gridRow=row+1;card.style.gridColumn=(row%2?cols-column:column+1);});
 const rect=container.getBoundingClientRect(),svg=svgNode('svg',{class:'atlas-paths',viewBox:`0 0 ${rect.width} ${rect.height}`,preserveAspectRatio:'none','aria-hidden':'true'});
 for(let i=1;i<cards.length;i++){
  const a=cards[i-1].getBoundingClientRect(),b=cards[i].getBoundingClientRect();
  const x1=a.x-rect.x+a.width/2,y1=a.y-rect.y+a.height/2,x2=b.x-rect.x+b.width/2,y2=b.y-rect.y+b.height/2;
  const d=Math.abs(y1-y2)<10?`M${x1} ${y1}Q${(x1+x2)/2} ${y1+30} ${x2} ${y2}`:`M${x1} ${y1}C${x1+25} ${(y1+y2)/2} ${x2+25} ${(y1+y2)/2} ${x2} ${y2}`;
  svg.append(svgNode('path',{d,class:Number(cards[i-1].dataset.stars)>0?'restored-path':'dormant-path'}));
 }
 container.prepend(svg);
}
function laboratory(count,upgrades){
 const lab=document.getElementById('labScene');if(!lab)return;
 lab.dataset.mastery=count;
 let frame=lab.querySelector('.lab-assembly');if(!frame){frame=document.createElement('div');frame.className='lab-assembly';frame.setAttribute('aria-hidden','true');lab.prepend(frame);}
 frame.replaceChildren();
 const svg=svgNode('svg',{viewBox:'0 0 1000 600',preserveAspectRatio:'none'});
 const light=count>22?'#9fe3da':'#b5935b';
 const points=Array.from({length:28},(_,i)=>({x:80+(i%14)*64.5,y:i<14?45:555}));
 points.forEach((p,i)=>{if(i>0&&i%14)svg.append(svgNode('path',{d:`M${points[i-1].x} ${p.y}H${p.x}`,stroke:i<count?light:'#4a463c','stroke-width':2}));svg.append(svgNode('circle',{cx:p.x,cy:p.y,r:i<count?5:3,fill:i<count?light:'#514a3d'}));});
 if(count>=8)svg.append(svgNode('path',{d:'M55 90V510H945V90',fill:'none',stroke:'#af925c','stroke-width':4,'stroke-opacity':.55}));
 if(count>=16)svg.append(svgNode('path',{d:'M70 70H930M70 530H930M150 65V45M850 65V45',fill:'none',stroke:'#d0b277','stroke-width':5,'stroke-opacity':.55}));
 if(count===28){
  const group=svgNode('g',{class:'lab-final-rings'});
  [0,60,120].forEach(a=>group.append(svgNode('ellipse',{cx:500,cy:120,rx:90,ry:30,transform:`rotate(${a} 500 120)`,fill:'none',stroke:'#b2e3d3','stroke-width':2})));
  group.append(svgNode('path',{d:'M500 69L535 119L500 168L465 119Z',fill:'#99e2de','fill-opacity':.7,stroke:'#f1dfac','stroke-width':2}));svg.append(group);
 }
 frame.append(svg);
}
let celebrationTimer=0;
function celebrate(kind,reduced){
 const board=document.getElementById('board');if(!board)return;
 clearTimeout(celebrationTimer);board.dataset.celebration=kind;
 celebrationTimer=setTimeout(()=>{delete board.dataset.celebration;},reduced?150:kind==='atlas'?2400:1000);
}
const particles=Array.from({length:24},(_,i)=>({x:(i*.6180339)%1,y:(i*.381966)%1,r:i%4===0?1.8:.9,phase:i*.83}));
let ambientContext=null;
function animate(time){
 frame=0;
 if(document.hidden||document.body.classList.contains('page-hidden')||!motion()||document.body.dataset.view==='game')return;
 frame=requestAnimationFrame(animate);
 if(time-previousTime<50)return;
 previousTime=time;
 const canvas=document.getElementById('ambientCanvas'),ctx=ambientContext || (ambientContext=canvas?.getContext('2d'));if(!ctx)return;
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const count=document.body.dataset.quality==='high'?24:12;
 for(let i=0;i<count;i++){
  const p=particles[i];
  const x=(p.x<.5?p.x*.28:.72+(p.x-.5)*.56)*w,y=((p.y+time*.000006)%1)*h;
  ctx.globalAlpha=.18+.23*(Math.sin(time*.0006+p.phase)+1)/2;ctx.fillStyle='#dcc891';ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();
 }
 ctx.globalAlpha=1;
}
function resize(){
 const c=document.getElementById('ambientCanvas');
 if(c){const w=Math.min(innerWidth,1600),h=Math.min(innerHeight,1200);if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;}
 scene(current.view,current.chapter);
 const a=document.querySelector('.chapter-atlas');if(a&&!document.getElementById('levelsScreen')?.classList.contains('hidden'))atlas(a);
}
function updateAmbient(){
 const active=!document.hidden&&!document.body.classList.contains('page-hidden')&&motion()&&document.body.dataset.view!=='game';
 if(active&&!frame)frame=requestAnimationFrame(animate);
 else if(!active){cancelAnimationFrame(frame);frame=0;const c=document.getElementById('ambientCanvas');c?.getContext('2d')?.clearRect(0,0,c.width,c.height);}
}
function start(){resize();updateAmbient();}
document.addEventListener('change',e=>{if(e.target.id==='qualitySelect')updateAmbient();});
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;document.body.classList.toggle('page-hidden',document.hidden);updateAmbient();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',updateAmbient);
window.AtlasArt={refresh:updateAmbient,scene,heart,atlas,laboratory,resize,celebrate,housing:type=>HOUSINGS[type]||HOUSINGS.flask,thumb:ch=>SCENES[Math.max(0,Math.min(17,ch))].thumb};
})();
