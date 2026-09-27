// Checks the shipped chapter gates, lab economy, saves and ad reward path
// without starting a browser or claiming live VK advertisement coverage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const levels = JSON.parse(fs.readFileSync(path.join(root, 'assets/levels.js'), 'utf8')
  .split('window.STAR_LEVEL_DATA=')[1].trim().replace(/;$/, ''));
const certified = JSON.parse(fs.readFileSync(path.join(root, 'tools/audit-all.json'), 'utf8'));
assert.equal(certified.length,180);
for (let i=0;i<180;i++) {
  assert.equal(certified[i].level,i+1);
  assert.equal(certified[i].limit,levels[i].m);
  assert.equal(certified[i].witness,levels[i].w.length);
  assert.ok(certified[i].proved && certified[i].optimal <= levels[i].t[0], `three stars must be attainable on level ${i+1}`);
}

function between(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a !== -1 && b > a, `Source segment ${start}`);
  return html.slice(a, b);
}

const campaign = new Function('levels', 'assert', `
  const LEVELS = levels;
  const console = { warn() {}, log: (...args) => globalThis.console.log(...args) };
  const SAVE_VERSION = 3, VK_SAVE_KEY = 'color_sort_atlas_v3';
  let unlocked = 0, earnedStars = {}, chapterPermits = new Set();
  function getUnlockedIndex() { return unlocked; }
  function safeStorageGet() { return null; }
  function readStoredObject() { return null; }
  function readStoredArray() { return []; }
  let ownedGlass = new Set(['ice']);
  let completedLevels = new Set();
  ${between('const CHAPTERS = [', 'const goalFor =')}
  ${between('const chapterStars = chapter =>', 'const THEME_ITEMS =')}
  ${between('const THEME_ITEMS = [', 'let ownedThemes =')}
  ${between('const LAB_STATIONS = [', 'const ACHIEVEMENTS = [')}
  ${between('const ACHIEVEMENTS = [', 'claimedAchievements = new Set(')}
  const COLORS = [0,1,2,3,4,5,6];
  function isValidRunState() { return false; }
  function stateIsSolved() { return false; }
  ${between('function normalizeProgressSnapshot(raw)', 'function writeSnapshotToLocal(')}
  let coins = 0, selectedLabStation = 'prism', labPreviewRoom = false, persisted = 0, menuUpdates = 0;
  function persistLocalProgress() { persisted++; }
  function updateMenuProgress() { menuUpdates++; }
  function applyCosmetics() {}
  function inspectLabStation() {}
  function renderLab() {}
  function showToast() {}
  function playTone() {}
  ${between('function upgradeLabStation()', 'function showGame()')}
  let vkBridgeReady = true, cloudSaveChain = Promise.resolve();
  let lastStorage = '', requests = [], response = { result: true };
  let vkBridge = { send: async (method, data) => {
    requests.push(method);
    if (method === 'VKWebAppStorageSet') { lastStorage = data.value; return { result: true }; }
    return response;
  }};
  ${between('function commitCloudSnapshot(snapshot)', 'function flushCloudSave()')}
  let locked = false, adBusy = false, lifecyclePaused = false, bonusUsed = false;
  const document = { hidden: false };
  const el = { limitModal: { classList: { contains: () => true } } };
  function isInteractionBlocked() { return adBusy || lifecyclePaused; }
  function setAdBusy(value) { adBusy = value; }
  function pauseAudio() {}
  function resumeAudio() {}
  function withTimeout(promise) { return promise; }
  const AD_SHOW_TIMEOUT = 120000;
  ${between('async function showRewardedAd(grant)', 'function showRewardedBottleAdOnClick()')}
  return async () => {
    assert.equal(CHAPTERS.length, 18);
    assert.equal(LAB_PALETTES.length, 12);
    assert.equal(LAB_PROJECTS.length, 6);
    assert.equal(LAB_ROOM.costs.reduce((a,b)=>a+b,0) +
      LAB_PROJECTS.reduce((a,p)=>a+p.costs.reduce((x,y)=>x+y,0),0) +
      LAB_STATIONS.reduce((a,p)=>a+p.costs.reduce((x,y)=>x+y,0),0), 540);
    assert.ok(LAB_PALETTES.every((palette, index) => index === 0 || palette.stars > LAB_PALETTES[index-1].stars));
    assert.equal(CHAPTER_REQUIRED.length, 17);
    assert.equal(CHAPTER_REQUIRED[8], 26); // 9 -> 10
    assert.equal(CHAPTER_REQUIRED[16], 30); // 17 -> 18
    assert.ok(CHAPTER_REQUIRED.every((required,index) => required <= 30 &&
      (index === 0 || required >= CHAPTER_REQUIRED[index-1])));
    for (let chapter = 0; chapter < 18; chapter++) {
      assert.equal(chapterIndex(chapter * 10), chapter);
      assert.equal(chapterIndex(chapter * 10 + 9), chapter);
      assert.equal(levels[chapter * 10 + 9].x, 'finale');
      assert.equal(levels[chapter * 10 + 4].x, 'trial');
    }
    for (let chapter = 1; chapter < 18; chapter++) {
      chapterPermits.clear(); earnedStars = {}; unlocked = chapter * 10;
      const required = CHAPTER_REQUIRED[chapter-1];
      for (let n = 0; n < required-1; n++) earnedStars[(chapter-1)*10 + Math.floor(n/3)] = n % 3 + 1;
      assert.equal(chapterStars(chapter-1), required-1);
      assert.equal(canEnterLevel(chapter*10), false, 'gate must hold at '+chapter);
      earnedStars[(chapter-1)*10 + Math.floor((required-1)/3)] = (required-1)%3 + 1;
      assert.equal(chapterStars(chapter-1), required);
      assert.equal(canEnterLevel(chapter*10), true, 'gate must open at '+chapter);
      assert.equal(canEnterLevel(chapter*10+1), false, 'sequential unlock at '+chapter);
      earnedStars = {}; chapterPermits.add(chapter);
      assert.equal(canEnterLevel(chapter*10), true, 'preserved prior access at '+chapter);
    }
    earnedStars = Object.fromEntries(Array.from({length: 22},(_,index)=>[index,3]));
    chapterPermits.clear();
    assert.equal(labBalance(), 66);
    completedLevels.add(0);
    upgradeLabStation();
    assert.equal(labUpgrades.prism, 0, 'a damaged room cannot hold an instrument');
    previewLabRoom();
    assert.equal(labPreviewRoom, true);
    assert.equal(labBalance(), 66, 'preview is free');
    previewLabRoom();
    assert.equal(labPreviewRoom, false);
    upgradeLabRoom();
    assert.equal(labUpgrades.room, 1);
    assert.equal(labBalance(), 58);
    assert.equal(labUpgrades.prism, 0);
    upgradeLabStation();
    assert.equal(labUpgrades.prism, 1);
    assert.equal(labBalance(), 52);
    upgradeLabStation();
    assert.equal(labUpgrades.prism, 1, 'tier 2 needs room 2');
    upgradeLabProject('window');
    assert.equal(labUpgrades.window,1);
    assert.equal(labBalance(),43);
    upgradeLabProject('window');
    assert.equal(labUpgrades.window,1,'project stage 2 needs room 2 and 70 lifetime stars');
    assert.equal(chapterStars(0), 30, 'lab purchases never remove gate stars');
    earnedStars = Object.fromEntries(Array.from({length: 180},(_,index)=>[index,3]));
    upgradeLabRoom();
    upgradeLabRoom();
    assert.equal(labUpgrades.room, 3, 'room completes at stage 3');
    for (const station of LAB_STATIONS) {
      selectedLabStation = station.id;
      for (let repeat = 0; repeat < 4; repeat++) upgradeLabStation();
      assert.equal(labUpgrades[station.id], 3, station.id + ' max stage');
    }
    assert.equal(labBalance(), 300, 'first project consumes 9 in addition to 231 for room and instruments');
    upgradeLabRoom();
    assert.equal(labUpgrades.room,3,'prestige requires all projects');
    for (const project of LAB_PROJECTS) {
      for (let tier=labUpgrades[project.id];tier<2;tier++) upgradeLabProject(project.id);
      upgradeLabProject(project.id);
      assert.equal(labUpgrades[project.id],2,project.id+' max stage');
    }
    assert.equal(labBalance(),62,'only the final prestigious 62-star upgrade remains');
    previewLabRoom();
    assert.equal(labBalance(),62,'grand room preview does not charge');
    previewLabRoom();
    upgradeLabRoom();
    assert.equal(labUpgrades.room,4);
    assert.equal(labMasteryCount(),28);
    assert.equal(labBalance(),0,'all 540 stars have a distinct purchase');
    upgradeLabRoom();
    assert.equal(labBalance(),0,'finished room cannot charge twice');
    claimAchievement('first_light'); claimAchievement('first_light');
    assert.equal(coins, 30, 'achievement is paid exactly once');
    assert.equal(claimedAchievements.has('first_light'), true);
    assert.ok(persisted >= 2 && menuUpdates >= 1);

    const rawV2 = { v: 2, updatedAt: 345, level: 70, unlocked: 70, coins: 200,
      completed: Array.from({length:70},(_,n)=>n), stars: Object.fromEntries(Array.from({length:70},(_,n)=>[n,2])),
      bests: {0:8}, ownedThemes:['observatory'], ownedGlass:['ice'],
      equippedTheme:'observatory', equippedGlass:'ice' };
    const migrated = normalizeProgressSnapshot(rawV2);
    assert.equal(migrated.v, 3);
    assert.ok(migrated.chapterPermits.includes(7), 'old player keeps access to chapter 8');
    assert.equal(migrated.stars[0],2);
    assert.equal(migrated.lab.prism,0);
    assert.equal(migrated.lab.room,0);
    assert.ok(LAB_PROJECTS.every(item=>migrated.lab[item.id]===0));
    assert.equal(migrated.labColor,'cyan');
    const full = { ...migrated, level: 179, unlocked:179, updatedAt:12345,
      completed: Array.from({length:180},(_,n)=>n),
      stars: Object.fromEntries(Array.from({length:180},(_,n)=>[n,3])),
      bests: Object.fromEntries(Array.from({length:180},(_,n)=>[n,20])),
      chapterPermits:Array.from({length:17},(_,n)=>n+1),
      lab:{ room:4, prism:3, furnace:3, archive:3, orrery:3, ...Object.fromEntries(LAB_PROJECTS.map(item=>[item.id,2])) }, labColor:'violet',
      claimedAchievements:ACHIEVEMENTS.map(item=>item.id) };
    await commitCloudSnapshot(full);
    assert.ok(lastStorage.length < 4096, 'maximal compact save is ' + lastStorage.length + ' chars');
    const restored = normalizeProgressSnapshot(JSON.parse(lastStorage));
    assert.equal(restored.stars[179],3);
    assert.equal(restored.lab.orrery,3);
    assert.equal(restored.lab.room,4);
    assert.ok(LAB_PROJECTS.every(item=>restored.lab[item.id]===2));
    assert.equal(restored.labColor,'violet');
    assert.equal(restored.claimedAchievements.length, 17);
    assert.equal(restored.completed.length,180);
    const oldV3 = normalizeProgressSnapshot({ ...full, lab:{room:3,prism:3,furnace:3,archive:3,orrery:3} });
    assert.equal(oldV3.lab.room,3);
    assert.ok(LAB_PROJECTS.every(item=>oldV3.lab[item.id]===0),'old v3 laboratory keeps its equipment');
    const fakePrestige = normalizeProgressSnapshot({ ...full, lab:{room:4,prism:3,furnace:3,archive:3,orrery:3} });
    assert.equal(fakePrestige.lab.room,3,'prestige requires actual complete projects');
    const tampered = normalizeProgressSnapshot({...migrated, completed:[0], stars:{0:2}, labColor:'rainbow', lab:{room:3, prism:3}});
    assert.equal(tampered.lab.room,0, 'room purchase exceeding earned stars is rejected');
    assert.equal(tampered.labColor,'cyan', 'locked palette is rejected');

    let awards = 0; requests = [];
    response = { result:true };
    await showRewardedAd(() => awards++);
    assert.equal(awards,1);
    assert.deepEqual(requests, ['VKWebAppShowNativeAds'], 'false precheck must not suppress actual ad');
    response = { result:false };
    await showRewardedAd(() => awards++);
    assert.equal(awards,1, 'skip does not award');
    response = Promise.reject(Error('unavailable'));
    vkBridge.send = (method) => { requests.push(method); return response; };
    await showRewardedAd(() => awards++);
    assert.equal(awards,1, 'error does not award');
    assert.equal(adBusy,false, 'interaction released after ad error');
    let finish;
    vkBridge.send = (method) => { requests.push(method); return new Promise(resolve => { finish=resolve; }); };
    const pending = showRewardedAd(() => awards++);
    const count = requests.length;
    await showRewardedAd(() => awards++);
    assert.equal(requests.length,count,'double click cannot start another ad');
    finish({result:true}); await pending;
    assert.equal(awards,2);
    assert.equal(adBusy,false);
    console.log('Campaign verification: 18 gates, 28 lab purchases costing exactly 540 stars, 6 two-stage projects, prestige preview, 12 colors, old v3 migration, compact cloud save '+lastStorage.length+' chars, rewarded success/skip/error/double click.');
  };
`)(levels, assert);

await campaign();
