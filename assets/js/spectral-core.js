/* Atlas of Light: shared deterministic rules. Arrays are bottom -> top.
   No DOM, clock, random, ads or efficiency counter enters puzzle semantics. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Spectral=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=5;
const copy=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
function config(level,state){return level.stages?level.stages[state.stage||0]:level;}
function createState(c,b){const choices=c.branches?{choices:c.caps.map(()=>-1)}:{};return {...choices,b:(b||c.b).map(a=>a.slice()),phase:0,sw:0,flip:0,link:0,open:0,inv:c.inv||0,charges:(c.devices||[]).map(d=>Number.isInteger(d.uses)?d.uses:-1),stage:0};}
function resolveChoices(c,s){
 if(c.branches)for(let i=0;i<s.b.length;i++){
  const variants=c.branches[i];if(!variants||s.choices[i]!==-1||!s.b[i].length)continue;
  const branch=variants.findIndex(g=>g[0]===s.b[i][0]);
  if(branch>=0)s.choices[i]=branch;
 }
 return s;
}
function goal(c,s,i){const variants=c.branches?.[i];return variants&&s.choices?.[i]>=0?variants[s.choices[i]]:c.goals[i];}
function goalMet(c,s,i){return (!c.branches?.[i]||s.choices?.[i]>=0)&&same(goal(c,s,i),s.b[i]);}
function unlock(c,s){resolveChoices(c,s);(c.devices||[]).forEach((d,i)=>{if(d.seal&&same(s.b[d.seal.key],d.seal.pattern))s.open|=(1<<i);});return s;}
function initial(level){return unlock(config(level,{stage:0}),createState(config(level,{stage:0})));}
function goalsMatch(c,s){return Array.isArray(c.goals)&&c.goals.length===s.b.length&&c.goals.every((g,i)=>goalMet(c,s,i));}
function solved(level,s){return (!level.stages||s.stage===level.stages.length-1)&&goalsMatch(config(level,s),s);}
function key(s){return s.b.map(x=>x.join('')).join('|')+';'+[s.phase,s.sw,s.flip,s.link,s.open,s.inv,s.stage,...s.charges].join(',')+(s.choices?';b'+s.choices.join(','):'');}
function boardKey(s){return s.b.map(x=>x.join('')).join('|');}
function clone(s){return {...s,b:s.b.map(x=>x.slice()),charges:s.charges.slice(),...(s.choices?{choices:s.choices.slice()}:{})};}
function mode(d,s,i){if(d.pulse)return (s.flip&(1<<i))?'in':'out';if(d.link!==undefined)return s.link===d.link?'out':'in';return d.mode||'both';}
function routeActive(e,s){return (e.sw===undefined||e.sw===s.sw)&&(e.phase===undefined||e.phase===s.phase);}
function edges(c){return c.routes||[];}
function connected(c,s,a,b){return !c.routes||c.routes.some(e=>((e.a===a&&e.b===b)||(e.bidir&&e.b===a&&e.a===b))&&routeActive(e,s));}
function reason(c,s,from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=s.b.length||to>=s.b.length||from===to)return 'pair';
 const a=s.b[from],b=s.b[to],da=(c.devices||[])[from]||{},db=(c.devices||[])[to]||{};
 if(!a.length)return 'empty';if(b.length>=c.caps[to])return 'full';
 if((da.seal&&!(s.open&(1<<from)))||(db.seal&&!(s.open&(1<<to))))return 'seal';
 if(mode(da,s,from)==='in'||mode(db,s,to)==='out')return 'direction';
 if(da.pressure&&a.length<da.pressure)return 'pressure';
 if(s.charges[from]===0)return 'charges';
 if(!connected(c,s,from,to))return 'route';
 if(db.filter&&!db.filter.includes(a[a.length-1]))return 'filter';
 return '';
}
function amount(c,s,from,to){if(reason(c,s,from,to))return 0;const a=s.b[from],d=(c.devices||[])[from]||{};let n=1;while(n<a.length&&a[a.length-1-n]===a[a.length-1])n++;return Math.min(n,c.caps[to]-s.b[to].length,d.dose||99);}
function validAction(c,s,a){if(!a||typeof a!=='object')return false;if(a.kind==='switch')return !!c.switch;if(a.kind==='invert'){const d=(c.devices||[])[a.from]||{};return s.inv>0&&!!d.inverter&&s.b[a.from]?.length>1&&(!d.seal||(s.open&(1<<a.from)))&&!same(s.b[a.from],s.b[a.from].slice().reverse());}return a.kind==='pour'&&!reason(c,s,a.from,a.to);}
function actions(c,s){const out=[];for(let a=0;a<s.b.length;a++){for(let b=0;b<s.b.length;b++){if(!reason(c,s,a,b))out.push({kind:'pour',from:a,to:b});}const i={kind:'invert',from:a,to:-1};if(validAction(c,s,i))out.push(i);}if(c.switch)out.push({kind:'switch',from:-1,to:-1});return out;}
function step(c,s,a){
 if(!validAction(c,s,a))return null;
 const n=clone(s);let count=0,color=-1,converted=-1;
 if(a.kind==='pour'){
  count=amount(c,s,a.from,a.to);color=s.b[a.from].at(-1);const d=(c.devices||[])[a.to]||{};converted=d.prism?d.prism[color]:color;
  n.b[a.from].length-=count;for(let i=0;i<count;i++)n.b[a.to].push(converted);
  if(n.charges[a.from]>=0)n.charges[a.from]--;
  for(const i of [a.from,a.to])if(c.devices?.[i]?.pulse)n.flip^=(1<<i);
  if(c.devices?.[a.from]?.link!==undefined||c.devices?.[a.to]?.link!==undefined)n.link^=1;
 }else if(a.kind==='invert'){n.b[a.from].reverse();n.inv--;}else n.sw^=1;
 if(c.parity)n.phase^=1;
 unlock(c,n);
 return {state:n,amount:count,color,converted};
}
function enterStage(level,s){const nextIndex=s.stage+1;const next=level.stages[nextIndex];const board=next.permutation?next.permutation.map(i=>s.b[i].slice()):s.b;
 const n=createState(next,board);n.stage=nextIndex;return unlock(next,n);}
function act(level,s,a){const c=config(level,s);const result=step(c,s,a);if(!result)return null;let n=result.state;const transitions=[];while(level.stages&&n.stage<level.stages.length-1&&goalsMatch(config(level,n),n)){transitions.push(n.stage);n=enterStage(level,n);}return {...result,state:n,transitions};}
function validState(level,s){try{
 const stages=level.stages||[level];
 if(!s||!Number.isInteger(s.stage)||s.stage<0||s.stage>=stages.length)return false;
 const c=config(level,s),n=c.caps.length;
 if(!Array.isArray(s.b)||s.b.length!==n||!s.b.every((b,i)=>Array.isArray(b)&&b.length<=c.caps[i]&&b.every(v=>Number.isInteger(v)&&v>=0&&v<7)))return false;
 if(![0,1].includes(s.phase)||(!c.parity&&s.phase!==0)||![0,1].includes(s.sw)||(!c.switch&&s.sw!==0)||![0,1].includes(s.link))return false;
 const pulseMask=c.devices.reduce((m,d,i)=>m|(d.pulse?1<<i:0),0),sealMask=c.devices.reduce((m,d,i)=>m|(d.seal?1<<i:0),0);
 if(!Number.isInteger(s.flip)||s.flip<0||(s.flip&~pulseMask)!==0||!Number.isInteger(s.open)||s.open<0||(s.open&~sealMask)!==0)return false;
 if(!c.devices.some(d=>d.link!==undefined)&&s.link!==0)return false;
 if(!Number.isInteger(s.inv)||s.inv<0||s.inv>(c.inv||0))return false;
 if(!Array.isArray(s.charges)||s.charges.length!==n||!s.charges.every((v,i)=>Number.isInteger(v)&&(c.devices[i].uses===undefined?v===-1:v>=0&&v<=c.devices[i].uses)))return false;
 if(c.branches){
  if(!Array.isArray(s.choices)||s.choices.length!==n)return false;
  for(let i=0;i<n;i++){
   const variants=c.branches[i],choice=s.choices[i];
   if(!Number.isInteger(choice)||choice< -1||choice>=(variants?.length||0))return false;
   if(choice===-1&&variants&&s.b[i].length&&variants.some(g=>g[0]===s.b[i][0]))return false;
  }
 }else if(s.choices!==undefined)return false;
 const original=stages[0].b.flat(),current=s.b.flat();if(original.length!==current.length)return false;
 const converters=stages.flatMap(c=>c.devices).filter(d=>d.prism).map(d=>d.prism);
 if(!converters.length){const counts=a=>Array.from({length:7},(_,i)=>a.filter(x=>x===i).length);if(!same(counts(original),counts(current)))return false;}
 else {const allowed=new Set(original);for(let pass=0;pass<7;pass++)for(const map of converters)for(const color of [...allowed])allowed.add(map[color]);if(current.some(v=>!allowed.has(v)))return false;}
 return true;
 }catch(_){return false;}}
function certificateMap(level){
 const map=new Map(),paths=[level.solution||[],...Object.values(level.branchProof||{}).map(p=>p.solution)];
 for(const path of paths){
  if(!Array.isArray(path))throw new Error('Invalid certificate path');
  let state=initial(level);
  for(let i=0;i<path.length;i++){
   const action=path[i],remaining=path.length-i,k=key(state),old=map.get(k);
   if(!old||remaining<old.remaining)map.set(k,{action,remaining});
   const result=act(level,state,action);
   if(!result)throw new Error('Invalid certificate step '+i);
   state=result.state;
  }
  if(!solved(level,state))throw new Error('Certificate does not solve level '+level.id);
 }
 return map;
}
function findHint(level,start,available,limit=60000,deadlineMs=1300){
 const cert=certificateMap(level),direct=cert.get(key(start));if(direct&&direct.remaining<=available)return {action:direct.action,proven:true,visited:0};
 const began=Date.now(),queue=[{s:start,first:null,depth:0}],seen=new Set([key(start)]);
 for(let head=0;head<queue.length&&head<limit;head++){if((head&255)===0&&Date.now()-began>deadlineMs)break;const n=queue[head];if(n.depth>=available)continue;
  for(const a of actions(config(level,n.s),n.s)){const r=act(level,n.s,a),s=r.state,k=key(s);if(seen.has(k))continue;seen.add(k);const first=n.first||a,depth=n.depth+1;
   if(solved(level,s))return {action:first,proven:true,visited:head+1};const join=cert.get(k);if(join&&depth+join.remaining<=available)return {action:first,proven:true,visited:head+1};if(depth<available)queue.push({s,first,depth});}
 }
 return {action:null,proven:false,visited:seen.size};
}
return {VERSION,copy,same,config,goal,goalMet,resolveChoices,createState,initial,unlock,goalsMatch,solved,key,boardKey,clone,mode,routeActive,edges,connected,reason,amount,validAction,actions,step,act,enterStage,validState,certificateMap,findHint};
});
