    (() => {
      'use strict';
const E = window.Spectral;
const HINT_PRICES=[20,35,55];
const ART=window.AtlasArt;
const REVISED_LEVELS=new Set(window.STAR_LEVEL_DATA.flatMap((l,i)=>l.revision===13?[i]:[]));
const GLYPHS=['●','◆','▲','✚','★','☾','≋'];
const REASONS={empty:'Источник пуст',full:'В приёмнике нет места',seal:'Сначала собери рецепт-ключ',direction:'Клапан сейчас направлен в другую сторону',pressure:'Для отдачи нужно поднять давление: добавь слои',charges:'Исходящие заряды исчерпаны. Отмена или новая попытка',route:'Эта линия сейчас неактивна. Проверь направление, переключатель и фазу',filter:'Фильтр не пропускает верхний цвет',pair:'Выбери другой приёмник'};
const SPECTRAL_CHAPTERS=[
 ['Свободный спектр','Разные цвета можно переливать друг на друга. Собери рецепт справа от каждого сосуда.'],
 ['Развилка резонанса','У отмеченного сосуда два рецепта. Нижний слой выбирает А или Б и закрепляет рецепт до конца попытки. Оба пути решаемы.'],
 ['Односторонние сосуды','Сосуд со стрелкой вниз только принимает. Ошибочный слой придётся отменить или начать заново.'],
 ['Спектральные фильтры','Фильтр принимает лишь отмеченный цвет. Обычные сосуды по-прежнему принимают любые цвета.'],
 ['Дозатор','Дозатор отдаёт ровно один верхний слой, даже когда несколько соседних слоёв одинаковы.'],
 ['Спектральная призма','При входе в призму цвет меняется по схеме на сосуде. Сначала преобразуй спектр, затем доставь его в нужный рецепт.'],
 ['Печати и ключи','Запечатанный сосуд откроется навсегда, когда собран показанный рецепт-ключ.'],
 ['Сеть созвездия','Переливай только по линиям сети. Стрелки задают направление; выбор источника выделяет доступные пути.'],
 ['Переключатели маршрутов','Переключатель А/Б меняет линии сети. Его использование тоже стоит один ход.'],
 ['Неравные сосуды','Вместимости различаются: 3, 4 и 5 слоёв. Пользуйся небольшими сосудами для точного разделения.'],
 ['Давление','Сосуд давления отдаёт жидкость только при наполнении до отметки. Сначала подготовь нужный объём.'],
 ['Пульсирующий клапан','Клапан меняет направление после каждого использования: отдать → принять → отдать.'],
 ['Связанные колбы','Парные колбы меняют режимы вместе. Использование одной переключает источник и приёмник в паре.'],
 ['Инвертор','Инвертор разворачивает порядок слоёв выбранного сосуда. Заряды ограничены, действие стоит ход.'],
 ['Хрупкие горлышки','Отмеченное горлышко выдерживает три исходящих перелива. Число оставшихся зарядов видно на сосуде.'],
 ['Фазовые врата','Лазурные и янтарные линии работают по очереди. Любое действие меняет фазу сети.'],
 ['Цепочка резонанса','Собери все рецепты первого этапа, затем второго. План каждого этапа доступен до первого хода.'],
 ['Сердце Атласа','Многоэтапный ритуал: сосуды меняют позиции, сеть и устройства перестраиваются. Планируй весь путь заранее.']
];
let winRevealTimer=0;
let puzzleState=null, totalHints=0, paidHints=0, attemptId=0, hintPending=false, hintWorker=null, hintAbort=null, atlasChapter=0, energyFx=null;
const currentConfig=()=>E.config(LEVEL_DATA[currentLevel],puzzleState||{stage:0});
const remainingMoves=()=>Math.max(0,LEVEL_DATA[currentLevel].m+bonusMoves-moves);
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.dataset.quality==='low';
function makeNode(tag,className='',text){const n=document.createElement(tag);n.className=className;if(text!==undefined)n.textContent=text;return n;}
function deviceType(d){return d.prism?'prism':d.seal?'seal':d.pressure?'pressure':d.pulse?'pulse':d.link!==undefined?'linked':d.inverter?'inverter':d.uses!==undefined?'fragile':d.dose?'dispenser':d.filter?'filter':d.mode?'valve':'flask';}
function deviceGlyph(d){return {prism:'◇',seal:'✥',pressure:'⊙',pulse:'⇅',linked:'∞',inverter:'↕',fragile:'⋮',dispenser:'Ⅰ',filter:'▧',valve:'↓',flask:'✦'}[deviceType(d)];}
function deviceStatus(i){const c=currentConfig(),d=c.devices[i]||{};
 if(d.seal)return (puzzleState.open&(1<<i))?'Печать открыта':`Ключ ${d.seal.key+1}: ${d.seal.pattern.map(v=>GLYPHS[v]).join('')}`;
 if(d.prism)return prismPairs(d).map(([a,b])=>GLYPHS[a]+' ⇄ '+GLYPHS[b]).join(' ');
 if(d.pressure)return `Давление ${bottles[i].length}/${d.pressure}`;
 if(d.pulse)return E.mode(d,puzzleState,i)==='out'?'Пульс: отдаёт':'Пульс: принимает';
 if(d.link!==undefined)return E.mode(d,puzzleState,i)==='out'?'Связь: отдаёт':'Связь: принимает';
 if(d.inverter)return `Инвертор · ${puzzleState.inv}`;
 if(d.uses!==undefined)return `Заряды ${puzzleState.charges[i]}/${d.uses}`;
 if(d.dose)return 'По 1 слою';
 if(d.filter)return `Фильтр ${d.filter.map(v=>GLYPHS[v]).join(' ')}`;
 if(d.mode)return d.mode==='in'?'Только вход':'Только выход';
 return `${bottles[i].length}/${c.caps[i]} · свободный`;
}
function deviceDescription(i){const d=currentConfig().devices[i]||{};return deviceStatus(i)+(d.seal?`. Ключ снизу вверх: ${d.seal.pattern.map(v=>COLOR_NAMES[v]).join(', ')}`:'');}
function actionText(a){return a.kind==='pour'?`Подсказка: сосуд ${a.from+1} → сосуд ${a.to+1}. Выполни этот один ход самостоятельно.`:a.kind==='invert'?`Подсказка: нажми «Инвертор ${a.from+1}».`:'Подсказка: переключи маршруты кнопкой А/Б.';}
function drawNetwork(){
 if(!puzzleState||el.gameScreen.classList.contains('hidden'))return;
 const svg=el.board.querySelector('svg.route-network');if(!svg)return;
 const rect=el.board.getBoundingClientRect();if(!rect.width)return;
 svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
 svg.innerHTML='<defs><marker id="routeArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>';
 const nodes=Array.from(el.board.querySelectorAll('.bottle')).map(n=>{const r=n.getBoundingClientRect();return {x:r.x-rect.x+r.width/2,y:r.y-rect.y+r.height/2};});
 const c=currentConfig();let edges=c.routes;
 if(!edges){edges=[];nodes.forEach((a,i)=>nodes.forEach((b,j)=>{if(j>i)edges.push({a:i,b:j,bidir:true});}));}
 edges.forEach(edge=>{
  const a=nodes[edge.a],b=nodes[edge.b];if(!a||!b)return;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,margin=Math.min(57,len*.3),x1=a.x+dx/len*margin,y1=a.y+dy/len*margin,x2=b.x-dx/len*margin,y2=b.y-dy/len*margin;
  const path=document.createElementNS(svg.namespaceURI,'path'),active=E.routeActive(edge,puzzleState);
  let focus=selected===edge.a||(edge.bidir&&selected===edge.b);
  path.setAttribute('d',`M${x1},${y1} L${x2},${y2}`);path.classList.add('route');path.classList.toggle('active',active);path.classList.toggle('focus',focus&&active);
  if(edge.phase!==undefined)path.classList.add(edge.phase?'phase-amber':'phase-cyan');
  if(c.routes){path.setAttribute('marker-end','url(#routeArrow)');if(edge.bidir)path.setAttribute('marker-start','url(#routeArrow)');}
  if(hintMove?.kind==='pour'&&((hintMove.from===edge.a&&hintMove.to===edge.b)||(edge.bidir&&hintMove.from===edge.b&&hintMove.to===edge.a)))path.classList.add('hint-route');
  svg.append(path);
  if(edge.phase!==undefined||edge.sw!==undefined){const label=document.createElementNS(svg.namespaceURI,'text');label.setAttribute('x',String((x1+x2)/2));label.setAttribute('y',String((y1+y2)/2-7));label.setAttribute('class','route-label');label.textContent=edge.sw!==undefined?(edge.sw?'Б':'А'):(edge.phase?'II':'I');svg.append(label);}

 });
}
function lifetimeChapterFinale(){return (currentLevel+1)%10===0?'chapter':'recipe';}
function performAction(action){
 if(!puzzleState||locked||hintPending||isInteractionBlocked()||isWin())return;
 if(!remainingMoves()){showLimit();return;}
 const before=E.clone(puzzleState),result=E.act(LEVEL_DATA[currentLevel],before,action);if(!result)return;
 const token=attemptId; safeStorageSet('atlasLessonR13_'+chapterIndex(currentLevel),'seen'); locked=true;hintMove=null;clearTimeout(hintTimer);selected=null;
 const finish=()=>{
  cleanupPourEngine();if(token!==attemptId)return;
  history.push(before);puzzleState=result.state;bottles=puzzleState.b;moves++;locked=false;
  persistLocalProgress();render();
  if(!result.transitions.length)activateConstellation(before);
  if(result.transitions.length)showToast(`Созвездие восстановлено. Этап ${puzzleState.stage+1}: поле преобразовано.`);
  if(isWin()){
    locked=true;ART?.celebrate(currentLevel===179?'atlas':lifetimeChapterFinale(),reducedMotion());
    showWin((currentLevel+1)%10===0&&!reducedMotion()?(currentLevel===179?1150:720):0);
  }
  else if(!remainingMoves())showLimit();
  else if(completedCount()>before.b.filter((b,i)=>E.goalMet(E.config(LEVEL_DATA[currentLevel],before),before,i)).length){el.board.classList.add('energized');setTimeout(()=>el.board.classList.remove('energized'),700);playTone(860,.15,.025);}
 };
 if(action.kind!=='pour'){
  render(); el.board.classList.add('device-action'); const duration=reducedMotion()?100:480;
  const start=performance.now();activePourEngine={raf:0,deviceEl:action.kind==='invert'?el.board.querySelector(`[data-index="${action.from}"] .liquid-stack`):null};
  const tick=t=>{if(t-start>=duration){finish();return;}el.board.style.setProperty('--device-turn',String((t-start)/duration));if(activePourEngine.deviceEl)activePourEngine.deviceEl.style.transform=`rotateX(${180*(t-start)/duration}deg)`;activePourEngine.raf=requestAnimationFrame(tick);};
  activePourEngine.raf=requestAnimationFrame(tick);playTone(action.kind==='invert'?620:350,.14,.025);return;
 }
 const source=el.board.querySelector(`[data-index="${action.from}"]`),target=el.board.querySelector(`[data-index="${action.to}"]`);
 if(!source||!target){finish();return;}
 const a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),sourceNeck=source.querySelector('.vessel-neck').getBoundingClientRect(),targetNeck=target.querySelector('.vessel-neck').getBoundingClientRect(),clone=source.cloneNode(true);
 clone.removeAttribute('id');clone.removeAttribute('aria-pressed');clone.setAttribute('aria-hidden','true');clone.tabIndex=-1;clone.classList.add('pour-ghost');
 clone.style.transformOrigin=`${sourceNeck.x-a.x+sourceNeck.width/2}px ${sourceNeck.y-a.y+sourceNeck.height/2}px`;
 Object.assign(clone.style,{left:`${a.x}px`,top:`${a.y}px`,width:`${a.width}px`,height:`${a.height}px`});document.body.append(clone);source.classList.add('in-transit');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','pour-overlay');svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);svg.setAttribute('aria-hidden','true');
 svg.innerHTML=`<defs><linearGradient id="pourGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS[result.color]}"/><stop offset="1" stop-color="${COLORS[result.converted]}"/></linearGradient></defs><path class="pour-stream" fill="none" stroke="url(#pourGradient)" stroke-width="6" stroke-linecap="round"/>`;
 document.body.append(svg);
 const sourceSegments=[...clone.querySelectorAll('.liquid-segment')],targetSegments=[...target.querySelectorAll('.liquid-segment')],previewNodes=[];
 for(let j=before.b[action.to].length;j<before.b[action.to].length+result.amount;j++){
  const node=targetSegments[j];previewNodes.push({node,original:node.cloneNode(true)});node.classList.remove('empty');node.style.setProperty('--liquid',COLORS[result.converted]);node.style.clipPath='inset(100% 0 0 0)';node.append(makeNode('span','spectrum-glyph',GLYPHS[result.converted]));
 }
 target.classList.add('receiving');
 activePourEngine={root:svg,clone,sourceEl:source,targetEl:target,previewNodes,raf:0};
 const begin=performance.now(),duration=reducedMotion()?130:640,dir=b.x>=a.x?1:-1;
 const nx=sourceNeck.x+sourceNeck.width/2,ny=sourceNeck.y+sourceNeck.height/2;
 const endX=targetNeck.x+targetNeck.width/2-dir*10,endY=targetNeck.y+targetNeck.height/2-28;
 const tx=endX-nx,ty=endY-ny;
 const tick=t=>{
  const p=Math.min(1,(t-begin)/duration);if(p>=1){finish();return;}
  const lift=p<.26?p/.26:p>.77?(1-p)/.23:1,e=1-(1-Math.max(0,Math.min(1,lift)))**3;
  clone.style.transform=`translate(${tx*e}px,${ty*e-16*Math.sin(e*Math.PI)}px) rotate(${dir*62*e}deg)`;
  const flow=Math.max(0,Math.min(1,(p-.24)/.55));
  for(let step=0;step<result.amount;step++){
   const progress=Math.max(0,Math.min(1,flow*result.amount-step));
   sourceSegments[before.b[action.from].length-1-step].style.clipPath=`inset(${progress*100}% 0 0 0)`;
   previewNodes[step].node.style.clipPath=`inset(${(1-progress)*100}% 0 0 0)`;
  }
  const stream=svg.querySelector('path.pour-stream');
  if(p>.24&&p<.79){const x=targetNeck.x+targetNeck.width/2,y=targetNeck.y+targetNeck.height/2,x0=endX,y0=endY;stream.setAttribute('d',`M${x0} ${y0} Q${x0+dir*45} ${y0+2} ${x} ${y}`);stream.style.opacity=String(Math.min(1,(p-.24)*12,(.79-p)*12));}
  else stream.style.opacity='0';
  activePourEngine.raf=requestAnimationFrame(tick);
 };
 activePourEngine.raf=requestAnimationFrame(tick);playTone(330,.13,.02);playTone(480,.15,.016,.16);
}
function cancelHintSearch(){if(hintAbort)hintAbort();hintWorker?.terminate();hintWorker=null;hintAbort=null;hintPending=false;}
function solveHintAsync(level,state,available){
 return new Promise(resolve=>{
  let finished=false;const settle=r=>{if(finished)return;finished=true;clearTimeout(timer);hintWorker?.terminate();hintWorker=null;hintAbort=null;resolve(r);};
  const timer=setTimeout(()=>settle(null),4500);hintAbort=()=>settle(null);
  try {hintWorker=new Worker(new URL('assets/js/hint-worker.js',document.baseURI));hintWorker.onmessage=e=>settle(e.data?.action?e.data.action:null);hintWorker.onerror=()=>settle(null);hintWorker.postMessage({level,state,available});}
  catch(_){setTimeout(()=>{try{settle(E.findHint(level,state,available,12000,250).action);}catch(_){settle(null);}},0);}
 });
}
async function requestHint(ad){
 if(locked||hintPending||isInteractionBlocked()||isWin())return;
 if(totalHints>=5){showToast('Подсказки исчерпаны. Начни попытку заново.');return;}
 if(!ad&&(paidHints>=3||coins<HINT_PRICES[paidHints])){showToast(paidHints>=3?'Лимит покупок: 3/3':'Недостаточно монет. Доступна подсказка за рекламу.');return;}
 const token=attemptId,key=E.key(puzzleState);hintPending=true;render();
 const action=await solveHintAsync(LEVEL_DATA[currentLevel],E.clone(puzzleState),remainingMoves());
 hintPending=false;if(token!==attemptId||key!==E.key(puzzleState)){render();return;}
 if(!action){render();showToast('Доказанный путь в оставшиеся ходы не найден. Ничего не списано. Попробуй отмену или начни заново.');return;}
 const grant=()=>{
  if(token!==attemptId||key!==E.key(puzzleState)||totalHints>=5||(!ad&&(paidHints>=3||coins<HINT_PRICES[paidHints])))return;
  if(!ad){coins-=HINT_PRICES[paidHints];paidHints++;}else recordInterstitialAttempt();
  totalHints++;usedAssist=true;hintMove=action;selected=null;persistLocalProgress();render();updateCoinDisplays();
  clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hintMove=null;if(!locked)render();},9000);
 };
 render(); if(ad)await showRewardedAd(grant);else grant();
}
function openRules(){
 if(isInteractionBlocked()||locked||hintPending)return;
 const modal=document.getElementById('rulesModal'),box=document.getElementById('rulesContent'),l=LEVEL_DATA[currentLevel];box.replaceChildren();
 box.append(makeNode('h2','',chapterFor(currentLevel).name),makeNode('p','',chapterFor(currentLevel).brief),makeNode('p','','Порядок в сосуде и рецепте: снизу вверх. Рецепт справа: цвет + знак; точка означает пустое место. Переливается весь верхний одноцветный блок, кроме дозатора. Отмена не возвращает потраченные ходы.'));
 const configs=l.stages||[l];configs.forEach((c,stage)=>{
  const card=makeNode('section','stage-plan');card.append(makeNode('h3','',`Этап ${stage+1}${stage===puzzleState?.stage?' · сейчас':''}`));
  if(c.permutation)card.append(makeNode('p','',`Перед этапом содержимое перемещается: ${c.permutation.map((old,i)=>`${old+1}→${i+1}`).join(' · ')}. Счётчик ходов и помощь не сбрасываются.`));
  const list=makeNode('div','recipe-plan');c.goals.forEach((rawGoal,i)=>{const g=c.branches?.[i] ? E.goal(c,puzzleState,i) : rawGoal;const n=makeNode('div','');n.append(makeNode('b','',`${i+1} ↑ `));if(!g.length)n.append(document.createTextNode('пусто'));g.forEach(v=>{const chip=makeNode('span','recipe-chip',GLYPHS[v]);chip.style.setProperty('--liquid',COLORS[v]);n.append(chip);});list.append(n);});card.append(list);
  c.branches?.forEach((variants,i)=>{if(!variants)return;variants.forEach((g,k)=>{const n=makeNode('div','branch-plan');n.append(makeNode('b','',`Сосуд ${i+1} · ${k?'Б':'А'} ↑ `));g.forEach(v=>{const chip=makeNode('span','recipe-chip',GLYPHS[v]);chip.style.setProperty('--liquid',COLORS[v]);n.append(chip);});card.append(n);});});
  c.devices.forEach((d,i)=>{if(d.seal)card.append(makeNode('p','',`Печать ${i+1}: ключ в сосуде ${d.seal.key+1}, снизу вверх ${d.seal.pattern.map(v=>GLYPHS[v]).join(' ')}.`));});
c.devices.forEach((d,i)=>{const details=[`Вместимость: ${c.caps[i]}`];if(d.mode)details.push(d.mode==='in'?'только принимает':'только отдаёт');if(d.filter)details.push(`фильтр: ${d.filter.map(v=>GLYPHS[v]).join(' ')}`);if(d.dose)details.push('выдаёт один слой');if(d.prism)details.push(`призма при входе: ${prismPairs(d).map(([a,b])=>`${GLYPHS[a]} ⇄ ${GLYPHS[b]}`).join(', ')}`);if(d.pressure)details.push(`отдаёт при наполнении от ${d.pressure} слоёв`);if(d.pulse)details.push('пульс: начинает как источник, после использования меняет направление');if(d.link!==undefined)details.push(`связанная пара: ${d.link===0?'начинает как источник':'начинает как приёмник'}, оба режима переключаются вместе`);if(d.inverter)details.push(`разворот слоёв, общий запас ${c.inv||0}`);if(d.uses!==undefined)details.push(`исходящих переливов: ${d.uses}`);card.append(makeNode('p','device-plan',`Сосуд ${i+1}. ${details.join(' · ')}.`));});
  if(c.switch)card.append(makeNode('p','','Переключатель начинает в положении А. Переключение А ↔ Б стоит один ход.'));
  if(c.parity)card.append(makeNode('p','','Сначала фаза I (лазурь), затем II (янтарь). Каждое успешное действие переключает фазу.'));
  if(c.routes)card.append(makeNode('p','route-plan',`Линии: ${c.routes.map(e=>`${e.a+1}${e.bidir?'↔':'→'}${e.b+1}${e.sw!==undefined?` (${e.sw?'Б':'А'})`:''}${e.phase!==undefined?` (${e.phase?'янтарь':'лазурь'})`:''}`).join(' · ')}`));
  box.append(card);
 });
 box.append(makeNode('p','','Помощь: не больше 5 подсказок за попытку, из них до 3 покупок (20 → 35 → 55 монет). Любая подсказка и рекламное восстановление ограничивают результат двумя звёздами. Три звезды — только самостоятельный эталон. Рецепты всех этапов известны заранее.'));
 modal.classList.remove('hidden');el.gameScreen.setAttribute('inert','');document.getElementById('rulesClose').focus();
}
function closeRules(){document.getElementById('rulesModal').classList.add('hidden');if(el.winModal.classList.contains('hidden')&&el.limitModal.classList.contains('hidden'))el.gameScreen.removeAttribute('inert');document.getElementById('rulesBtn').focus();}
function sanitizeLegacyBests(raw){const out={};if(raw&&typeof raw==="object"&&!Array.isArray(raw))for(const [k,v] of Object.entries(raw)){const i=Number(k),value=Number(v);if(Number.isInteger(i)&&i>=0&&i<180&&Number.isInteger(value)&&value>0&&value<=1000000)out[i]=value;}return out;}

function packScores(scores){
 const parts=Array.from({length:180},(_,i)=>scores?.[i]?Number(scores[i]).toString(36):'');
 if(parts.every(x=>!x))return '';
 const sparse=parts.join('.'),dense='~'+parts.map(x=>x.padStart(4,'0')).join('');
 return sparse.length<=dense.length?sparse:dense;
}
function unpackScores(raw){
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))return sanitizeLegacyBests(raw);
 let values=[];
 if(typeof raw==='string'&&/^~[0-9a-z]{720}$/.test(raw))values=raw.slice(1).match(/.{4}/g).map(x=>parseInt(x,36));
 else if(typeof raw==='string')values=raw.split('.').map(x=>/^[0-9a-z]{1,4}$/.test(x)?parseInt(x,36):0);
 else if(Array.isArray(raw))values=raw;
 return sanitizeLegacyBests(Object.fromEntries(values.slice(0,180).map((v,i)=>[i,v])));
}
function prismPairs(d){const pairs=[];for(let i=0;i<d.prism.length;i++){const to=d.prism[i];if(i!==to&&!pairs.some(([a,b])=>a===to&&b===i))pairs.push([i,to]);}return pairs;}
function stopEnergyFx(){if(energyFx){cancelAnimationFrame(energyFx.raf);energyFx.svg.remove();energyFx=null;}}
function activateConstellation(before){
 if(reducedMotion()||!puzzleState||before.stage!==puzzleState.stage)return;
 const c=currentConfig(),indices=puzzleState.b.flatMap((b,i)=>E.goalMet(c,puzzleState,i)&&!E.goalMet(c,before,i)?[i]:[]);if(!indices.length)return;
 stopEnergyFx();const box=el.board.getBoundingClientRect(),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('activation-network');svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);svg.setAttribute('aria-hidden','true');
 const cx=box.width/2,cy=box.height/2,points=[];
 for(const i of indices){const r=el.board.querySelector(`[data-index="${i}"]`).getBoundingClientRect(),x=r.x-box.x+r.width/2,y=r.y-box.y+r.height/2;const circle=document.createElementNS(svg.namespaceURI,'circle');circle.setAttribute('r','4');circle.setAttribute('fill','#e4efb6');svg.append(circle);points.push({circle,x,y});}
 el.board.append(svg);energyFx={svg,raf:0};const start=performance.now();
 const tick=now=>{const p=Math.min(1,(now-start)/660);if(!energyFx||energyFx.svg!==svg)return;if(document.hidden||lifecyclePaused){stopEnergyFx();return;}if(p>=1){stopEnergyFx();return;}for(const o of points){o.circle.setAttribute('cx',o.x+(cx-o.x)*p);o.circle.setAttribute('cy',o.y+(cy-o.y)*p);o.circle.setAttribute('opacity',String(Math.sin(p*Math.PI)));}energyFx.raf=requestAnimationFrame(tick);};energyFx.raf=requestAnimationFrame(tick);
}
function decorateWin(){
 document.getElementById('ritualReward')?.remove();el.winCard.classList.toggle('grand-finale',currentLevel===179);el.winCard.classList.toggle('chapter-finale',(currentLevel+1)%10===0);
 if((currentLevel+1)%10!==0)return;
 const reward=makeNode('div','ritual-reward');reward.id='ritualReward';reward.setAttribute('aria-hidden','true');
 const image=new Image();image.src=ART.thumb(chapterIndex(currentLevel));image.alt='';image.width=400;image.height=250;reward.append(image);
 if(currentLevel<179)reward.append(makeNode('p','chapter-unlock-copy',`Открыто созвездие ${chapterIndex(currentLevel)+1}. Далее: ${CHAPTERS[chapterIndex(currentLevel)+1]?.name||'мастерство'}.`));
 if(currentLevel===179){const steps=makeNode('div','final-steps');for(const mark of ['Ⅰ','Ⅱ','Ⅲ','Ⅳ'])steps.append(makeNode('span','',mark+' ✓'));reward.append(steps);}
 el.winCard.insertBefore(reward,el.winCard.firstChild);
}

      let vkBridge = window.vkBridge;
      async function initVKBridge() {
  if (!vkBridge || typeof vkBridge.send !== 'function') {
    try {
      await withTimeout(new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.async=true;
        script.src='https://unpkg.com/@vkontakte/vk-bridge@2.15.11/dist/browser.min.js';
        script.onload=resolve;script.onerror=reject;document.head.append(script);
      }),4500,'bridge-load');
      vkBridge=window.vkBridge;
    } catch (_) { return false; }
  }
  if(!vkBridge||typeof vkBridge.send!=='function')return false;
  try { await withTimeout(vkBridge.send('VKWebAppInit'), 4500, 'init'); return true; }
  catch (_) { return false; }
}


      
      const COLORS = [
        '#ff5f70',
        '#6ca8ff',
        '#55d98b',
        '#ffd15c',
        '#b57cff',
        '#ff8a55',
        '#43d7d1'
      ];
      const COLOR_NAMES = ['красный', 'синий', 'зелёный', 'жёлтый', 'фиолетовый', 'оранжевый', 'бирюзовый'];

      const LEVEL_DATA = window.STAR_LEVEL_DATA;
      if (!Array.isArray(LEVEL_DATA) || LEVEL_DATA.length < 10) {
        throw new Error('Atlas levels are unavailable');
      }
      const LEVELS = LEVEL_DATA.map(level => level.b);
      const CHAPTERS=SPECTRAL_CHAPTERS.map(([name,brief],i)=>({name,brief,accent:["#eac789","#96d8d8","#d5a7cc","#b3d693","#efbe8a","#a1bce8"][i%6]}));
      const CHAPTER_REQUIRED = [15,16,18,19,20,21,22,24,26,26,27,27,28,28,29,29,30];
      const chapterIndex = index => Math.min(17, Math.floor(index / 10));
      const chapterFor = index => CHAPTERS[chapterIndex(index)];
      
      
      
      
      
      
      const bottleAtGoal=(i,b)=>!!puzzleState&&E.goalMet(currentConfig(),puzzleState,i);

      const el = {
        app: document.getElementById('app'),
        menuScreen: document.getElementById('menuScreen'),
        levelsScreen: document.getElementById('levelsScreen'),
        shopScreen: document.getElementById('shopScreen'),
        labScreen: document.getElementById('labScreen'),
        gameScreen: document.getElementById('gameScreen'),
        playBtn: document.getElementById('playBtn'),
        levelsBtn: document.getElementById('levelsBtn'),
        shopBtn: document.getElementById('shopBtn'),
        labBtn: document.getElementById('labBtn'),
        labBackBtn: document.getElementById('labBackBtn'),
        labCoins: document.getElementById('labCoins'),
        labBalanceText: document.getElementById('labBalanceText'),
        labScene: document.getElementById('labScene'),
        labRoomName: document.getElementById('labRoomName'),
        labRoomProgress: document.getElementById('labRoomProgress'),
        labRoomSteps: document.getElementById('labRoomSteps'),
        labRoomNext: document.getElementById('labRoomNext'),
        labRoomUpgradeBtn: document.getElementById('labRoomUpgradeBtn'),
        labPreviewBtn: document.getElementById('labPreviewBtn'),
        labMasteryName: document.getElementById('labMasteryName'),
        labMasteryText: document.getElementById('labMasteryText'),
        labMasteryBar: document.getElementById('labMasteryBar'),
        labProjectGrid: document.getElementById('labProjectGrid'),
        labPaletteGrid: document.getElementById('labPaletteGrid'),
        labFocusTitle: document.getElementById('labFocusTitle'),
        labFocusNote: document.getElementById('labFocusNote'),
        labUpgradeBtn: document.getElementById('labUpgradeBtn'),
        achievementGrid: document.getElementById('achievementGrid'),
        menuSoundBtn: document.getElementById('menuSoundBtn'),
        menuMusicBtn: document.getElementById('menuMusicBtn'),
        levelsBackBtn: document.getElementById('levelsBackBtn'),
        shopBackBtn: document.getElementById('shopBackBtn'),
        menuCoins: document.getElementById('menuCoins'),
        menuStars: document.getElementById('menuStars'),
        levelsStars: document.getElementById('levelsStars'),
        menuMusicModeSelect: document.getElementById('menuMusicModeSelect'),
        gameMusicModeSelect: document.getElementById('gameMusicModeSelect'),
        levelsCoins: document.getElementById('levelsCoins'),
        shopCoins: document.getElementById('shopCoins'),
        levelsProgressText: document.getElementById('levelsProgressText'),
        levelsProgressFill: document.getElementById('levelsProgressFill'),
        levelGrid: document.getElementById('levelGrid'),
        themeShopGrid: document.getElementById('themeShopGrid'),
        glassShopGrid: document.getElementById('glassShopGrid'),
        menuBtn: document.getElementById('menuBtn'),
        soundBtn: document.getElementById('soundBtn'),
        musicBtn: document.getElementById('musicBtn'),
        undoBtn: document.getElementById('undoBtn'),
        restartBtn: document.getElementById('restartBtn'),
        board: document.getElementById('board'),
        levelNumber: document.getElementById('levelNumber'),
        movesCount: document.getElementById('movesCount'),
        budgetText: document.getElementById('budgetText'),
        completedCount: document.getElementById('completedCount'),
        chapterTitle: document.getElementById('chapterTitle'),
        missionText: document.getElementById('missionText'),
        beaconTrail: document.getElementById('beaconTrail'),
        coinsCount: document.getElementById('coinsCount'),
        hintBtn: document.getElementById('hintBtn'),
        extraBottleBtn: document.getElementById('extraBottleBtn'),
        hint: document.getElementById('hint'),
        winModal: document.getElementById('winModal'),
        limitModal: document.getElementById('limitModal'),
        limitUndo: document.getElementById('limitUndo'),
        limitRestart: document.getElementById('limitRestart'),
        limitAd: document.getElementById('limitAd'),
        limitDescription: document.getElementById('limitDescription'),
        winText: document.getElementById('winText'),
        winStars: document.getElementById('winStars'),
        winMoves: document.getElementById('winMoves'),
        winBest: document.getElementById('winBest'),
        winRecord: document.getElementById('winRecord'),
        winReward: document.getElementById('winReward'),
        winCard: document.querySelector('.win-card'),
        replayBtn: document.getElementById('replayBtn'),
        nextBtn: document.getElementById('nextBtn'),
        toast: document.getElementById('toast')
      };

      function safeStorageGet(key) {
        try {
          return localStorage.getItem(key);
        } catch (_) {
          return null;
        }
      }

      function safeStorageSet(key, value) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (_) {
          return false;
        }
      }

      function safeStorageRemove(key) {
        try {
          localStorage.removeItem(key);
          return true;
        } catch (_) {
          return false;
        }
      }

      const savedLevel = Number(safeStorageGet('atlasLevelV2') || 0);
      let currentLevel = Number.isInteger(savedLevel) ? Math.max(0, Math.min(savedLevel, LEVELS.length - 1)) : 0;
      let bottles = [];
      let selected = null;
      let history = [];
      let moves = 0;
      let bonusMoves = 0;
      let bonusUsed = false;
      let usedAssist = false;
      let locked = false;
      const legacySoundOn = safeStorageGet('colorSortSound') !== 'off';
      let sfxOn = safeStorageGet('colorSortSfx') == null ? legacySoundOn : safeStorageGet('colorSortSfx') !== 'off';
      let musicOn = safeStorageGet('colorSortMusic') == null ? legacySoundOn : safeStorageGet('colorSortMusic') !== 'off';
      let musicMode = ['all', '0', '1', '2', '3'].includes(safeStorageGet('atlasMusicMode')) ? safeStorageGet('atlasMusicMode') : 'all';
      let coins = (() => {
        const raw = safeStorageGet('colorSortCoins');
        if (raw == null) return 60;
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0 ? value : 60;
      })();
      function readStoredArray(key, fallback = []) {
        try {
          const value = JSON.parse(safeStorageGet(key) || 'null');
          return Array.isArray(value) ? value : fallback;
        } catch (_) {
          return fallback;
        }
      }

      function readStoredObject(key) {
        try {
          const value = JSON.parse(safeStorageGet(key) || 'null');
          return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        } catch (_) {
          return null;
        }
      }

      function getUnlockedIndex() {
        const value = Number(safeStorageGet('atlasUnlockedV2'));
        return Number.isFinite(value) ? Math.max(0, Math.min(Math.floor(value), LEVELS.length - 1)) : 0;
      }

      let completedLevels = new Set(readStoredArray('atlasCompletedV2', []).filter(level => Number.isInteger(level) && level >= 0 && level < LEVELS.length));
      let earnedStars = Object.fromEntries(Object.entries(readStoredObject('atlasStarsV2') || {})
        .filter(([key, count]) => Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < LEVELS.length && Number.isInteger(count) && count >= 1 && count <= 3));
      for (const index of completedLevels) earnedStars[index] ||= 1;
      const savedPermits = safeStorageGet('atlasChapterPermitsV3');
      const previousAccess = Array.from({ length: 17 }, (_, index) => index + 1)
        .filter(chapter => getUnlockedIndex() >= chapter * 10);
      let chapterPermits = new Set((savedPermits === null ? previousAccess : readStoredArray('atlasChapterPermitsV3'))
        .filter(value => Number.isInteger(value) && value >= 1 && value <= 17));
      const chapterStars = chapter => Array.from({ length: 10 }, (_, offset) => earnedStars[chapter * 10 + offset] || 0)
        .reduce((sum, value) => sum + value, 0);
      const chapterRequired = chapter => chapter > 0 ? CHAPTER_REQUIRED[chapter - 1] : 0;
      const chapterGateOpen = chapter => chapter === 0 || chapterPermits.has(chapter) ||
        chapterStars(chapter - 1) >= chapterRequired(chapter);
      const canEnterLevel = index => index >= 0 && index < LEVELS.length &&
        index <= getUnlockedIndex() && chapterGateOpen(chapterIndex(index));

      const THEME_ITEMS = [
        { id: 'observatory', name: 'Обсерватория', price: 0, desc: 'Авторское звёздное озеро и сияющий атлас.', preview: 'linear-gradient(rgba(4,10,22,.12),rgba(4,10,22,.28)), url("assets/themes/observatory-landscape.webp") center / cover no-repeat' },
        { id: 'midnight', name: 'Ночная долина', price: 0, desc: 'Классическая тёмно-синяя тема.', preview: 'linear-gradient(rgba(4,10,22,.12),rgba(4,10,22,.28)), url("assets/previews/night.webp") center / cover no-repeat' },
        { id: 'meadow', name: 'Зелёные холмы', price: 120, desc: 'Тёплая пасторальная зелёная тема.', preview: 'linear-gradient(rgba(3,15,11,.10),rgba(3,15,11,.24)), url("assets/previews/green.webp") center / cover no-repeat' },
        { id: 'sunset', name: 'Закат', price: 165, desc: 'Мягкие бордовые и золотые оттенки.', preview: 'linear-gradient(rgba(24,7,22,.08),rgba(24,7,22,.23)), url("assets/previews/sunset.webp") center / cover no-repeat' },
        { id: 'amethyst', name: 'Аметист', price: 220, desc: 'Глубокий фиолетовый фэнтези-фон.', preview: 'linear-gradient(rgba(18,7,40,.08),rgba(18,7,40,.23)), url("assets/previews/amethyst.webp") center / cover no-repeat' },
        { id: 'labview', name: 'Звёздная лаборатория', price: 280, desc: 'Твой восстановленный интерьер прямо во время игры.', preview: 'linear-gradient(rgba(3,12,27,.18),rgba(4,12,27,.36)), url("assets/lab/lab-landscape.webp") center / cover no-repeat' }
      ];
      const GLASS_ITEMS = [
        { id: 'ice', name: 'Ледяное стекло', price: 0, desc: 'Чистое холодное стекло.', glass: 'rgba(232,245,255,.82)' },
        { id: 'gold', name: 'Золотое стекло', price: 90, desc: 'Тёплый золотистый контур.', glass: 'rgba(255,232,171,.86)' },
        { id: 'rose', name: 'Розовое стекло', price: 120, desc: 'Мягкий розовый отблеск.', glass: 'rgba(255,213,232,.84)' },
        { id: 'mint', name: 'Мятное стекло', price: 145, desc: 'Светлый изумрудный оттенок.', glass: 'rgba(210,255,239,.86)' },
        { id: 'obsidian', name: 'Обсидиан', price: 190, desc: 'Контрастное стекло с тёмным ободком.', glass: 'rgba(178,202,255,.92)' },
        { id: 'sapphire', name: 'Сапфир', price: 210, desc: 'Холодный синий хрусталь.', glass: 'rgba(137,202,255,.96)' },
        { id: 'amber', name: 'Янтарь', price: 195, desc: 'Медовое стекло и золото.', glass: 'rgba(255,214,142,.95)' },
        { id: 'opal', name: 'Опал', price: 235, desc: 'Жемчужные переливы.', glass: 'rgba(230,250,255,.94)' },
        { id: 'aurora', name: 'Стекло авроры', price: 0, starRequired: 45, desc: 'Откроется за 45 звёзд мастерства.', glass: 'rgba(150,255,239,.94)' },
        { id: 'comet', name: 'Кометное стекло', price: 0, starRequired: 120, desc: 'Откроется за 120 звёзд мастерства.', glass: 'rgba(255,204,255,.96)' },
        { id: 'starlight', name: 'Звёздное стекло', price: 0, starRequired: 240, desc: 'Откроется за 240 звёзд мастерства.', glass: 'rgba(255,236,155,.97)' }
      ];
      const VALID_THEMES = new Set(THEME_ITEMS.map(item => item.id));
      const VALID_GLASS = new Set(GLASS_ITEMS.map(item => item.id));
      let ownedThemes = new Set(readStoredArray('colorSortOwnedThemes', ['midnight','observatory']).filter(id => VALID_THEMES.has(id)));
      let ownedGlass = new Set(readStoredArray('colorSortOwnedGlass', ['ice']).filter(id => VALID_GLASS.has(id)));
      ownedThemes.add('midnight');
      ownedThemes.add('observatory');
      ownedGlass.add('ice');
      const LAB_STATIONS = [
        { id: 'prism', name: 'Спектральная призма', steps: ['Поставить призму на стол: появляется первый луч.', 'Добавить грани: луч становится ярче и цветнее.', 'Настроить спектр: сияние оживляет всю установку.'], costs: [6, 12, 20], symbol: '◇' },
        { id: 'furnace', name: 'Алхимическая реторта', steps: ['Установить реторту и колбы с реактивами.', 'Запустить нагрев и движение цветной жидкости.', 'Зажечь печь и настроить полный химический цикл.'], costs: [8, 14, 24], symbol: '✦' },
        { id: 'archive', name: 'Атлас открытий', steps: ['Открыть старый атлас и поставить образцы.', 'Подсветить найденные цвета и страницы.', 'Оживить звёздные записи и редкие кристаллы.'], costs: [5, 11, 18], symbol: '▣' },
        { id: 'orrery', name: 'Модель созвездий', steps: ['Установить бронзовую звёздную модель.', 'Добавить цветные орбиты и огни.', 'Запустить движение и сияние планет.'], costs: [10, 18, 27], symbol: '◉' }
      ];
      const LAB_ROOM = {
        names: ['Заброшенная мастерская', 'Убрали пыль', 'Вернули жизнь', 'Лаборатория света', 'Великая лаборатория'],
        steps: ['Убрать паутину, вымыть окно и старый стол.', 'Починить стены, вернуть свет фонарям и открыть звёздный вид.', 'Настроить переливы цвета и подсветку всего помещения.', 'Запустить сердце лаборатории: украсить зал кристаллами и зажечь полярное сияние.'],
        costs: [8, 18, 32, 62]
      };
      const LAB_PROJECTS = [
        { id:'window', name:'Витражи', asset:'assets/lab/window.webp', costs:[9,16], rooms:[1,2], stars:[24,70],
          steps:['Установить первые цветные стёкла у окна.', 'Наполнить витражи звёздным светом.'] },
        { id:'alchemy', name:'Химический контур', asset:'assets/lab/alchemy.webp', costs:[14,18], rooms:[1,2], stars:[45,115],
          steps:['Собрать трубки и колбы с реагентами.', 'Зажечь непрерывное переливание реактивов.'] },
        { id:'cabinet', name:'Шкаф образцов', asset:'assets/lab/cabinet.webp', costs:[16,22], rooms:[2,3], stars:[80,165],
          steps:['Принести шкаф редких кристаллов.', 'Собрать коллекцию сияющих образцов.'] },
        { id:'garden', name:'Кристальный сад', asset:'assets/lab/garden.webp', costs:[18,26], rooms:[2,3], stars:[115,235],
          steps:['Посадить первые светящиеся растения.', 'Вырастить цветущий стеклянный сад.'] },
        { id:'chimes', name:'Небесные подвески', asset:'assets/lab/chimes.webp', costs:[22,28], rooms:[3,3], stars:[170,320],
          steps:['Подвесить золотые кольца и звёзды.', 'Наполнить свод сияющими кристаллами.'] },
        { id:'projector', name:'Проектор неба', asset:'assets/lab/projector.webp', costs:[26,32], rooms:[3,3], stars:[225,420],
          steps:['Поставить звёздный проектор.', 'Зажечь вокруг зала живые созвездия.'] }
      ];
      const LAB_PALETTES = [
        { id:'cyan', name:'Лазурь', color:'#69dfff', stars:0 },
        { id:'sapphire', name:'Сапфир', color:'#82aaff', stars:12 },
        { id:'amber', name:'Янтарь', color:'#ffbe74', stars:24 },
        { id:'coral', name:'Коралл', color:'#ff9f8a', stars:36 },
        { id:'violet', name:'Аметист', color:'#bd9eff', stars:50 },
        { id:'indigo', name:'Индиго', color:'#8189e9', stars:70 },
        { id:'mint', name:'Мята', color:'#8eebbf', stars:90 },
        { id:'jade', name:'Нефрит', color:'#65d0aa', stars:120 },
        { id:'rose', name:'Роза', color:'#ffadcf', stars:150 },
        { id:'moon', name:'Луна', color:'#dfe9ff', stars:180 },
        { id:'rainbow', name:'Спектр', color:'#ffe49a', stars:240 },
        { id:'aurora', name:'Аврора', color:'#63dbe2', stars:300 }
      ];
      let labColor = LAB_PALETTES.some(item => item.id === safeStorageGet('atlasLabColorV3'))
        ? safeStorageGet('atlasLabColorV3') : 'cyan';
      const storedLab = readStoredObject('atlasLabV3') || {};
      let labUpgrades = Object.fromEntries(LAB_STATIONS.map(station => [station.id,
        Math.max(0, Math.min(3, Math.floor(Number(storedLab[station.id]) || 0)))]));
      for (const project of LAB_PROJECTS) labUpgrades[project.id] = Math.max(0, Math.min(2, Math.floor(Number(storedLab[project.id]) || 0)));
      labUpgrades.room = Math.max(0, Math.min(4, Math.floor(Number(storedLab.room) || 0)));
      if (labUpgrades.room === 4 && (!LAB_STATIONS.every(station => labUpgrades[station.id] === 3) ||
        !LAB_PROJECTS.every(project => labUpgrades[project.id] === 2))) labUpgrades.room = 3;
      let claimedAchievements = new Set(readStoredArray('atlasAchievementsV3').filter(id => typeof id === 'string'));
      const labSpent = upgrades => LAB_STATIONS.reduce((sum, station) =>
        sum + station.costs.slice(0, upgrades[station.id] || 0).reduce((a, b) => a + b, 0), 0)
        + LAB_PROJECTS.reduce((sum, project) => sum + project.costs.slice(0, upgrades[project.id] || 0).reduce((a,b) => a+b, 0), 0)
        + LAB_ROOM.costs.slice(0, upgrades.room || 0).reduce((a, b) => a + b, 0);
      if (labSpent(labUpgrades) > Object.values(earnedStars).reduce((a,b) => a+b, 0)) {
        labUpgrades = Object.fromEntries([...LAB_STATIONS.map(station => [station.id, 0]), ...LAB_PROJECTS.map(project => [project.id,0]), ['room', 0]]);
      }
      const labBalance = () => Math.max(0, starTotal() - labSpent(labUpgrades));
      const starTotal = () => Object.values(earnedStars).reduce((sum, count) => sum + count, 0);
      const labMasteryCount = () => (labUpgrades.room || 0) + LAB_STATIONS.reduce((sum, station) => sum + (labUpgrades[station.id] || 0), 0)
        + LAB_PROJECTS.reduce((sum, project) => sum + (labUpgrades[project.id] || 0), 0);
      const labCanPrestige = () => LAB_STATIONS.every(station => labUpgrades[station.id] === 3)
        && LAB_PROJECTS.every(project => labUpgrades[project.id] === 2);
      function unlockStarGlass() {
        const total = starTotal();
        const unlocked = [];
        for (const item of GLASS_ITEMS) {
          if (item.starRequired && total >= item.starRequired && !ownedGlass.has(item.id)) {
            ownedGlass.add(item.id);
            unlocked.push(item.name);
          }
        }
        return unlocked;
      }
      unlockStarGlass();
      const ACHIEVEMENTS = [
        { id: 'first_light', name: 'Первый свет', desc: 'Пройди первый уровень.', done: () => completedLevels.size >= 1 },
        { id: 'perfect', name: 'Чистый маршрут', desc: 'Заверши любой уровень на три звезды.', done: () => Object.values(earnedStars).some(value => value === 3) },
        { id: 'first_gate', name: 'Новая дверь', desc: 'Открой вторую главу.', done: () => chapterGateOpen(1) },
        { id: 'ten', name: 'Десять маяков', desc: 'Пройди десять уровней.', done: () => completedLevels.size >= 10 },
        { id: 'fortyfive', name: 'Ремесленник', desc: 'Набери 45 звёзд.', done: () => starTotal() >= 45 },
        { id: 'lab', name: 'Алхимик', desc: 'Улучши любой прибор до третьей ступени.', done: () => LAB_STATIONS.some(station => labUpgrades[station.id] >= 3) },
        { id: 'restored', name: 'Новая жизнь', desc: 'Почини комнату и верни ей цвет.', done: () => labUpgrades.room >= 3 },
        { id: 'first_project', name: 'Новый угол', desc: 'Собери первое улучшение интерьера.', done: () => LAB_PROJECTS.some(project => labUpgrades[project.id] >= 1) },
        { id: 'three_projects', name: 'Дело мастера', desc: 'Заверши три проекта интерьера.', done: () => LAB_PROJECTS.filter(project => labUpgrades[project.id] === 2).length >= 3 },
        { id: 'all_projects', name: 'Зал открытий', desc: 'Начни все шесть проектов интерьера.', done: () => LAB_PROJECTS.every(project => labUpgrades[project.id] >= 1) },
        { id: 'grand_lab', name: 'Великая лаборатория', desc: 'Заверши все 28 улучшений.', done: () => labUpgrades.room === 4 && labMasteryCount() === 28 },
        { id: 'fifty', name: 'Большой маршрут', desc: 'Пройди 50 уровней.', done: () => completedLevels.size >= 50 },
        { id: 'hundred', name: 'Звёздная сотня', desc: 'Набери 100 звёзд.', done: () => starTotal() >= 100 },
        { id: 'ten_perfect', name: 'Мастер точности', desc: 'Пройди 10 уровней на три звезды.', done: () => Object.values(earnedStars).filter(value => value === 3).length >= 10 },
        { id: 'hundred_levels', name: 'Картограф', desc: 'Пройди 100 уровней.', done: () => completedLevels.size >= 100 },
        { id: 'final_gate', name: 'Все двери', desc: 'Открой 18-ю главу.', done: () => chapterGateOpen(17) },
        { id: 'atlas', name: 'Атлас зажжён', desc: 'Пройди все 180 уровней.', done: () => completedLevels.size === 180 }
      ];
      claimedAchievements = new Set([...claimedAchievements].filter(id => ACHIEVEMENTS.some(item => item.id === id)));
      let equippedTheme = VALID_THEMES.has(safeStorageGet('colorSortEquippedTheme')) ? safeStorageGet('colorSortEquippedTheme') : 'observatory';
      let equippedGlass = VALID_GLASS.has(safeStorageGet('colorSortEquippedGlass')) ? safeStorageGet('colorSortEquippedGlass') : 'ice';
      let hintMove = null;
      let hintTimer = null;
      let completionFeedbackIndex = null;
      let audioCtx = null;
      let toastTimer = null;
      let activePourEngine = null;
      let winFxRaf = 0;
      let winFxCanvas = null;

      let systemAudioPaused = false;
      let resumeMusicAfterSystemPause = false;
      const audioPauseReasons = new Set();
      const lifecyclePauseReasons = new Set();
      let lifecyclePaused = false;
      let vkLifecycleSubscribed = false;
      let audioMaster = null;
      const activeAudioSources = new Set();
      
      const LEVEL_REWARD = 25;
      const INTERSTITIAL_MIN_INTERVAL = 90000;
      const AD_CHECK_TIMEOUT = 5000;
      const AD_SHOW_TIMEOUT = 120000;
      let adBusy = false;
      let rewardAvailable = false;
      let rewardCheckPending = false;

      function readSessionNumber(key) {
        try {
          const value = Number(sessionStorage.getItem(key));
          return Number.isFinite(value) && value >= 0 ? value : 0;
        } catch (_) {
          return 0;
        }
      }

      function writeSessionNumber(key, value) {
        try { sessionStorage.setItem(key, String(value)); } catch (_) {}
      }

      let lastInterstitialAt = readSessionNumber('colorSortLastInterstitialAt');
      if (lastInterstitialAt > Date.now()) lastInterstitialAt = 0;
      let levelsSinceInterstitial = Math.floor(readSessionNumber('colorSortLevelsSinceInterstitial'));
      let musicBus = null;
      let musicReverb = null;
      let musicTimer = null;
      let musicNextNoteTime = 0;
      let musicStep = 0;
      let musicTrackIndex = musicMode === 'all' ? 0 : Number(musicMode);
      let fluteWave = null;

      // Оригинальная пасторальная fantasy-тема: спокойный 6/8, деревянная флейта
      // и очень тихие щипковые аккорды. Мелодия не копирует музыку из фильмов.
      const MUSIC_BPM = 78;
      const MUSIC_BEAT = 60 / MUSIC_BPM;
      const PASTORAL_MELODY = [
        [71, 1, [55,59,62]], [74, .5], [79, 1.5], [78, .5], [76, .5], [74, 1], [71, 1.5], [69, .5],
        [67, 1, [48,55,60]], [69, .5], [71, .5], [74, 1.5], [76, .5], [74, 1], [71, .5], [69, .5], [67, 1.5], [null, .5],
        [74, 1, [50,57,62]], [76, .5], [78, .5], [81, 1.5], [79, .5], [78, 1], [74, .5], [71, .5], [69, 1.5], [null, .5],
        [71, 1, [52,59,64]], [74, .5], [76, 1], [74, .5], [71, 1], [69, .5], [67, .5], [69, 1], [71, .5], [67, 2], [null, 1]
      ];
      // Four original short themes are synthesized locally. In 'all' mode the
      // next theme starts only when the previous melody reaches its ending.
      const MUSIC_TRACKS = [
        { name: 'Долина', bpm: 78, kind: 'flute', notes: PASTORAL_MELODY },
        { name: 'Озеро', bpm: 68, kind: 'bell', notes: [
          [69,1,[45,52,57]],[72,.5],[76,1.5],[72,1],[69,1],[67,.5],[69,.5],[72,2],[null,1],
          [72,1,[41,48,53]],[76,.5],[77,1.5],[76,1],[72,1],[69,.5],[67,.5],[69,2],[null,1],
          [67,1,[48,55,60]],[72,.5],[76,1.5],[79,1],[76,1],[72,.5],[69,.5],[67,2],[null,1],
          [71,1,[43,50,55]],[74,.5],[79,1.5],[76,1],[74,1],[71,.5],[69,.5],[72,2],[null,1]
        ] },
        { name: 'Звёзды', bpm: 82, kind: 'flute', notes: [
          [74,1,[50,57,62]],[77,.5],[81,.5],[84,1],[81,1],[79,.5],[77,.5],[74,2],[null,.5],
          [77,1,[46,53,58]],[81,.5],[82,.5],[86,1],[84,1],[82,.5],[81,.5],[77,2],[null,.5],
          [72,1,[41,48,53]],[77,.5],[81,.5],[84,1],[81,1],[77,.5],[76,.5],[72,2],[null,.5],
          [76,1,[48,55,60]],[79,.5],[84,.5],[83,1],[79,1],[76,.5],[74,.5],[77,2],[null,1]
        ] },
        { name: 'Рассвет', bpm: 94, kind: 'bell', notes: [
          [67,1,[43,50,55]],[71,.5],[74,.5],[79,1],[78,.5],[76,.5],[74,1],[71,1],[74,1],[null,.5],
          [64,1,[40,47,52]],[67,.5],[71,.5],[76,1],[74,.5],[71,.5],[67,1],[71,1],[76,1],[null,.5],
          [60,1,[48,55,60]],[64,.5],[67,.5],[72,1],[76,.5],[79,.5],[76,1],[72,1],[67,1],[null,.5],
          [62,1,[50,57,62]],[66,.5],[69,.5],[74,1],[78,.5],[81,.5],[79,1],[74,1],[67,2],[null,1]
        ] }
      ];

      function isValidRunState(run) {
  if (!run || run.v !== 5 || !Number.isInteger(run.level) || !LEVEL_DATA[run.level] || !E.validState(LEVEL_DATA[run.level], run.state)) return false;
  if (![0,2].includes(run.bonusMoves) || !Number.isInteger(run.moves) || run.moves < 0 || run.moves > LEVEL_DATA[run.level].m + run.bonusMoves) return false;
  if (!Number.isInteger(run.totalHints) || run.totalHints < 0 || run.totalHints > 5 || !Number.isInteger(run.paidHints) || run.paidHints < 0 || run.paidHints > 3 || run.paidHints > run.totalHints) return false;
  if(typeof run.usedAssist!=='boolean'||typeof run.bonusUsed!=='boolean')return false;
  if((run.totalHints>0||run.bonusMoves>0||run.bonusUsed)&&!run.usedAssist)return false;
  if(run.bonusMoves>0&&!run.bonusUsed)return false;
  return true;
}

      function getRunSnapshot() {
  if (puzzleState && bottles.length) {
    if (isWin()) return null;
    return {v:5,level:currentLevel,state:E.clone(puzzleState),moves,bonusMoves,bonusUsed,usedAssist,totalHints,paidHints};
  }
  const stored = readStoredObject('atlasRunV5');
  return isValidRunState(stored) ? stored : null;
}

      function continueGame() {
  if (!canEnterLevel(currentLevel)) { showLevelSelect(); return; }
  const run = readStoredObject('atlasRunV5');
  if (!isValidRunState(run) || run.level !== currentLevel || E.solved(LEVEL_DATA[run.level],run.state)) { initLevel(currentLevel); return; }
  cancelHintSearch(); cleanupPourEngine(); stopWinEffects(); closeWinModal();
  attemptId++; currentLevel=run.level; puzzleState=E.clone(run.state); bottles=puzzleState.b;
  moves=run.moves; bonusMoves=run.bonusMoves; bonusUsed=!!run.bonusUsed||bonusMoves>0;
  totalHints=run.totalHints; paidHints=run.paidHints;
  usedAssist=!!run.usedAssist||bonusUsed||totalHints>0; 
  selected=null; hintMove=null; history=[]; locked=false;
  updateMenuProgress(); render(); showGame(); if (remainingMoves()===0) showLimit();
}

      const VK_SAVE_KEY = 'color_sort_atlas_v5';
      const R12_VK_SAVE_KEY='color_sort_atlas_v4';
      const PREVIOUS_VK_SAVE_KEY = 'color_sort_atlas_v3';
      const V2_VK_SAVE_KEY='color_sort_atlas_v2';
      const LEGACY_VK_SAVE_KEY = 'color_sort_save_v1';
      const SAVE_VERSION = 5;
      let vkBridgeReady = false;
      let persistenceReady = false;
      let persistenceRevision = 0;
      let cloudSaveTimer = 0;
      let pendingCloudSnapshot = null;
      let cloudSaveChain = Promise.resolve();

      function collectBestScores() {
        const bests = {};
        for (let index = 0; index < LEVELS.length; index++) {
          const value = Number(safeStorageGet(`atlasBestV4_${index}`) || 0);
          if (Number.isInteger(value) && value > 0 && value <= 1000000) bests[index] = value;
        }
        return bests;
      }

      function buildProgressSnapshot(updatedAt = Date.now()) {
        return {
          v: SAVE_VERSION,
          updatedAt,
          level: currentLevel,
          coins,
          completed: [...completedLevels],
          unlocked: getUnlockedIndex(),
          run: getRunSnapshot(),
          ownedThemes: [...ownedThemes],
          ownedGlass: [...ownedGlass],
          equippedTheme,
          equippedGlass,
          sfxOn,
          musicOn,
          musicMode,
          stars: earnedStars,
          chapterPermits: [...chapterPermits],
          lab: labUpgrades,
          labColor,
          claimedAchievements: [...claimedAchievements],
          legacyBests: readStoredObject("atlasLegacyBestV3") || {},
          legacyR12Bests: readStoredObject("atlasLegacyBestV4") || {},
          bests: collectBestScores()
        };
      }

      function normalizeProgressSnapshot(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        if ([3,4,5].includes(raw.v) && raw.z === 1) {
          const compact = raw;
          const starDigits = typeof compact.st === 'string' && new RegExp('^[0-3]{'+LEVELS.length+'}$').test(compact.st) ? compact.st : '0'.repeat(LEVELS.length);
          raw = {
            v: compact.v, updatedAt: compact.u, level: compact.l, coins: compact.n,
            completed: [...starDigits].flatMap((digit,index) => digit === '0' ? [] : [index]),
            unlocked: compact.ul, run: compact.r, ownedThemes: compact.th,
            ownedGlass: compact.gl, equippedTheme: compact.et, equippedGlass: compact.eg,
            sfxOn: compact.sf, musicOn: compact.mf, musicMode: compact.mm,
            stars: Object.fromEntries([...starDigits].flatMap((digit,index) => digit === '0' ? [] : [[index,Number(digit)]])),
            bests: unpackScores(compact.bs),
            legacyBests: unpackScores(compact.lbs), legacyR12Bests: unpackScores(compact.r12bs), chapterPermits: compact.cp, lab: compact.lb, labColor: compact.lc, claimedAchievements: compact.ac
          };
        }
        const sourceVersion = Number(raw.v);
        if (![2,3,4,5].includes(sourceVersion)) return null;
        const level = Number(raw.level);
        const coinsValue = Number(raw.coins);
        const unlockedValue = Number(raw.unlocked);
        if (!Number.isInteger(level) || level < 0 || level >= LEVELS.length) return null;
        if (!Number.isFinite(coinsValue) || coinsValue < 0 || coinsValue > 1000000000) return null;

        const completed = Array.isArray(raw.completed)
          ? [...new Set(raw.completed.filter(value => Number.isInteger(value) && value >= 0 && value < LEVELS.length))]
          : [];
        const ownedThemeList = Array.isArray(raw.ownedThemes) ? raw.ownedThemes.filter(id => VALID_THEMES.has(id)) : [];
        const ownedGlassList = Array.isArray(raw.ownedGlass) ? raw.ownedGlass.filter(id => VALID_GLASS.has(id)) : [];
        if (!ownedThemeList.includes('midnight')) ownedThemeList.push('midnight');
        if (!ownedThemeList.includes('observatory')) ownedThemeList.push('observatory');
        if (!ownedGlassList.includes('ice')) ownedGlassList.push('ice');
        const theme = ownedThemeList.includes(raw.equippedTheme) ? raw.equippedTheme : 'observatory';
        const glass = ownedGlassList.includes(raw.equippedGlass) ? raw.equippedGlass : 'ice';
        const run = isValidRunState(raw.run) && !stateIsSolved(raw.run.state, raw.run.level) ? raw.run : null;
        const bests = {};
        const stars = {};
        if (raw.stars && typeof raw.stars === 'object' && !Array.isArray(raw.stars)) {
          for (const [key, count] of Object.entries(raw.stars)) {
            const index = Number(key);
            if (Number.isInteger(index) && index >= 0 && index < LEVELS.length &&
                Number.isInteger(count) && count >= 1 && count <= 3 && completed.includes(index)) stars[index] = count;
          }
        }
        for (const index of completed) stars[index] ||= 1;
        const totalStars = Object.values(stars).reduce((sum, count) => sum + count, 0);
        for (const item of GLASS_ITEMS) {
          if (item.starRequired && totalStars >= item.starRequired && !ownedGlassList.includes(item.id)) ownedGlassList.push(item.id);
        }
        if (sourceVersion>=4 && raw.bests && typeof raw.bests === 'object' && !Array.isArray(raw.bests)) {
          for (const [key, value] of Object.entries(raw.bests)) {
            const index = Number(key);
            const movesValue = Number(value);
            if (Number.isInteger(index) && index >= 0 && index < LEVELS.length && Number.isInteger(movesValue) && movesValue > 0 && movesValue <= 1000000) {
              if(sourceVersion>=5||!REVISED_LEVELS.has(index)) bests[index] = movesValue;
            }
          }
        }
        const completedUnlock = completed.length ? Math.min(Math.max(...completed) + 1, LEVELS.length - 1) : 0;
        const normalizedUnlocked = Number.isFinite(unlockedValue) ? Math.max(0, Math.min(Math.floor(unlockedValue), LEVELS.length - 1)) : 0;
        const unlocked = Math.max(level, completedUnlock, normalizedUnlocked);
        const permitted = sourceVersion < 4
          ? Array.from({ length: 17 }, (_, index) => index + 1).filter(chapter => unlocked >= chapter * 10)
          : (Array.isArray(raw.chapterPermits) ? raw.chapterPermits : [])
            .filter(chapter => Number.isInteger(chapter) && chapter >= 1 && chapter <= 17);
        let lab = Object.fromEntries(LAB_STATIONS.map(station => [station.id,
          Math.max(0, Math.min(3, Math.floor(Number(raw.lab?.[station.id]) || 0)))]));
        for (const project of LAB_PROJECTS) lab[project.id] = Math.max(0, Math.min(2, Math.floor(Number(raw.lab?.[project.id]) || 0)));
        lab.room = Math.max(0, Math.min(4, Math.floor(Number(raw.lab?.room) || 0)));
        if (lab.room === 4 && (!LAB_STATIONS.every(station => lab[station.id] === 3) ||
          !LAB_PROJECTS.every(project => lab[project.id] === 2))) lab.room = 3;
        if (labSpent(lab) > totalStars) lab = Object.fromEntries([...LAB_STATIONS.map(station => [station.id, 0]), ...LAB_PROJECTS.map(project => [project.id,0]), ['room', 0]]);
        const claimedAchievementsList = Array.isArray(raw.claimedAchievements)
          ? [...new Set(raw.claimedAchievements.filter(id => ACHIEVEMENTS.some(item => item.id === id)))] : [];
        return {
          v: SAVE_VERSION,
          updatedAt: Number.isFinite(Number(raw.updatedAt)) && Number(raw.updatedAt) > 0 ? Math.floor(Number(raw.updatedAt)) : 0,
          level,
          coins: Math.floor(coinsValue),
          completed,
          unlocked,
          run,
          ownedThemes: [...new Set(ownedThemeList)],
          ownedGlass: [...new Set(ownedGlassList)],
          equippedTheme: theme,
          equippedGlass: glass,
          sfxOn: raw.sfxOn !== false,
          musicOn: raw.musicOn !== false,
          musicMode: ['all', '0', '1', '2', '3'].includes(raw.musicMode) ? raw.musicMode : 'all',
          stars,
          chapterPermits: [...new Set([...permitted,...(Array.isArray(raw.chapterPermits)?raw.chapterPermits.filter(x=>Number.isInteger(x)&&x>=1&&x<=17):[])])],
          lab,
          labColor: LAB_PALETTES.some(item => item.id === raw.labColor && totalStars >= item.stars) ? raw.labColor : 'cyan',
          claimedAchievements: claimedAchievementsList,
          legacyBests: sanitizeLegacyBests(sourceVersion<4 ? raw.bests : raw.legacyBests),
          legacyR12Bests: sanitizeLegacyBests(sourceVersion===4 ?
            {...raw.legacyR12Bests,...Object.fromEntries(Object.entries(raw.bests||{}).filter(([k])=>REVISED_LEVELS.has(Number(k))))} : raw.legacyR12Bests),
          bests
        };
      }

      function writeSnapshotToLocal(snapshot) {
        safeStorageSet('atlasSaveVersion', '5');
        safeStorageSet('atlasLegacyBestV3',JSON.stringify(snapshot.legacyBests||{}));
        safeStorageSet('atlasLegacyBestV4',JSON.stringify(snapshot.legacyR12Bests||{}));
        safeStorageSet('atlasLevelV2', String(snapshot.level));
        safeStorageSet('colorSortCoins', String(snapshot.coins));
        safeStorageSet('atlasCompletedV2', JSON.stringify(snapshot.completed));
        if (snapshot.run) safeStorageSet('atlasRunV5', JSON.stringify(snapshot.run));
        else safeStorageRemove('atlasRunV5');
        safeStorageSet('colorSortOwnedThemes', JSON.stringify(snapshot.ownedThemes));
        safeStorageSet('colorSortOwnedGlass', JSON.stringify(snapshot.ownedGlass));
        safeStorageSet('colorSortEquippedTheme', snapshot.equippedTheme);
        safeStorageSet('colorSortEquippedGlass', snapshot.equippedGlass);
        safeStorageSet('colorSortSfx', snapshot.sfxOn ? 'on' : 'off');
        safeStorageSet('colorSortMusic', snapshot.musicOn ? 'on' : 'off');
        safeStorageSet('atlasMusicMode', snapshot.musicMode);
        safeStorageSet('atlasStarsV2', JSON.stringify(snapshot.stars));
        safeStorageSet('atlasChapterPermitsV3', JSON.stringify(snapshot.chapterPermits));
        safeStorageSet('atlasLabV3', JSON.stringify(snapshot.lab));
        safeStorageSet('atlasLabColorV3', snapshot.labColor);
        safeStorageSet('atlasAchievementsV3', JSON.stringify(snapshot.claimedAchievements));
        safeStorageSet('atlasUnlockedV2', String(snapshot.unlocked));
        safeStorageSet('atlasUpdatedAtV2', String(snapshot.updatedAt));
        for (let index = 0; index < LEVELS.length; index++) {
          const value = snapshot.bests[index];
          if (value) safeStorageSet(`atlasBestV4_${index}`, String(value));
          else safeStorageRemove(`atlasBestV4_${index}`);
        }
      }

      function applyProgressSnapshot(snapshot) {
        cleanupPourEngine();cancelHintSearch();attemptId++;locked=false;
        currentLevel = snapshot.level;
        coins = snapshot.coins;
        completedLevels = new Set(snapshot.completed);
        ownedThemes = new Set(snapshot.ownedThemes);
        ownedGlass = new Set(snapshot.ownedGlass);
        ownedThemes.add('midnight');
        ownedThemes.add('observatory');
        ownedGlass.add('ice');
        equippedTheme = snapshot.equippedTheme;
        equippedGlass = snapshot.equippedGlass;
        sfxOn = snapshot.sfxOn;
        musicOn = snapshot.musicOn;
        musicMode = snapshot.musicMode;
        musicTrackIndex = musicMode === 'all' ? 0 : Number(musicMode);
        earnedStars = snapshot.stars;
        chapterPermits = new Set(snapshot.chapterPermits);
        labUpgrades = snapshot.lab;
        labColor = snapshot.labColor;
        claimedAchievements = new Set(snapshot.claimedAchievements);
        unlockStarGlass();
        puzzleState=null;totalHints=0;paidHints=0;
        bottles = [];
        selected = null;
        history = [];
        moves = 0;
        bonusMoves = 0;
        bonusUsed = false;
        usedAssist = false;
        locked = false;
        writeSnapshotToLocal(snapshot);
        applyCosmetics();
        syncAudioButtons();
        updateMenuProgress();
      }

      function commitCloudSnapshot(snapshot) {
        if (!snapshot || !vkBridgeReady) return cloudSaveChain;
        cloudSaveChain = cloudSaveChain
          .catch(() => {})
          .then(() => withTimeout(vkBridge.send('VKWebAppStorageSet', { key: VK_SAVE_KEY, value: JSON.stringify({
            v: SAVE_VERSION, z: 1, u: snapshot.updatedAt, l: snapshot.level, n: snapshot.coins,
            ul: snapshot.unlocked, r: snapshot.run, th: snapshot.ownedThemes, gl: snapshot.ownedGlass,
            et: snapshot.equippedTheme, eg: snapshot.equippedGlass, sf: snapshot.sfxOn,
            mf: snapshot.musicOn, mm: snapshot.musicMode,
            st: Array.from({ length: LEVELS.length }, (_,index) => snapshot.stars[index] || 0).join(''),
            bs: packScores(snapshot.bests),
            lbs:packScores(snapshot.legacyBests), r12bs:packScores(snapshot.legacyR12Bests), cp: snapshot.chapterPermits, lb: snapshot.lab, lc: snapshot.labColor, ac: snapshot.claimedAchievements
          }) }),4500,"cloud-save"))
          .catch(error => console.warn('VK Storage save failed; local save remains active:', error));
        return cloudSaveChain;
      }

      function flushCloudSave() {
        clearTimeout(cloudSaveTimer);
        cloudSaveTimer = 0;
        const next = pendingCloudSnapshot;
        pendingCloudSnapshot = null;
        return next ? commitCloudSnapshot(next) : cloudSaveChain;
      }

      function scheduleCloudSave(snapshot) {
        if (!persistenceReady || !vkBridgeReady) return;
        pendingCloudSnapshot = snapshot;
        clearTimeout(cloudSaveTimer);
        cloudSaveTimer = setTimeout(() => { void flushCloudSave(); }, 450);
      }

      function persistLocalProgress() {
        persistenceRevision++;
        const snapshot = normalizeProgressSnapshot(buildProgressSnapshot());
        if (!snapshot) return;
        writeSnapshotToLocal(snapshot);
        scheduleCloudSave(snapshot);
      }

      async function loadVKSnapshot() {
        if (!vkBridgeReady) return null;
        try {
          const response = await withTimeout(vkBridge.send('VKWebAppStorageGet', { keys: [VK_SAVE_KEY, R12_VK_SAVE_KEY, PREVIOUS_VK_SAVE_KEY,V2_VK_SAVE_KEY, LEGACY_VK_SAVE_KEY] }),4500,'cloud-load');
          const rows = response && Array.isArray(response.keys) ? response.keys : [];
          const candidates=[];
          for (const key of [VK_SAVE_KEY, R12_VK_SAVE_KEY, PREVIOUS_VK_SAVE_KEY,V2_VK_SAVE_KEY]) {
            const row = rows.find(item => item && item.key === key && item.value);
            if (!row) continue;
            try {
              const parsed = normalizeProgressSnapshot(JSON.parse(row.value));
              if (parsed) candidates.push(parsed);
            } catch (error) { console.warn(`VK Storage ${key} is unreadable:`, error); }
          }
          // Carry currency and cosmetics from the previous game, but certify all redesigned levels anew.
          if(candidates.length)return candidates.sort((a,b)=>b.updatedAt-a.updatedAt)[0];
          const legacy = rows.find(item => item && item.key === LEGACY_VK_SAVE_KEY && item.value);
          if (!legacy) return null;
          const old = JSON.parse(legacy.value);
          if (!old || old.v !== 1) return null;
          return normalizeProgressSnapshot({
            v: SAVE_VERSION, updatedAt: Number(old.updatedAt) || 0, level: 0,
            unlocked: 0, completed: [], run: null, bests: {}, coins: old.coins,
            ownedThemes: old.ownedThemes, ownedGlass: old.ownedGlass,
            equippedTheme: old.equippedTheme, equippedGlass: old.equippedGlass,
            sfxOn: old.sfxOn, musicOn: old.musicOn
          });
        } catch (error) {
          console.warn('VK Storage load failed; local save will be used:', error);
          return null;
        }
      }

      async function initializePersistence() {
        const initialRevision = persistenceRevision;
        const localUpdatedAt = Number(safeStorageGet('atlasUpdatedAtV2') || 0);
        let localSnapshot = normalizeProgressSnapshot(buildProgressSnapshot(Number.isFinite(localUpdatedAt) ? localUpdatedAt : 0));
        vkBridgeReady = await initVKBridge();
        if (vkBridgeReady) bindVKLifecycle();
        const cloudSnapshot = await loadVKSnapshot();

        // Если игрок успел сделать действие во время сетевого чтения, перечитываем свежий local snapshot.
        if (persistenceRevision !== initialRevision) {
          const changedAt = Number(safeStorageGet('atlasUpdatedAtV2') || Date.now());
          localSnapshot = normalizeProgressSnapshot(buildProgressSnapshot(changedAt));
        }

        let selectedSnapshot = localSnapshot;
        if (cloudSnapshot && (!localSnapshot || cloudSnapshot.updatedAt > localSnapshot.updatedAt)) {
          selectedSnapshot = cloudSnapshot;
        }
        if (!selectedSnapshot) selectedSnapshot = normalizeProgressSnapshot(buildProgressSnapshot(Date.now()));
        if (!selectedSnapshot) return;
        if (!selectedSnapshot.updatedAt) selectedSnapshot.updatedAt = Date.now();

        applyProgressSnapshot(selectedSnapshot);
        persistenceReady = true;
        if (!el.gameScreen.classList.contains('hidden')) continueGame();
        else if (!el.levelsScreen.classList.contains('hidden')) renderLevelSelect();
        else if (!el.shopScreen.classList.contains('hidden')) renderShop();
        else if (!el.labScreen.classList.contains('hidden')) renderLab();

        // Облако отсутствует или отстаёт: синхронизируем его с более свежим локальным прогрессом.
        if (vkBridgeReady && (!cloudSnapshot || selectedSnapshot.updatedAt > cloudSnapshot.updatedAt)) {
          scheduleCloudSave(selectedSnapshot);
        }
        if (!el.gameScreen.classList.contains('hidden')) void refreshRewardAvailability();
      }

      function registerAudioSource(source) {
        if (!source) return source;
        activeAudioSources.add(source);
        source.addEventListener('ended', () => activeAudioSources.delete(source), { once: true });
        return source;
      }

      function hardPauseAudio(reason = 'system') {
        const wasPaused = audioPauseReasons.size > 0;
        audioPauseReasons.add(reason);
        if (wasPaused) {
          systemAudioPaused = true;
          return;
        }

        resumeMusicAfterSystemPause = Boolean(musicTimer);
        systemAudioPaused = true;

        if (musicTimer) {
          clearInterval(musicTimer);
          musicTimer = null;
        }
        musicStep = 0;

        // Мгновенно закрываем общий аудиоканал, без fade-out.
        if (audioCtx && audioMaster) {
          const now = audioCtx.currentTime;
          audioMaster.gain.cancelScheduledValues(now);
          audioMaster.gain.setValueAtTime(0, now);
        }

        // Останавливаем уже запущенные и заранее запланированные ноты/эффекты,
        // чтобы после возврата на вкладку не доигрывался старый звук.
        for (const source of activeAudioSources) {
          try { source.stop(); } catch (_) {}
        }
        activeAudioSources.clear();

        if (audioCtx && audioCtx.state === 'running') {
          audioCtx.suspend().catch(() => {});
        }
      }

      function resumeSystemAudio(reason = 'system') {
        audioPauseReasons.delete(reason);
        if (audioPauseReasons.size > 0 || !systemAudioPaused) return;
        if (document.hidden) return;

        systemAudioPaused = false;
        const shouldResumeMusic = resumeMusicAfterSystemPause && musicOn;
        resumeMusicAfterSystemPause = false;

        if (!audioCtx) {
          if (shouldResumeMusic) startBackgroundMusic();
          return;
        }

        const restore = () => {
          if (audioMaster) {
            const now = audioCtx.currentTime;
            audioMaster.gain.cancelScheduledValues(now);
            audioMaster.gain.setValueAtTime(1, now);
          }
          if (shouldResumeMusic && !document.hidden) startBackgroundMusic();
        };

        if (audioCtx.state === 'suspended') {
          audioCtx.resume().then(restore).catch(() => {});
        } else {
          restore();
        }
      }

      function pauseAudio(reason = 'system') {
        hardPauseAudio(reason);
      }

      function resumeAudio(reason = 'system') {
        resumeSystemAudio(reason);
      }

      function isInteractionBlocked() {
        return adBusy || lifecyclePaused;
      }

      function syncInteractionState() {
        const blocked = isInteractionBlocked();
        el.app.style.pointerEvents = blocked ? 'none' : '';
        el.app.toggleAttribute('inert', blocked);
        el.app.setAttribute('aria-busy', blocked ? 'true' : 'false');
        el.app.dataset.lifecyclePaused = lifecyclePaused ? 'true' : 'false';
        document.body.classList.toggle('page-hidden',lifecyclePaused);ART?.refresh();
        el.nextBtn.disabled = blocked;
        el.replayBtn.disabled = blocked;
      }

      function pauseLifecycle(reason) {
        stopEnergyFx();
        const firstPause = lifecyclePauseReasons.size === 0;
        lifecyclePauseReasons.add(reason);
        lifecyclePaused = true;
        pauseAudio(`lifecycle:${reason}`);
        syncInteractionState();

        if (!firstPause) return;
        if (activePourEngine) {
          cleanupPourEngine();
          locked = false;
          selected = null;
          if (!el.gameScreen.classList.contains('hidden')) render();
        }
        stopWinEffects();
        if (persistenceReady) {
          persistLocalProgress();
          void flushCloudSave();
        }
      }

      function resumeLifecycle(reason) {
        lifecyclePauseReasons.delete(reason);
        lifecyclePaused = lifecyclePauseReasons.size > 0;
        resumeAudio(`lifecycle:${reason}`);
        syncInteractionState();
        if (lifecyclePaused || document.hidden) return;
        if (!el.gameScreen.classList.contains('hidden')) render();
      }

      function handleVKLifecycleEvent(event) {
        const type = event && event.detail && event.detail.type;
        if (type === 'VKWebAppViewHide') pauseLifecycle('vk-view');
        if (type === 'VKWebAppViewRestore') resumeLifecycle('vk-view');
      }

      function bindVKLifecycle() {
        if (vkLifecycleSubscribed || !vkBridgeReady || !vkBridge || typeof vkBridge.subscribe !== 'function') return;
        vkBridge.subscribe(handleVKLifecycleEvent);
        vkLifecycleSubscribed = true;
      }

      

      

      

      

      

      function prefersReducedMotion() {
        return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      }

      function closeWinModal() {
        clearTimeout(winRevealTimer);winRevealTimer=0;
        el.winModal.classList.add('hidden');
        el.limitModal.classList.add('hidden');
        el.gameScreen.removeAttribute('inert');
      }

      function showLimit() {
  if(isWin()||remainingMoves()>0||!el.limitModal.classList.contains('hidden'))return;
  el.limitUndo.disabled=!history.length;
  el.limitAd.hidden=bonusUsed;
  el.limitDescription.textContent='Лимит ходов исчерпан. Отмена возвращает поле, но не ходы. Начать заново можно бесплатно. Реклама даёт +2 хода один раз; максимум за попытку — ★★.';
  el.limitModal.classList.remove('hidden');el.gameScreen.setAttribute('inert','');
  requestAnimationFrame(()=>el.limitRestart.focus({preventScroll:true}));
}

      function initLevel(index,preserveMenu=false) {
  if (!canEnterLevel(index)) { showLevelSelect(); showToast('Сначала открой главу звёздами предыдущих уровней'); return; }
  cancelHintSearch(); cleanupPourEngine(); stopWinEffects(); closeWinModal();
  attemptId++; currentLevel=Math.max(0,Math.min(index,LEVELS.length-1));
  puzzleState=E.initial(LEVEL_DATA[currentLevel]); bottles=puzzleState.b;
  selected=null; hintMove=null; clearTimeout(hintTimer); completionFeedbackIndex=null;
  history=[]; moves=0; bonusMoves=0; bonusUsed=false; usedAssist=false; 
  totalHints=0; paidHints=0; locked=false;
  persistLocalProgress(); updateMenuProgress(); render(); if(!preserveMenu)showGame();
}

      function cleanupPourEngine() {
  if (!activePourEngine) return;
  if(activePourEngine.raf)cancelAnimationFrame(activePourEngine.raf);
  activePourEngine.root?.remove(); activePourEngine.clone?.remove();
  activePourEngine.sourceEl?.classList.remove('in-transit');
  activePourEngine.targetEl?.classList.remove('receiving');
  for(const pair of activePourEngine.previewNodes||[])if(pair.node.isConnected)pair.node.replaceWith(pair.original);
  if(activePourEngine.deviceEl)activePourEngine.deviceEl.style.transform='';
  el.board.classList.remove('device-action');el.board.style.removeProperty('--device-turn');
  activePourEngine=null;
}

      function hidePrimaryScreens() {
        applyCosmetics();
        el.menuScreen.classList.add('hidden');
        el.levelsScreen.classList.add('hidden');
        el.shopScreen.classList.add('hidden');
        el.labScreen.classList.add('hidden');
        el.gameScreen.classList.add('hidden');
      }

      function applyCosmetics() {
        document.body.dataset.theme = equippedTheme;
        document.body.dataset.glass = equippedGlass;
        document.body.dataset.labRoom = String(labUpgrades.room || 0);
        document.body.style.setProperty('--chapter-color', chapterFor(currentLevel).accent);
      }

      function previewShopItem(type, id) {
        if (type === 'theme' && VALID_THEMES.has(id)) document.body.dataset.theme = id;
        if (type === 'glass' && VALID_GLASS.has(id)) document.body.dataset.glass = id;
      }

      function pulseShopCard(type, id) {
        requestAnimationFrame(() => {
          const card = Array.from(document.querySelectorAll('.shop-card')).find(node =>
            node.dataset.shopType === type && node.dataset.shopId === id
          );
          if (!card) return;
          card.classList.remove('shop-confirm');
          void card.offsetWidth;
          card.classList.add('shop-confirm');
        });
      }


      function createUiIcon(name, className = '') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `ui-icon${className ? ` ${className}` : ''}`);
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', `#icon-${name}`);
        svg.appendChild(use);
        return svg;
      }

      function createCoinImage(className = '') {
        const img = document.createElement('img');
        img.src = new URL('assets/ui/coin-24.png',document.baseURI).href;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        img.className = `coin-art${className ? ` ${className}` : ''}`;
        img.width = 24;
        img.height = 24;
        return img;
      }

      function setIconButton(button, iconName) {
        if (!button) return;
        button.replaceChildren(createUiIcon(iconName));
      }

      function setIconLabel(target, iconName, text) {
        if (!target) return;
        target.replaceChildren(createUiIcon(iconName), document.createTextNode(text));
        target.classList.add('icon-label');
      }

      function setCoinDisplay(target, value, prefix = '') {
        if (!target) return;
        target.replaceChildren(document.createTextNode(`${prefix}${value}`), createCoinImage());
      }

      function setShopButtonContent(button, state) {
        button.replaceChildren();
        if (state.icon === 'coin-buy') button.appendChild(createCoinImage());
        else if (state.icon) button.appendChild(createUiIcon(state.icon));
        button.appendChild(document.createTextNode(state.text));
      }

      function updateCoinDisplays() {
        setCoinDisplay(el.coinsCount, coins);
        setCoinDisplay(el.menuCoins, coins);
        setCoinDisplay(el.levelsCoins, coins);
        setCoinDisplay(el.shopCoins, coins);
        setCoinDisplay(el.labCoins, coins);
      }

      let selectedLabStation = 'prism';
      let labPreviewRoom = false;
      function renderAchievements() {
        el.achievementGrid.replaceChildren();
        for (const item of ACHIEVEMENTS) {
          const card = document.createElement('div');
          card.className = `achievement-card${item.done() ? ' done' : ''}`;
          const heading = document.createElement('strong');
          heading.textContent = `${item.done() ? '✦' : '◇'} ${item.name}`;
          const description = document.createElement('span');
          description.textContent = item.desc;
          card.append(heading, description);
          if (item.done() && !claimedAchievements.has(item.id)) {
            const claim = document.createElement('button');
            claim.textContent = 'Получить +30 монет';
            claim.setAttribute('aria-label', `${item.name}: получить 30 монет`);
            claim.addEventListener('click', () => claimAchievement(item.id));
            card.appendChild(claim);
          } else {
            const status = document.createElement('span');
            status.textContent = claimedAchievements.has(item.id) ? 'Награда получена' : 'Пока не выполнено';
            card.appendChild(status);
          }
          el.achievementGrid.appendChild(card);
        }
      }

      function renderLab() {
        ART?.laboratory(labMasteryCount(),labUpgrades);
        const room = labUpgrades.room || 0;
        const viewRoom = Math.min(4, room + (labPreviewRoom && room < 4 ? 1 : 0));
        const color = LAB_PALETTES.find(item => item.id === labColor) || LAB_PALETTES[0];
        const mastered = labMasteryCount();
        const projectSteps = LAB_PROJECTS.reduce((sum, item) => sum + (labUpgrades[item.id] || 0), 0);
        el.labBalanceText.textContent = `Свободно ${labBalance()} ✦ · накоплено ${starTotal()} ✦`;
        el.labRoomName.textContent = `${LAB_ROOM.names[viewRoom]}${labPreviewRoom ? ' · предпросмотр' : ''}`;
        el.labRoomProgress.textContent = `Помещение ${room}/4`;
        el.labRoomSteps.textContent = Array.from({length:4}, (_, index) => index < room ? '✦' : '◇').join('  ');
        el.labRoomSteps.setAttribute('aria-label', `Завершено этапов помещения: ${room} из 4`);
        const prestigeLocked = room === 3 && !labCanPrestige();
        el.labRoomNext.textContent = room < 4 ? `Следующее изменение: ${LAB_ROOM.steps[room]}${prestigeLocked ? ' Для финального этапа закончи четыре прибора и шесть проектов.' : ''}`
          : 'Зал преобразился полностью. Все 28 улучшений завершены — это вершина пути мастера.';
        el.labRoomUpgradeBtn.textContent = room < 4 ? `${room === 3 ? 'Зажечь сердце' : 'Восстановить'} · ${LAB_ROOM.costs[room]} ✦` : 'Лаборатория завершена';
        el.labRoomUpgradeBtn.disabled = room >= 4 || prestigeLocked || labBalance() < LAB_ROOM.costs[room];
        el.labRoomUpgradeBtn.title = prestigeLocked ? 'Сначала заверши все четыре прибора и шесть проектов' : room < 4 && labBalance() < LAB_ROOM.costs[room]
          ? `Нужно ещё ${LAB_ROOM.costs[room] - labBalance()} звёздной энергии` : '';
        el.labPreviewBtn.disabled = room >= 4;
        el.labPreviewBtn.textContent = labPreviewRoom ? 'Вернуть текущий вид' : 'Посмотреть после ремонта';
        el.labPreviewBtn.setAttribute('aria-pressed', String(labPreviewRoom));
        el.labScene.dataset.room = String(viewRoom);
        el.labScene.classList.toggle('is-preview', labPreviewRoom);
        el.labScene.style.setProperty('--lab-accent', color.color);
        el.labScene.style.setProperty('--prestige-mix', String(Math.min(.77, projectSteps / 12 * .77)));
        el.labScene.dataset.palette = color.id;
        el.labScene.setAttribute('aria-label', `${LAB_ROOM.names[viewRoom]}, ${labPreviewRoom ? 'предпросмотр следующего этапа' : 'текущее состояние'}`);
        el.labScene.querySelectorAll('.lab-marker').forEach(button => {
          const project = LAB_PROJECTS.find(item => item.id === button.dataset.project);
          const tier = labUpgrades[project.id] || 0;
          button.dataset.tier = String(tier);
          button.hidden = tier === 0;
          button.setAttribute('aria-label', `${project.name}, ступень ${tier} из 2. Перейти к улучшению.`);
        });
        el.labMasteryName.textContent = mastered === 28 ? 'Великая лаборатория' : mastered >= 20 ? 'Кристальная лаборатория'
          : mastered >= 12 ? 'Живая лаборатория' : mastered >= 4 ? 'Мастерская исследователя' : 'Путь мастера';
        el.labMasteryText.textContent = `${mastered}/28 улучшений · вложено ${labSpent(labUpgrades)}/540 ✦`;
        el.labMasteryBar.value = mastered;
        el.labScene.querySelectorAll('.lab-station').forEach(button => {
          const id = button.dataset.station;
          const station = LAB_STATIONS.find(item => item.id === id);
          const tier = labUpgrades[id] || 0;
          button.dataset.tier = String(tier);
          button.classList.toggle('active', id === selectedLabStation);
          button.setAttribute('aria-label', `${station.name}, улучшение ${tier} из 3`);
          button.setAttribute('aria-pressed', String(id === selectedLabStation));
        });
        const station = LAB_STATIONS.find(item => item.id === selectedLabStation) || LAB_STATIONS[0];
        const tier = labUpgrades[station.id] || 0;
        const cost = station.costs[tier];
        el.labFocusTitle.textContent = `${station.symbol} ${station.name} · ступень ${tier}/3`;
        const roomReady = room >= tier + 1;
        el.labFocusNote.textContent = cost ? `${station.steps[tier]}${roomReady ? '' : ` Сначала восстанови помещение до ${tier + 1}/3.`}`
          : 'Прибор полностью собран и освещает лабораторию.';
        el.labUpgradeBtn.textContent = cost ? tier === 0 ? `Установить · ${cost} ✦` : `Улучшить · ${cost} ✦` : 'Прибор готов';
        el.labUpgradeBtn.disabled = !cost || !roomReady || labBalance() < cost;
        el.labUpgradeBtn.title = cost && !roomReady ? `Сначала восстанови помещение до ${tier + 1}/3`
          : cost && labBalance() < cost ? `Нужно ещё ${cost - labBalance()} звёздной энергии` : '';
        el.labProjectGrid.replaceChildren();
        for (const project of LAB_PROJECTS) {
          const tier = labUpgrades[project.id] || 0;
          const card = document.createElement('article');
          card.className = `lab-project-card${tier === 2 ? ' complete' : ''}`;
          card.dataset.project = project.id;
          const picture = document.createElement('img');
          picture.src = project.asset;
          picture.alt = '';
          picture.loading = 'lazy';
          const copy = document.createElement('div');
          const title = document.createElement('strong');
          title.textContent = project.name;
          const stage = document.createElement('span');
          stage.className = 'lab-project-stage';
          stage.textContent = `Ступень ${tier}/2`;
          const description = document.createElement('p');
          description.textContent = tier < 2 ? project.steps[tier] : 'Установка собрана и меняет облик зала.';
          copy.append(title, stage, description);
          const action = document.createElement('button');
          action.className = 'small-btn primary';
          action.type = 'button';
          if (tier < 2) {
            const needRoom = project.rooms[tier], needStars = project.stars[tier], price = project.costs[tier];
            const reason = room < needRoom ? `Комната ${needRoom}/4` : starTotal() < needStars ? `Накопи ${needStars} ✦` : labBalance() < price ? `Нужно ещё ${price - labBalance()} ✦` : '';
            action.textContent = reason || `${tier ? 'Развить' : 'Установить'} · ${price} ✦`;
            action.disabled = Boolean(reason);
            action.title = reason ? `${project.name}: ${reason}` : '';
            if (!reason) action.addEventListener('click', () => upgradeLabProject(project.id));
          } else {
            action.textContent = 'Готово · 2/2';
            action.disabled = true;
          }
          card.append(picture, copy, action);
          el.labProjectGrid.appendChild(card);
        }
        el.labPaletteGrid.replaceChildren();
        for (const palette of LAB_PALETTES) {
          const chip = document.createElement('button');
          const open = starTotal() >= palette.stars;
          chip.type = 'button';
          chip.className = `lab-palette-chip${palette.id === labColor ? ' selected' : ''}`;
          chip.style.setProperty('--chip-color', palette.color);
          chip.textContent = open ? palette.name : `${palette.name} · ${palette.stars} ✦`;
          chip.disabled = !open;
          chip.setAttribute('aria-label', open ? `Цвет освещения: ${palette.name}` : `${palette.name}: откроется за ${palette.stars} звёзд`);
          chip.setAttribute('aria-pressed', String(open && palette.id === labColor));
          if (open) chip.addEventListener('click', () => {
            if (labColor === palette.id) return;
            labColor = palette.id;
            persistLocalProgress();
            renderLab();
            showToast(`Цвет света: ${palette.name}`);
          });
          el.labPaletteGrid.appendChild(chip);
        }
        updateCoinDisplays();
        renderAchievements();
      }

      function inspectLabStation(id) {
        if (!LAB_STATIONS.some(station => station.id === id)) return;
        selectedLabStation = id;
        renderLab();
        if (!prefersReducedMotion()) {
          el.labScene.classList.remove('lab-pulse');
          void el.labScene.offsetWidth;
          el.labScene.classList.add('lab-pulse');
        }
        playTone(450 + (LAB_STATIONS.findIndex(station => station.id === id) * 110), .11, .025);
      }

      function upgradeLabStation() {
        const station = LAB_STATIONS.find(item => item.id === selectedLabStation);
        if (!station) return;
        const tier = labUpgrades[station.id] || 0;
        const cost = station.costs[tier];
        if (!cost || (labUpgrades.room || 0) < tier + 1 || labBalance() < cost) return;
        labUpgrades[station.id] = tier + 1;
        persistLocalProgress();
        updateMenuProgress();
        inspectLabStation(station.id);
        showToast(`${station.name}: ступень ${tier + 1}`);
      }

      function previewLabRoom() {
        if ((labUpgrades.room || 0) >= 4) return;
        labPreviewRoom = !labPreviewRoom;
        renderLab();
      }

      function upgradeLabRoom() {
        if (!completedLevels.size) return;
        const tier = labUpgrades.room || 0;
        if (tier >= 4 || (tier === 3 && !labCanPrestige()) || labBalance() < LAB_ROOM.costs[tier]) return;
        labUpgrades.room = tier + 1;
        labPreviewRoom = false;
        persistLocalProgress();
        updateMenuProgress();
        applyCosmetics();
        renderLab();
        playTone(570 + tier * 140, .17, .035);
        showToast(`${LAB_ROOM.names[tier + 1]} · помещение ${tier + 1}/4`);
      }

      function upgradeLabProject(id) {
        if (!completedLevels.size) return;
        const project = LAB_PROJECTS.find(item => item.id === id);
        if (!project) return;
        const tier = labUpgrades[id] || 0;
        if (tier >= 2 || (labUpgrades.room || 0) < project.rooms[tier] || starTotal() < project.stars[tier] || labBalance() < project.costs[tier]) return;
        labUpgrades[id] = tier + 1;
        persistLocalProgress();
        updateMenuProgress();
        renderLab();
        playTone(595 + LAB_PROJECTS.findIndex(item => item.id === id) * 65, .16, .032);
        showToast(`${project.name}: ступень ${tier + 1}/2`);
      }

      function claimAchievement(id) {
        const item = ACHIEVEMENTS.find(entry => entry.id === id);
        if (!item || !item.done() || claimedAchievements.has(id)) return;
        claimedAchievements.add(id);
        coins += 30;
        persistLocalProgress();
        renderLab();
        playTone(770, .14, .028);
        showToast(`${item.name}: +30 монет`);
      }

      function showGame() {
        hidePrimaryScreens();
        el.gameScreen.classList.remove('hidden');
        ART?.scene('game',chapterIndex(currentLevel));
        startBackgroundMusic();
        void refreshRewardAvailability();
      }

      function showMenu() {
        selected = null;
        locked = false;
        cleanupPourEngine();
        stopWinEffects();
        closeWinModal();
        hidePrimaryScreens();
        el.menuScreen.classList.remove('hidden');
        ART?.scene('menu',chapterIndex(currentLevel));
        updateMenuProgress();
      }

      function showLevelSelect() {
        selected = null;
        locked = false;
        cleanupPourEngine();
        stopWinEffects();
        closeWinModal();
        hidePrimaryScreens();
        el.levelsScreen.classList.remove('hidden');
        ART?.scene('atlas',chapterIndex(currentLevel));
        renderLevelSelect();
      }

      function showShop() {
        selected = null;
        locked = false;
        cleanupPourEngine();
        stopWinEffects();
        closeWinModal();
        hidePrimaryScreens();
        el.shopScreen.classList.remove('hidden');
        ART?.scene('shop',chapterIndex(currentLevel));
        renderShop();
      }

      function showLab() {
        if (!completedLevels.size) {
          showToast('Лаборатория откроется после первого уровня');
          return;
        }
        labPreviewRoom = false;
        selected = null;
        locked = false;
        cleanupPourEngine();
        stopWinEffects();
        closeWinModal();
        hidePrimaryScreens();
        el.labScreen.classList.remove('hidden');
        ART?.scene('lab',chapterIndex(currentLevel));
        renderLab();
      }

      function updateMenuProgress() {
        const done = completedLevels.size;
        if (el.playBtn) el.playBtn.textContent = !canEnterLevel(currentLevel) ? 'К главам' :
          currentLevel === 0 && done === 0 ? 'Играть' : `Продолжить · ${currentLevel + 1}`;
        const total = starTotal();
        el.menuStars.textContent = `✦ ${total} / ${LEVELS.length * 3} звёзд`;
        el.labBtn.disabled = done === 0;
        el.labBtn.textContent = done ? `✦ Лаборатория ${labMasteryCount()}/28 · ${labBalance()} ✦` : '✦ Лаборатория откроется после первого уровня';
        const next = GLASS_ITEMS.find(item => item.starRequired && total < item.starRequired);
        el.levelsStars.textContent = `✦ ${total} / ${LEVELS.length * 3} звёзд · ${next ? `следующее стекло за ${next.starRequired}` : 'все награды мастерства открыты'}`;
        updateCoinDisplays();
      }

      function renderLevelSelect() {
  el.levelsProgressText.textContent=`Пройдено ${completedLevels.size} из ${LEVELS.length} · 18 созвездий`;
  el.levelsProgressFill.style.width=`${completedLevels.size/LEVELS.length*100}%`;
  updateCoinDisplays();el.levelGrid.replaceChildren();
  const atlas=makeNode('div','chapter-atlas');atlas.setAttribute('aria-label','Карта восстанавливаемых созвездий');
  CHAPTERS.forEach((chapter,ch)=>{
    if(ch*10>=LEVELS.length)return;
    const open=chapterGateOpen(ch),stars=chapterStars(ch),card=makeNode('button','chapter-node'+(open?'':' locked')+(stars===30?' mastered':'')+(atlasChapter===ch?' chosen':''));
    card.dataset.chapter=ch;card.dataset.stars=stars;card.style.setProperty('--chapter-color',chapter.accent);
    card.style.setProperty('--node-art',`url("${ART.thumb(ch)}")`);card.setAttribute('aria-label',`Глава ${ch+1}: ${chapter.name}. ${stars} из 30 звёзд.${open?'':' Закрыта.'}`);
    const img=new Image();img.src=`assets/art/emblem-${String(ch+1).padStart(2,'0')}.svg`;img.alt='';img.width=64;img.height=64;img.loading='lazy';
    card.append(img,makeNode('span','chapter-number',String(ch+1).padStart(2,'0')),makeNode('strong','',chapter.name),makeNode('span','',`${stars}/30 ✦ ${open?'':'· закрыто'}`));
    card.onclick=()=>{atlasChapter=ch;renderLevelSelect();document.getElementById('chapterDetails').scrollIntoView({block:'nearest',behavior:reducedMotion()?'instant':'smooth'});};atlas.append(card);
  });el.levelGrid.append(atlas);
  const detail=makeNode('section','chapter-details');detail.id='chapterDetails';const ch=atlasChapter;
  detail.append(makeNode('h2','',`${ch+1}. ${CHAPTERS[ch].name}`),makeNode('p','',CHAPTERS[ch].brief));
  if(ch&&!chapterGateOpen(ch))detail.append(makeNode('p','gate-explanation',`Для открытия: ${chapterRequired(ch)} звёзд в прошлой главе. Сейчас ${chapterStars(ch-1)}/30. Старые разрешения на главы сохранены.`));
  const grid=makeNode('div','chapter-levels');
  for(let i=ch*10;i<Math.min(ch*10+10,LEVELS.length);i++){
    const button=makeNode('button','level-tile '+LEVEL_DATA[i].x+(i===currentLevel?' current':''));button.disabled=!canEnterLevel(i);
    button.append(makeNode('strong','',String(i+1)),makeNode('span','level-stars','★'.repeat(earnedStars[i]||0)+'☆'.repeat(3-(earnedStars[i]||0))),makeNode('small','',LEVEL_DATA[i].x==='finale'?'Финал':LEVEL_DATA[i].x==='trial'?'Испытание':`Эталон ${LEVEL_DATA[i].t[0]}`));
    button.onclick=()=>initLevel(i);grid.append(button);
  }detail.append(grid);el.levelGrid.append(detail);requestAnimationFrame(()=>ART?.atlas(atlas));
}

      function shopButtonState(item, owned, equipped) {
        if (item.starRequired && starTotal() < item.starRequired) return { text: `✦ ${item.starRequired} звёзд`, icon: '', className: 'shop-buy', disabled: true };
        if (equipped) return { text: 'Выбрано', icon: 'check', className: 'shop-buy equipped', disabled: true };
        if (owned) return { text: 'Выбрать', icon: '', className: 'shop-buy', disabled: false };
        return { text: `${item.price} · Купить`, icon: 'coin-buy', className: 'shop-buy buyable', disabled: false };
      }

      function createShopCard(item, type) {
        const ownedSet = type === 'theme' ? ownedThemes : ownedGlass;
        const equipped = type === 'theme' ? equippedTheme === item.id : equippedGlass === item.id;
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.dataset.shopType = type;
        card.dataset.shopId = item.id;
        const preview = document.createElement('div');
        preview.className = 'shop-preview';
        if (type === 'theme') {
          const labPreviews = [
            'linear-gradient(rgba(3,12,27,.18),rgba(4,12,27,.36)), url("assets/lab/ruin-landscape.webp") center / cover no-repeat',
            'linear-gradient(rgba(3,12,27,.18),rgba(4,12,27,.36)), url("assets/lab/clean-landscape.webp") center / cover no-repeat',
            item.preview,
            item.preview,
            'linear-gradient(rgba(3,12,27,.12),rgba(4,12,27,.25)), url("assets/lab/prestige-landscape.webp") center / cover no-repeat'
          ];
          preview.style.background = item.id === 'labview' ? labPreviews[Math.min(4, labUpgrades.room || 0)] : item.preview;
        }
        else {
          preview.style.background = 'linear-gradient(145deg,rgba(82,108,154,.28),rgba(6,15,29,.72))';
          preview.style.setProperty('--preview-glass', item.glass);
          const glassPreview=makeNode('span','shop-glass-bottle');glassPreview.style.borderColor=item.glass;glassPreview.style.background=item.glass;preview.append(glassPreview);
        }
        const name = document.createElement('div');
        name.className = 'shop-name';
        name.textContent = item.name;
        const desc = document.createElement('div');
        desc.className = 'shop-desc';
        desc.textContent = item.desc;
        const button = document.createElement('button');
        const state = shopButtonState(item, ownedSet.has(item.id), equipped);
        button.className = state.className;
        setShopButtonContent(button, state);
        button.disabled = state.disabled;
        if (!state.disabled) button.addEventListener('click', () => buyOrEquipShopItem(type, item.id));

        const startPreview = () => {
          previewShopItem(type, item.id);
          card.classList.add('shop-previewing');
        };
        const endPreview = () => {
          card.classList.remove('shop-previewing');
          applyCosmetics();
        };
        card.addEventListener('pointerenter', event => {
          if (event.pointerType === 'mouse' || event.pointerType === 'pen') startPreview();
        });
        card.addEventListener('pointerleave', event => {
          if (event.pointerType === 'mouse' || event.pointerType === 'pen') endPreview();
        });
        card.addEventListener('focusin', startPreview);
        card.addEventListener('focusout', event => {
          if (!card.contains(event.relatedTarget)) endPreview();
        });

        card.append(preview, name, desc, button);
        return card;
      }

      function renderShop() {
        updateCoinDisplays();
        el.themeShopGrid.replaceChildren();
        el.glassShopGrid.replaceChildren();
        THEME_ITEMS.forEach(item => el.themeShopGrid.appendChild(createShopCard(item, 'theme')));
        GLASS_ITEMS.forEach(item => el.glassShopGrid.appendChild(createShopCard(item, 'glass')));
      }

      function buyOrEquipShopItem(type, id) {
        const items = type === 'theme' ? THEME_ITEMS : GLASS_ITEMS;
        const ownedSet = type === 'theme' ? ownedThemes : ownedGlass;
        const item = items.find(candidate => candidate.id === id);
        if (!item) return;

        const wasOwned = ownedSet.has(id);
        if (!wasOwned) {
          if (coins < item.price) {
            showToast(`Не хватает ${item.price - coins} монет`);
            playTone(150, .07, .025);
            return;
          }
          coins -= item.price;
          ownedSet.add(id);
          playTone(660, .08, .028);
          setTimeout(() => playTone(880, .12, .022), 80);
          showToast(`${item.name}: куплено и применено`);
        } else {
          playTone(520, .06, .022);
          showToast(`${item.name}: выбрано`);
        }

        if (type === 'theme') equippedTheme = id;
        else equippedGlass = id;
        applyCosmetics();
        persistLocalProgress();
        renderShop();
        pulseShopCard(type, id);
      }

      

      function completedCount() { return puzzleState ? puzzleState.b.filter((b,i)=>bottleAtGoal(i,b)).length : 0; }

      function isWin() { return !!puzzleState && E.solved(LEVEL_DATA[currentLevel],puzzleState); }

      

      

      

      function canPour(from,to) { return puzzleState && !E.reason(currentConfig(),puzzleState,from,to); }

      

      

      

      

      

      

      

      

      

      

      

      

      

      function describeBottle(index) {
  const c=currentConfig(), b=bottles[index], g=E.goal(c,puzzleState,index);
  return `Сосуд ${index+1}. ${c.branches?.[index]?(puzzleState.choices[index]<0?'Два рецепта: нижний слой закрепляет А или Б.':`Закреплён рецепт ${puzzleState.choices[index]?'Б':'А'}.`):''} ${deviceDescription(index)}. Снизу вверх: ${b.length?b.map(v=>COLOR_NAMES[v]).join(', '):'пусто'}. Рецепт: ${g.length?g.map(v=>COLOR_NAMES[v]).join(', '):'освободить'}.`;
}

      

      function getBottleButtons() {
        return Array.from(el.board.querySelectorAll('.bottle'));
      }

      function focusBottle(index) {
        const buttons = getBottleButtons();
        const button = buttons[index];
        if (!button || button.disabled) return false;
        button.focus({ preventScroll: true });
        return true;
      }

      function focusBottleSpatial(direction) {
        const buttons = getBottleButtons().filter(button => !button.disabled);
        if (!buttons.length) return;
        const active = document.activeElement;
        const current = active && active.classList && active.classList.contains('bottle') ? active : buttons[0];
        const a = current.getBoundingClientRect();
        const ax = a.left + a.width / 2;
        const ay = a.top + a.height / 2;
        let best = null;
        let bestScore = Infinity;
        for (const candidate of buttons) {
          if (candidate === current) continue;
          const r = candidate.getBoundingClientRect();
          const dx = r.left + r.width / 2 - ax;
          const dy = r.top + r.height / 2 - ay;
          if (direction === 'left' && dx >= -1) continue;
          if (direction === 'right' && dx <= 1) continue;
          if (direction === 'up' && dy >= -1) continue;
          if (direction === 'down' && dy <= 1) continue;
          const primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy);
          const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
          const score = primary + secondary * 2.25;
          if (score < bestScore) { bestScore = score; best = candidate; }
        }
        if (best) best.focus({ preventScroll: true });
      }

      function render() {
  stopEnergyFx();
  if(!puzzleState)return;
  const c=currentConfig(), l=LEVEL_DATA[currentLevel], chapter=chapterFor(currentLevel), disabled=locked||isInteractionBlocked()||hintPending;
  document.body.dataset.chapter=String(chapterIndex(currentLevel));
  if(!el.gameScreen.classList.contains('hidden')) ART?.scene('game',chapterIndex(currentLevel));
  document.body.dataset.stage=String(puzzleState.stage);
  document.body.dataset.challenge=l.x; document.body.classList.toggle('final-ritual',currentLevel===179);
  el.levelNumber.textContent=`${currentLevel+1} / ${LEVELS.length}`;
  el.movesCount.textContent=String(remainingMoves());
  el.budgetText.textContent=`потрачено ${moves}`;
  el.completedCount.textContent=`${completedCount()} / ${bottles.length}`;
  setCoinDisplay(el.coinsCount,coins);
  el.chapterTitle.textContent=`${String(chapterIndex(currentLevel)+1).padStart(2,'0')} / ${chapter.name}`;
  el.missionText.textContent=chapter.brief;
  el.undoBtn.disabled=disabled||!history.length;
  el.restartBtn.disabled=isInteractionBlocked()||hintPending;
  el.hintBtn.disabled=disabled||totalHints>=5||paidHints>=3||coins<HINT_PRICES[paidHints]||remainingMoves()<1||isWin();
  el.hintBtn.replaceChildren();
  el.hintBtn.append(makeNode('span','',hintPending?'Поиск…':'Подсказка'),makeNode('span','cost',paidHints<3?`${HINT_PRICES[paidHints]} монет`:'Покупки: 3/3'));
  el.extraBottleBtn.disabled=disabled||totalHints>=5||remainingMoves()<1||isWin();
  el.extraBottleBtn.title='Один доказанный ход после успешного просмотра рекламы';
  el.extraBottleBtn.replaceChildren(makeNode('span','','Реклама → подсказка'),makeNode('span','cost',`${totalHints}/5 · всего`));
  const mastery=document.getElementById('masteryText');
  mastery.textContent=`★★★ ≤ ${l.t[0]} · ★★ ≤ ${l.t[1]}\n${usedAssist?'Помощь использована: максимум ★★':'С помощью: максимум ★★'}`;
  document.getElementById('stageText').textContent=l.stages?`Этап ${puzzleState.stage+1}/${l.stages.length} · план ↗`:(l.x==='finale'?'Финал главы':l.x==='trial'?'Испытание':'Собери каждый рецепт');
  const controls=document.getElementById('deviceControls'); controls.replaceChildren();
  document.getElementById('mechanicLesson')?.remove();
  if(currentLevel%10===0&&moves===0&&safeStorageGet('atlasLessonR13_'+chapterIndex(currentLevel))!=='seen'){
    const lesson=makeNode('div','mechanic-lesson');lesson.id='mechanicLesson';
    const emblem=new Image();emblem.src=`assets/art/emblem-${String(chapterIndex(currentLevel)+1).padStart(2,'0')}.svg`;emblem.alt='';emblem.setAttribute('aria-hidden','true');lesson.append(emblem);
    const text=makeNode('div','');text.append(makeNode('strong','',chapter.name),makeNode('span','',chapter.brief));lesson.append(text);
    const close=makeNode('button','','×');close.type='button';close.setAttribute('aria-label','Понятно, закрыть правило');
    close.onclick=()=>{safeStorageSet('atlasLessonR13_'+chapterIndex(currentLevel),'seen');lesson.remove();requestAnimationFrame(drawNetwork);};lesson.append(close);
    controls.parentElement.insertBefore(lesson,controls);
  }
  if(c.switch) {const b=makeNode('button','device-control',`Переключатель ${puzzleState.sw?'Б':'А'} ↔`); b.disabled=disabled||!remainingMoves();b.onclick=()=>performAction({kind:'switch',from:-1,to:-1}); controls.append(b);}
  c.devices.forEach((d,i)=>{if(d.inverter){const b=makeNode('button','device-control',`Инвертор ${i+1} · ${puzzleState.inv}`);b.dataset.invert=String(i);b.disabled=disabled||!remainingMoves()||!E.validAction(c,puzzleState,{kind:'invert',from:i});b.onclick=()=>performAction({kind:'invert',from:i,to:-1});controls.append(b);}});
  if(c.parity){const readout=makeNode('span','phase-readout',`Фаза ${puzzleState.phase?'II · янтарь → I':'I · лазурь → II'}`);readout.dataset.phase=puzzleState.phase;controls.append(readout);}
  el.board.replaceChildren(); el.board.dataset.count=String(bottles.length); el.board.style.setProperty('--count',bottles.length);
  const network=document.createElementNS('http://www.w3.org/2000/svg','svg'); network.classList.add('route-network'); network.setAttribute('aria-hidden','true'); el.board.append(network);
  const heart=makeNode('div','atlas-heart'); heart.setAttribute('aria-hidden','true');heart.append(ART.heart(puzzleState.stage,completedCount(),bottles.length)); el.board.append(heart);
  bottles.forEach((b,i)=>{
    const d=c.devices[i]||{},button=makeNode('button','bottle '+deviceType(d)),correct=bottleAtGoal(i,b), recipient=selected!==null&&selected!==i&&canPour(selected,i);
    button.type='button'; button.dataset.index=String(i);button.dataset.capacity=String(c.caps[i]);button.style.setProperty('--slot',i);
    button.dataset.housing=currentLevel===179?'final':c.parity&&deviceType(d)==='flask'?'phase':deviceType(d);
    button.classList.toggle('branched',!!c.branches?.[i]);button.classList.toggle('branch-locked',!!c.branches?.[i]&&puzzleState.choices[i]>=0);
    button.classList.toggle('complete',correct);button.classList.toggle('selected',selected===i);button.classList.toggle('reachable',recipient);
    button.classList.toggle('sealed',!!d.seal&&!(puzzleState.open&(1<<i)));
    button.classList.toggle('hint-source',hintMove?.from===i);button.classList.toggle('hint-target',hintMove?.to===i);
    button.setAttribute('aria-label',describeBottle(i));button.setAttribute('aria-pressed',String(selected===i));button.disabled=disabled;
    const label=makeNode('span','vessel-label',`${String(i+1).padStart(2,'0')} · ${correct?'✓':'○'}`);
    const instrument=makeNode('span','instrument'); instrument.style.setProperty('--capacity',c.caps[i]);
    const neck=makeNode('span','vessel-neck');neck.textContent=deviceGlyph(d);instrument.append(neck);
    const glass=makeNode('span','vessel-glass');glass.style.setProperty('--capacity',c.caps[i]);
    const liquid=makeNode('span','liquid-stack');
    for(let j=0;j<c.caps[i];j++){const v=b[j],seg=makeNode('span','liquid-segment'+(v===undefined?' empty':''));seg.style.setProperty('--liquid',COLORS[v]||'transparent'); if(v!==undefined)seg.append(makeNode('span','spectrum-glyph',GLYPHS[v]));liquid.append(seg);}
    glass.append(liquid,makeNode('i','glass-reflection')); instrument.append(glass);
    const housing=new Image();housing.className='vessel-housing';housing.src=ART.housing(button.dataset.housing);housing.alt='';housing.setAttribute('aria-hidden','true');instrument.append(housing);
    const variants=c.branches?.[i],choice=puzzleState.choices?.[i];
    const recipes=makeNode('span','recipe-group');recipes.setAttribute('aria-hidden','true');
    (variants||[E.goal(c,puzzleState,i)]).forEach((g,branch)=>{
      const recipe=makeNode('span','recipe-strip');
      recipe.classList.toggle('chosen-recipe',!!variants&&choice===branch);
      recipe.classList.toggle('rejected-recipe',!!variants&&choice>=0&&choice!==branch);
      recipe.append(makeNode('small','',variants?(branch?'Б':'А'):'↑'));
      for(let j=c.caps[i]-1;j>=0;j--){const v=g[j],seg=makeNode('span','recipe-segment'+(b[j]===v?' matched':''));seg.style.setProperty('--liquid',COLORS[v]||'transparent');seg.textContent=v===undefined?'·':GLYPHS[v];recipe.append(seg);}
      recipe.append(makeNode('small','',variants?(choice===branch?'✓':'↑'):'Цель'));recipes.append(recipe);
    });
    instrument.append(recipes);
    const state=makeNode('span','vessel-state',c.branches?.[i]?(puzzleState.choices[i]>=0?`Рецепт ${puzzleState.choices[i]?'Б':'А'} закреплён`:'Нижний слой → А / Б'):deviceStatus(i));button.append(label,instrument,state);
    button.addEventListener('click',()=>onBottleClick(i)); el.board.append(button);
  });
  el.beaconTrail.replaceChildren();
  c.goals.forEach((g,i)=>{const star=makeNode('span',bottleAtGoal(i,bottles[i])?'beacon-dot active':'beacon-dot','✦');el.beaconTrail.append(star);});
  if(hintPending)el.hint.textContent='Проверяю путь к решению. Монеты пока не списаны.';
  else if(hintMove)el.hint.textContent=actionText(hintMove);
  else if(totalHints===5)el.hint.textContent='Подсказки 5/5. Больше помощи в этой попытке нет. Заново — бесплатно.';
  else if(selected!==null)el.hint.textContent=`Выбран сосуд ${selected+1}. Светлые линии ведут к доступным приёмникам.`;
  else el.hint.textContent= moves===0&&currentLevel<3?'Разные цвета можно переливать друг на друга. Собери порядок справа от каждого сосуда, снизу вверх.':'Выбери источник, затем приёмник. Отмена вернёт поле, но не потраченный ход.';
  requestAnimationFrame(drawNetwork);
}

      function onBottleClick(index) {
  if(locked||hintPending||isInteractionBlocked()||isWin())return;
  if(!remainingMoves()){showLimit();return;}
  if(selected===index){selected=null;render();return;}
  if(selected===null){if(!bottles[index].length){showToast('Пустой сосуд может только принимать');return;}selected=index;hintMove=null;render();return;}
  const why=E.reason(currentConfig(),puzzleState,selected,index);
  if(why){showToast(REASONS[why]||'Этот путь сейчас закрыт');rejectBottle(index);return;}
  animatePour(selected,index);
}

      function animatePour(from,to) { performAction({kind:'pour',from,to}); }

      function rejectBottle(index) {
        const bottleEl = el.board.querySelector(`[data-index="${index}"]`);
        if (bottleEl) {
          bottleEl.classList.remove('shake');
          void bottleEl.offsetWidth;
          bottleEl.classList.add('shake');
        }
        playTone(160, .06, .028);
      }

      function undo() {
  if(locked||hintPending||isInteractionBlocked()||!history.length)return;
  cleanupPourEngine(); puzzleState=history.pop();bottles=puzzleState.b;selected=null;hintMove=null;
  closeWinModal();persistLocalProgress();render();playTone(420,.07,.025);
  if(!remainingMoves())showLimit();
}

      function restart() {
  if(isInteractionBlocked()||hintPending)return;
  initLevel(currentLevel);
}

      function stateIsSolved(state,level=currentLevel) { return !!state?.b && E.solved(LEVEL_DATA[level],state); }

      

      

      

      

      
      

      

      async function useHint() { await requestHint(false); }

      

      function grantBonusMoves() {
  if(bonusUsed)return;
  bonusUsed=true;bonusMoves=2;usedAssist=true;recordInterstitialAttempt();
  closeWinModal();persistLocalProgress();render();showToast('Добавлено 2 хода. С помощью максимум ★★.');
}

      function withTimeout(promise, timeoutMs, label) {
        return new Promise((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error(`${label}: timeout`));
          }, timeoutMs);
          Promise.resolve(promise).then(
            value => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve(value);
            },
            error => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(error);
            }
          );
        });
      }

      function setAdBusy(value) {
        adBusy = Boolean(value);
        syncInteractionState();
        if (!el.gameScreen.classList.contains('hidden')) render();
      }

      async function checkVKRewardAd() {
        if (!vkBridgeReady || !vkBridge || typeof vkBridge.send !== 'function') return false;
        try {
          const response = await withTimeout(
            vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'reward' }),
            AD_CHECK_TIMEOUT,
            'VKWebAppCheckNativeAds(reward)'
          );
          return Boolean(response && response.result === true);
        } catch (error) {
          console.warn('VK rewarded availability check failed:', error);
          return false;
        }
      }

      async function refreshRewardAvailability() {
        if (!vkBridgeReady || rewardCheckPending) return;
        rewardCheckPending = true;
        const available = await checkVKRewardAd();
        rewardCheckPending = false;
        rewardAvailable = available;
        if (!el.gameScreen.classList.contains('hidden')) render();
        if (!el.limitModal.classList.contains('hidden')) el.limitAd.hidden = bonusUsed || !vkBridgeReady;
      }

      async function checkVKInterstitialAd() {
        if (!vkBridgeReady || !vkBridge || typeof vkBridge.send !== 'function') return false;
        try {
          const response = await withTimeout(
            vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'interstitial' }),
            AD_CHECK_TIMEOUT,
            'VKWebAppCheckNativeAds(interstitial)'
          );
          return Boolean(response && response.result === true);
        } catch (error) {
          console.warn('VK interstitial availability check failed:', error);
          return false;
        }
      }

      async function showRewardedAd(grant) {
        if ((locked && el.limitModal.classList.contains('hidden')) || isInteractionBlocked() || adBusy) return;
        if (!vkBridgeReady) {
          showToast('Реклама сейчас недоступна');
          return;
        }

        setAdBusy(true);
        let audioPausedForAd = false;
        try {
          if (lifecyclePaused || document.hidden) return;
          persistLocalProgress();
          recordInterstitialAttempt();
          pauseAudio('ad');
          audioPausedForAd = true;
          const response = await withTimeout(
            vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' }),
            AD_SHOW_TIMEOUT,
            'VK rewarded ad'
          );

          if (response && response.result === true) {
            grant();
          } else {
            showToast('Реклама не досмотрена — награда не выдана');
          }
        } catch (error) {
          console.warn('VK rewarded ad failed:', error);
          showToast('Реклама сейчас недоступна');
        } finally {
          if (audioPausedForAd) resumeAudio('ad');
          setAdBusy(false);
        }
      }

      async function showRewardedBottleAdOnClick() { await requestHint(true); }

      function showRewardedBonusAdOnClick() {
        if (bonusUsed || el.limitModal.classList.contains('hidden')) return;
        void showRewardedAd(grantBonusMoves);
      }

      function recordInterstitialAttempt() {
        levelsSinceInterstitial = 0;
        lastInterstitialAt = Date.now();
        writeSessionNumber('colorSortLevelsSinceInterstitial', 0);
        writeSessionNumber('colorSortLastInterstitialAt', lastInterstitialAt);
      }

      async function showInterstitialThen(next) {
        if (isInteractionBlocked()) return;
        if (!vkBridgeReady) {
          next();
          return;
        }

        setAdBusy(true);
        let audioPausedForAd = false;
        try {
          const available = await checkVKInterstitialAd();
          if (lifecyclePaused || document.hidden || !available) return;

          recordInterstitialAttempt();
          pauseAudio('ad');
          audioPausedForAd = true;
          await withTimeout(
            vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' }),
            AD_SHOW_TIMEOUT,
            'VK interstitial ad'
          );
        } catch (error) {
          console.warn('VK interstitial ad failed:', error);
        } finally {
          if (audioPausedForAd) resumeAudio('ad');
          setAdBusy(false);
          next();
        }
      }

      function stopWinEffects() {
        if (winFxRaf) cancelAnimationFrame(winFxRaf);
        winFxRaf = 0;
        if (winFxCanvas) winFxCanvas.remove();
        winFxCanvas = null;
      }

      function launchWinEffects() {
        stopWinEffects();
        if (reducedMotion()) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'win-fx-canvas';
        const rect = document.getElementById('app').getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        document.getElementById('app').appendChild(canvas);
        winFxCanvas = canvas;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const colors = ['#ffd15c','#ff6f7f','#6ca8ff','#55d98b','#b57cff','#43d7d1','#ffffff'];
        const particles = Array.from({ length: document.body.dataset.quality==='med'?36:82 }, (_, i) => ({
          x: rect.width * (.25 + Math.random() * .5),
          y: rect.height * .42,
          vx: (Math.random() - .5) * 8.5,
          vy: -3.5 - Math.random() * 7.5,
          g: .13 + Math.random() * .08,
          r: 3 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - .5) * .22,
          color: colors[i % colors.length],
          coin: i % 8 === 0
        }));
        const started = performance.now();
        function frame(now) {
          const age = now - started;
          ctx.clearRect(0, 0, rect.width, rect.height);
          for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.g;
            p.vx *= .995;
            p.rot += p.vr;
            const alpha = Math.max(0, 1 - Math.max(0, age - 1250) / 700);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            if (p.coin) {
              ctx.fillStyle = '#ffd15c';
              ctx.beginPath();
              ctx.arc(0, 0, p.r + 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(95,64,0,.65)';
              ctx.font = `bold ${Math.max(8, p.r + 4)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('•', 0, -1);
            } else {
              ctx.fillStyle = p.color;
              ctx.fillRect(-p.r, -p.r * .45, p.r * 2, p.r * .9);
            }
            ctx.restore();
          }
          if (age < 1950) winFxRaf = requestAnimationFrame(frame);
          else stopWinEffects();
        }
        winFxRaf = requestAnimationFrame(frame);
      }

      function showWin(revealDelay=0) {
        locked = true;
        const starsBeforeWin = starTotal();
        const thresholds = LEVEL_DATA[currentLevel].t;
        const naturalStars = moves <= thresholds[0] ? 3 : moves <= thresholds[1] ? 2 : 1;
        const stars = usedAssist ? Math.min(2, naturalStars) : naturalStars;
        earnedStars[currentLevel] = Math.max(earnedStars[currentLevel] || 0, stars);
        const unlockedGlass = unlockStarGlass();
        const newLabPlans = LAB_PROJECTS.filter(project => project.stars.some(requirement =>
          starsBeforeWin < requirement && starTotal() >= requirement)).map(project => project.name);
        const bestKey = `atlasBestV4_${currentLevel}`;
        const oldBest = Number(safeStorageGet(bestKey) || 0);
        const isNewRecord = !oldBest || moves < oldBest;
        const bestResult = isNewRecord ? moves : oldBest;
        if (isNewRecord) safeStorageSet(bestKey, String(moves));

        const firstCompletion = !completedLevels.has(currentLevel);
        if (firstCompletion) {
          completedLevels.add(currentLevel);
          coins += LEVEL_REWARD;
        }

        const highestUnlocked = getUnlockedIndex();
        safeStorageSet('atlasUnlockedV2', String(Math.max(highestUnlocked, Math.min(currentLevel + 1, LEVELS.length - 1))));
        const nextChapter = chapterIndex(currentLevel) + 1;
        const atChapterFinale = (currentLevel + 1) % 10 === 0 && nextChapter < CHAPTERS.length;
        const chapterReady = atChapterFinale && chapterGateOpen(nextChapter);
        persistLocalProgress();
        updateMenuProgress();

        const gateText = atChapterFinale ? chapterReady
          ? ` Глава ${nextChapter + 1} открыта: ${chapterStars(nextChapter - 1)}/30 ✦.`
          : ` Для главы ${nextChapter + 1} требуется ${chapterRequired(nextChapter)} из 30 ✦ за эту главу. Сейчас ${chapterStars(nextChapter - 1)}/30; улучши результат прошлых уровней.` : '';
        el.winText.textContent = `Созвездие зажжено: ${completedCount()} маяков за ${moves} ходов. ★★★ до ${thresholds[0]}, ★★ до ${thresholds[1]}, ★ до ${LEVEL_DATA[currentLevel].m+bonusMoves}.${usedAssist ? ' После помощи максимум две звезды.' : ''}${unlockedGlass.length ? ` Новая награда: ${unlockedGlass.join(', ')}.` : ''}${newLabPlans.length ? ` Новые чертежи лаборатории: ${newLabPlans.join(', ')}.` : ''}${firstCompletion && currentLevel === 0 ? ' В меню открылась заброшенная лаборатория: восстанови её за заработанные звёзды.' : ''}${gateText}`;
        document.getElementById('winTitle').textContent=currentLevel===179?'Сердце Атласа зажжено!':(currentLevel+1)%10===0?'Созвездие восстановлено':'Рецепты собраны';
        el.winStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        el.winStars.setAttribute('aria-label', `Получено звёзд: ${stars} из 3; лучший результат: ${earnedStars[currentLevel]}`);
        el.winMoves.textContent = String(moves);
        el.winBest.textContent = String(bestResult);
        el.winRecord.classList.toggle('hidden', !isNewRecord);
        el.winRecord.textContent = oldBest ? 'Новый рекорд!' : 'Первый рекорд!';
        el.winReward.classList.toggle('hidden', !firstCompletion);
        if (firstCompletion) { setCoinDisplay(el.winReward, LEVEL_REWARD, '+'); el.winReward.appendChild(document.createTextNode(' за первое прохождение')); }
        el.nextBtn.textContent = currentLevel === LEVELS.length - 1 ? 'К главам' :
          atChapterFinale ? (chapterReady ? 'Следующая глава' : 'Улучшить звёзды') : 'Следующий уровень';
        decorateWin();el.gameScreen.setAttribute('inert','');
        const token=attemptId;
        const reveal=()=>{
          winRevealTimer=0;
          if(token!==attemptId||!isWin())return;
          el.winModal.classList.remove('hidden');
          el.winCard.classList.remove('win-pop');void el.winCard.offsetWidth;el.winCard.classList.add('win-pop');
          launchWinEffects();playWinSound();
          requestAnimationFrame(()=>el.nextBtn.focus({preventScroll:true}));
        };
        clearTimeout(winRevealTimer);
        if(revealDelay)winRevealTimer=setTimeout(reveal,revealDelay);else reveal();
      }

      function replayLevel() {
        if (isInteractionBlocked() || el.winModal.classList.contains('hidden')) return;
        locked = false;
        stopWinEffects();
        initLevel(currentLevel);
      }

      function nextLevel() {
        const next = currentLevel + 1;
        locked = false;
        if (next >= LEVELS.length || !canEnterLevel(next)) {
          showLevelSelect();
          return;
        }
        initLevel(next);
      }

      function nextLevelWithAd() {
        if (isInteractionBlocked() || el.winModal.classList.contains('hidden')) return;
        if (currentLevel === LEVELS.length - 1 || !canEnterLevel(currentLevel + 1)) {
          nextLevel();
          return;
        }
        levelsSinceInterstitial += 1;
        writeSessionNumber('colorSortLevelsSinceInterstitial', levelsSinceInterstitial);

        const enoughTime = Date.now() - lastInterstitialAt >= INTERSTITIAL_MIN_INTERVAL;
        if (!vkBridgeReady || levelsSinceInterstitial < 2 || !enoughTime) {
          nextLevel();
          return;
        }

        void showInterstitialThen(nextLevel);
      }

      function syncAudioButtons() {
        el.menuMusicModeSelect.value = musicMode;
        el.gameMusicModeSelect.value = musicMode;
        const soundButtons = [el.soundBtn, el.menuSoundBtn].filter(Boolean);
        soundButtons.forEach(button => {
          setIconButton(button, sfxOn ? 'sound' : 'muted');
          const label = sfxOn ? 'Выключить звуки' : 'Включить звуки';
          button.title = label;
          button.setAttribute('aria-label', label);
          button.setAttribute('aria-pressed', String(sfxOn));
          button.classList.toggle('off', !sfxOn);
        });
        const musicButtons = [el.musicBtn, el.menuMusicBtn].filter(Boolean);
        musicButtons.forEach(button => {
          setIconButton(button, musicOn ? 'music' : 'music-off');
          const label = musicOn ? 'Выключить музыку' : 'Включить музыку';
          button.title = label;
          button.setAttribute('aria-label', label);
          button.setAttribute('aria-pressed', String(musicOn));
          button.classList.toggle('off', !musicOn);
        });
      }

      function toggleSound() {
        sfxOn = !sfxOn;
        persistLocalProgress();
        if (sfxOn) playTone(520, .06, .03);
        syncAudioButtons();
        if (!el.gameScreen.classList.contains('hidden')) render();
      }

      function toggleMusic() {
        musicOn = !musicOn;
        persistLocalProgress();
        if (musicOn) startBackgroundMusic();
        else stopBackgroundMusic();
        syncAudioButtons();
        if (!el.gameScreen.classList.contains('hidden')) render();
      }

      function selectMusicMode(event) {
        const choice = event.target.value;
        if (!['all', '0', '1', '2', '3'].includes(choice)) return;
        stopBackgroundMusic();
        musicMode = choice;
        musicTrackIndex = choice === 'all' ? 0 : Number(choice);
        musicOn = true;
        persistLocalProgress();
        syncAudioButtons();
        startBackgroundMusic();
        showToast(choice === 'all' ? 'Все четыре мелодии по очереди' : `Мелодия: ${MUSIC_TRACKS[musicTrackIndex].name}`);
      }

      function getAudioContext(force = false) {
        if (systemAudioPaused) return null;
        if (!force && !sfxOn && !musicOn) return null;
        if (!audioCtx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return null;
          audioCtx = new AudioCtx();
          audioMaster = audioCtx.createGain();
          audioMaster.gain.value = 1;
          audioMaster.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        return audioCtx;
      }

      function midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
      }

      function createReverbImpulse(ctx, seconds = 1.85, decay = 2.7) {
        const length = Math.floor(ctx.sampleRate * seconds);
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
          const data = impulse.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            const envelope = Math.pow(1 - i / length, decay);
            data[i] = (Math.random() * 2 - 1) * envelope;
          }
        }
        return impulse;
      }

      function ensureMusicGraph(ctx) {
        if (musicBus && musicBus.context === ctx) return;

        musicBus = ctx.createGain();
        musicBus.gain.value = 0.0001;

        const dry = ctx.createGain();
        dry.gain.value = .70;
        const wet = ctx.createGain();
        wet.gain.value = .32;

        musicReverb = ctx.createConvolver();
        musicReverb.buffer = createReverbImpulse(ctx, 2.35, 3.15);

        musicBus.connect(dry);
        musicBus.connect(musicReverb);
        musicReverb.connect(wet);
        dry.connect(audioMaster);
        wet.connect(audioMaster);

        // Более воздушный тембр деревянной флейты / свирели.
        fluteWave = ctx.createPeriodicWave(
          new Float32Array([0, 0, 0, 0, 0, 0]),
          new Float32Array([0, 1, .22, .075, .026, .009]),
          { disableNormalization: false }
        );
      }

      function scheduleFluteNote(ctx, midi, start, duration, velocity = 1) {
        if (midi == null) return;

        const frequency = midiToFreq(midi);
        const osc = ctx.createOscillator();
        const breath = ctx.createOscillator();
        const breathGain = ctx.createGain();
        const gain = ctx.createGain();
        const tone = ctx.createBiquadFilter();
        const vibrato = ctx.createOscillator();
        const vibratoDepth = ctx.createGain();

        osc.setPeriodicWave(fluteWave);
        osc.frequency.setValueAtTime(frequency, start);

        // Едва заметный верхний призвук создаёт ощущение деревянной свирели.
        breath.type = 'sine';
        breath.frequency.setValueAtTime(frequency * 2.01, start);
        breathGain.gain.setValueAtTime(.0001, start);
        breathGain.gain.exponentialRampToValueAtTime(.0038 * velocity, start + .06);
        breathGain.gain.exponentialRampToValueAtTime(.0001, start + duration);

        tone.type = 'lowpass';
        tone.frequency.setValueAtTime(Math.min(4600, frequency * 7.2), start);
        tone.Q.value = .45;

        vibrato.type = 'sine';
        vibrato.frequency.setValueAtTime(4.7, start);
        vibratoDepth.gain.setValueAtTime(0, start);
        vibratoDepth.gain.linearRampToValueAtTime(Math.max(1.15, frequency * .0046), start + .32);
        vibrato.connect(vibratoDepth);
        vibratoDepth.connect(osc.frequency);

        const attack = Math.min(.11, duration * .2);
        const release = Math.min(.25, duration * .32);
        const peak = .032 * velocity;
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + attack);
        gain.gain.setValueAtTime(peak * .86, Math.max(start + attack, start + duration - release));
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);

        osc.connect(tone);
        tone.connect(gain);
        gain.connect(musicBus);
        breath.connect(breathGain);
        breathGain.connect(musicBus);

        registerAudioSource(osc);
        registerAudioSource(breath);
        registerAudioSource(vibrato);
        osc.start(start);
        breath.start(start);
        vibrato.start(start);
        osc.stop(start + duration + .05);
        breath.stop(start + duration + .05);
        vibrato.stop(start + duration + .05);
      }

      function scheduleBellNote(ctx, midi, start, duration, velocity = 1) {
        if (midi == null) return;
        const carrier = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();
        carrier.type = 'sine';
        overtone.type = 'sine';
        carrier.frequency.setValueAtTime(midiToFreq(midi), start);
        overtone.frequency.setValueAtTime(midiToFreq(midi) * 2.01, start);
        const overtoneGain = ctx.createGain();
        overtoneGain.gain.value = .13;
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(.027 * velocity, start + .016);
        gain.gain.exponentialRampToValueAtTime(.0001, start + Math.max(.25, duration));
        carrier.connect(gain);
        overtone.connect(overtoneGain);
        overtoneGain.connect(gain);
        gain.connect(musicBus);
        registerAudioSource(carrier);
        registerAudioSource(overtone);
        carrier.start(start);
        overtone.start(start);
        carrier.stop(start + Math.max(.25, duration) + .04);
        overtone.stop(start + Math.max(.25, duration) + .04);
      }

      function schedulePluck(ctx, midi, start, velocity = 1) {
        const freq = midiToFreq(midi);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const tone = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        tone.type = 'lowpass';
        tone.frequency.setValueAtTime(1900, start);
        tone.frequency.exponentialRampToValueAtTime(650, start + 1.15);
        const peak = .0105 * velocity;
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + .018);
        gain.gain.exponentialRampToValueAtTime(.0001, start + 1.35);

        osc.connect(tone);
        tone.connect(gain);
        gain.connect(musicBus);
        registerAudioSource(osc);
        osc.start(start);
        osc.stop(start + 1.4);
      }

      function schedulePastoralChord(ctx, notes, start) {
        if (!notes) return;
        notes.forEach((midi, i) => schedulePluck(ctx, midi, start + i * .055, i === 0 ? 1 : .8));
        // Тихая квинта внизу удерживает спокойную «земляную» основу.
        schedulePluck(ctx, notes[0] - 12, start + .03, .58);
      }

      function scheduleMusicAhead() {
        if (!musicOn || !musicTimer || !audioCtx) return;
        const horizon = audioCtx.currentTime + .85;

        while (musicNextNoteTime < horizon) {
          const track = MUSIC_TRACKS[musicTrackIndex];
          const [midi, beats, chord] = track.notes[musicStep];
          const fullDuration = beats * (60 / track.bpm);
          const soundingDuration = Math.max(.18, fullDuration * .93);
          const phraseAccent = chord ? 1.06 : 1;

          if (chord) schedulePastoralChord(audioCtx, chord, musicNextNoteTime);
          if (track.kind === 'bell') scheduleBellNote(audioCtx, midi, musicNextNoteTime, soundingDuration * 1.18, phraseAccent);
          else scheduleFluteNote(audioCtx, midi, musicNextNoteTime, soundingDuration, phraseAccent);

          musicNextNoteTime += fullDuration;
          musicStep += 1;
          if (musicStep >= track.notes.length) {
            musicStep = 0;
            musicTrackIndex = musicMode === 'all' ? (musicTrackIndex + 1) % MUSIC_TRACKS.length : Number(musicMode);
          }
        }
      }

      function startBackgroundMusic() {
        if (!musicOn || document.hidden || systemAudioPaused) return;
        const ctx = getAudioContext(true);
        if (!ctx) return;
        ensureMusicGraph(ctx);

        const now = ctx.currentTime;
        musicBus.gain.cancelScheduledValues(now);
        musicBus.gain.setValueAtTime(Math.max(.0001, musicBus.gain.value), now);
        musicBus.gain.exponentialRampToValueAtTime(.58, now + 1.1);

        if (musicTimer) return;
        musicStep = 0;
        musicNextNoteTime = now + .12;
        musicTimer = setInterval(scheduleMusicAhead, 120);
        scheduleMusicAhead();
      }

      function stopBackgroundMusic() {
        if (musicTimer) {
          clearInterval(musicTimer);
          musicTimer = null;
        }
        musicStep = 0;
        if (!audioCtx || !musicBus) return;
        const now = audioCtx.currentTime;
        musicBus.gain.cancelScheduledValues(now);
        musicBus.gain.setValueAtTime(Math.max(.0001, musicBus.gain.value), now);
        musicBus.gain.exponentialRampToValueAtTime(.0001, now + .35);
        // Retire the old track bus. New notes go to a fresh bus and never
        // collide with notes already scheduled on the fading previous track.
        musicBus = null;
      }

      function playTone(freq, duration = .06, gain = .03, delay = 0) {
        if (!sfxOn) return;
        const ctx = getAudioContext(true);
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        amp.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
        amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + delay + .01);
        amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
        osc.connect(amp);
        amp.connect(audioMaster);
        registerAudioSource(osc);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration + .02);
      }

      function playWinSound() {
        if (!sfxOn) return;
        playTone(523.25, .13, .035, 0);
        playTone(659.25, .13, .035, .12);
        playTone(783.99, .18, .04, .24);
      }

      function showToast(text) {
        clearTimeout(toastTimer);
        el.toast.textContent = text;
        el.toast.classList.add('show');
        toastTimer = setTimeout(() => el.toast.classList.remove('show'), Math.max(2600,Math.min(7000,text.length*45)));
      }

      el.playBtn.addEventListener('click', continueGame);
      el.levelsBtn.addEventListener('click', showLevelSelect);
      el.shopBtn.addEventListener('click', showShop);
      el.labBtn.addEventListener('click', showLab);
      el.labBackBtn.addEventListener('click', showMenu);
      el.labUpgradeBtn.addEventListener('click', upgradeLabStation);
      el.labRoomUpgradeBtn.addEventListener('click', upgradeLabRoom);
      el.labPreviewBtn.addEventListener('click', previewLabRoom);
      el.labScene.querySelectorAll('.lab-station').forEach(button =>
        button.addEventListener('click', () => inspectLabStation(button.dataset.station)));
      el.labScene.querySelectorAll('.lab-marker').forEach(button => button.addEventListener('click', () => {
        const card = Array.from(el.labProjectGrid.children).find(item => item.dataset.project === button.dataset.project);
        if (!card) return;
        card.classList.add('highlight');
        card.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
        card.querySelector('button')?.focus({ preventScroll: true });
      }));
      el.menuSoundBtn.addEventListener('click', toggleSound);
      el.menuMusicBtn.addEventListener('click', toggleMusic);
      el.menuMusicModeSelect.addEventListener('change', selectMusicMode);
      el.gameMusicModeSelect.addEventListener('change', selectMusicMode);
      el.levelsBackBtn.addEventListener('click', showMenu);
      el.shopBackBtn.addEventListener('click', showMenu);
      el.menuBtn.addEventListener('click', showMenu);
      el.soundBtn.addEventListener('click', toggleSound);
      el.musicBtn.addEventListener('click', toggleMusic);
      el.hintBtn.addEventListener('click', useHint);
      el.extraBottleBtn.addEventListener('click', showRewardedBottleAdOnClick);
      el.undoBtn.addEventListener('click', undo);
      el.restartBtn.addEventListener('click', restart);
      el.replayBtn.addEventListener('click', replayLevel);
      el.nextBtn.addEventListener('click', nextLevelWithAd);
      el.limitUndo.addEventListener('click', () => { closeWinModal(); undo(); });
      el.limitRestart.addEventListener('click', () => { closeWinModal(); restart(); });
      el.limitAd.addEventListener('click', showRewardedBonusAdOnClick);

      window.addEventListener('keydown', (event) => {
        if (el.gameScreen.classList.contains('hidden') || isInteractionBlocked()) return;
        if (!el.winModal.classList.contains('hidden') || !el.limitModal.classList.contains('hidden')) return;

        if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          undo();
          return;
        }

        if (event.key === 'Escape') {
          if (selected !== null) {
            event.preventDefault();
            selected = null;
            render();
          }
          return;
        }

        const activeBottle = document.activeElement?.classList?.contains('bottle');
        if (activeBottle) {
          const directions = {
            ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'
          };
          if (directions[event.key]) {
            event.preventDefault();
            focusBottleSpatial(directions[event.key]);
            return;
          }
          if (event.key === 'Home') {
            event.preventDefault();
            focusBottle(0);
            return;
          }
          if (event.key === 'End') {
            event.preventDefault();
            focusBottle(bottles.length - 1);
            return;
          }
        }

        if (!event.ctrlKey && !event.metaKey && !event.altKey && /^[1-9]$/.test(event.key)) {
          const index = Number(event.key) - 1;
          if (index < bottles.length) {
            event.preventDefault();
            focusBottle(index);
          }
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseLifecycle('visibility');
        else resumeLifecycle('visibility');
      });

      window.addEventListener('blur', () => {
        pauseLifecycle('blur');
      });

      window.addEventListener('focus', () => {
        if (document.hidden) return;
        resumeLifecycle('blur');
      });

      window.addEventListener('pagehide', () => {
        pauseLifecycle('page');
      });

      window.addEventListener('pageshow', () => {
        if (document.hidden) return;
        resumeLifecycle('page');
      });

      // Блокируем системное контекстное меню и drag внутри игровой области.
      el.app.addEventListener('contextmenu', event => event.preventDefault());
      el.app.addEventListener('dragstart', event => event.preventDefault());


      // Source-version migration is intentionally separate from score normalization.
      if(!safeStorageGet('atlasSaveVersion')){
        const legacy={};for(let i=0;i<180;i++){const v=Number(safeStorageGet('atlasBestV2_'+i));if(Number.isInteger(v)&&v>0)legacy[i]=v;}
        safeStorageSet('atlasLegacyBestV3',JSON.stringify(legacy));
      }
      document.getElementById('rulesBtn').addEventListener('click',openRules);
      document.getElementById('rulesClose').addEventListener('click',closeRules);
      document.getElementById('stageText').addEventListener('click',openRules);
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('rulesModal').classList.contains('hidden'))closeRules();});
      const qualitySelect=document.getElementById('qualitySelect');
      const quality=['high','med','low'].includes(safeStorageGet('atlasQuality'))?safeStorageGet('atlasQuality'):'med';
      qualitySelect.value=quality;document.body.dataset.quality=quality;
      qualitySelect.addEventListener('change',()=>{document.body.dataset.quality=qualitySelect.value;safeStorageSet('atlasQuality',qualitySelect.value);});
      let resizeFrame=0;
      const resized=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(activePourEngine){cleanupPourEngine();locked=false;render();}drawNetwork();ART?.resize();});};
      window.addEventListener('resize',resized);
      if(typeof ResizeObserver!=='undefined')new ResizeObserver(resized).observe(el.board);
      document.getElementById('boot').remove();
      // QA access exists only in the instrumented test copy, never in release.
      

if(Number(safeStorageGet('atlasSaveVersion')||0)<5){
 const legacy=readStoredObject('atlasLegacyBestV4')||{};
 for(const index of REVISED_LEVELS){const value=Number(safeStorageGet(`atlasBestV4_${index}`));if(value>0)legacy[index]=value;safeStorageRemove(`atlasBestV4_${index}`);}
 safeStorageSet('atlasLegacyBestV4',JSON.stringify(legacy));
 safeStorageRemove('atlasRunV4');safeStorageRemove('atlasRunV5');
 safeStorageSet('atlasSaveVersion','5');
}
applyCosmetics();syncAudioButtons();updateMenuProgress();initializePersistence();
ART?.scene('menu',0);
    })();
