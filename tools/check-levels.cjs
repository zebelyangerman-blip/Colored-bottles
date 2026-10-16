#!/usr/bin/env node
'use strict';
/* R14 level validity audit. Uses the shipped rules; never changes player progress. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.join(__dirname, '..');
const E = require(path.join(base, 'assets/js/spectral-core.js'));
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(base, 'assets/levels.js'),'utf8'), context, {filename:'assets/levels.js'});
const levels = context.window.STAR_LEVEL_DATA;
const error = [], stats = [];
for (const l of levels) {
 let state=E.initial(l),step=0,transitions=0;
 if(!E.validState(l,state))error.push(`Level ${l.id}: invalid start`);
 for(const action of (l.solution || [])) {
  const result=E.act(l,state,action);
  if(!result){error.push(`Level ${l.id}: invalid solution step ${step+1}`);break;}
  state=result.state;step++;transitions+=result.transitions.length;
  if(!E.validState(l,state))error.push(`Level ${l.id}: invalid state after step ${step}`);
 }
 const win=E.solved(l,state);
 if(!win)error.push(`Level ${l.id}: solution does not reach goal`);
 if(l.optimal!==(l.solution||[]).length)error.push(`Level ${l.id}: declared optimal and certificate disagree`);
 if(l.m<step||l.t[0]<step||l.t[1]<l.t[0])error.push(`Level ${l.id}: invalid move/score thresholds`);
 stats.push({level:l.id, chapter:l.chapter, steps:step, budget:l.m, win, transitions});
}
const result={levels:stats.length,passed:stats.filter(x=>x.win).length,issues:error.length,errors:error,meanCertificate:(stats.reduce((a,x)=>a+x.steps,0)/stats.length).toFixed(2),shortestCertificate:Math.min(...stats.map(x=>x.steps)),longestCertificate:Math.max(...stats.map(x=>x.steps))};
if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(result,null,2)+'\n');
else {
 console.log(`Checked ${result.levels} levels, ${result.passed} certified solvable, ${result.issues} issues.`);
 console.log(`Certificate length: mean ${result.meanCertificate}, range ${result.shortestCertificate}-${result.longestCertificate}.`);
 error.forEach(e=>console.error(e));
}
if(error.length)process.exitCode=1;
