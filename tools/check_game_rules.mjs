// Deterministic smoke test for the exact rule functions shipped in index.html.
// Runs JavaScript functions in Node without a browser or a simulated VK SDK.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const levels = JSON.parse(fs.readFileSync(path.join(root, 'assets/levels.js'), 'utf8')
  .split('window.STAR_LEVEL_DATA=')[1].trim().replace(/;$/, ''));

function between(start, end) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw Error(`Missing game code: ${start} / ${end}`);
  return html.slice(a, b);
}

const source = [
  'const CAPACITY = 4; let currentLevel = 0;',
  'const LEVEL_DATA = levels;',
  between('const goalFor = index =>', 'const bottleAtGoal ='),
  between('function canPourState(state, from, to)', 'function canPour(from, to)'),
  between('function stateIsSolved(state, index = currentLevel)', 'function getLegalMoves(state)'),
  `return (index) => {
    currentLevel = index;
    const level = LEVEL_DATA[index];
    let state = level.b.map(bottle => [...bottle]);
    const colorCounts = Array(7).fill(0);
    state.flat().forEach(color => colorCounts[color]++);
    for (let step = 0; step < level.w.length; step++) {
      const [from, to] = level.w[step];
      if (!canPourState(state, from, to)) throw Error('Illegal move at ' + (index+1) + ':' + (step+1));
      const result = stateMove(state, from, to);
      if (result.amount < 1 || result.amount > 4) throw Error('Bad pour amount');
      state = result.next;
      const after = Array(7).fill(0);
      state.flat().forEach(color => after[color]++);
      if (after.some((count, color) => count !== colorCounts[color])) throw Error('Lost pigment');
    }
    if (!stateIsSolved(state) || level.w.length > level.m) throw Error('Failed to solve ' + (index+1));
    if (level.t[0] > level.t[1] || level.t[1] > level.t[2] || level.t[2] !== level.m) throw Error('Broken star thresholds');
    return level.w.length;
  };`
].join('\n');

const verify = new Function('levels', source)(levels);
let total = 0;
for (let index = 0; index < levels.length; index++) total += verify(index);
console.log(`Game-engine rule verification: ${levels.length}/${levels.length} levels, ${total} legal moves, all stars valid.`);
