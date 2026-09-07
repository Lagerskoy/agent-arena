const assert = require('node:assert/strict');
const { Arena } = require('./engine.js');
function run(config) { const sim=new Arena(config); while(!sim.over)sim.step(); return sim; }
const a=run({seed:731}),b=run({seed:731});
assert.deepEqual(a.export(),b.export(),'Same seed and options must reproduce the exact replay');
for(const size of [10,20,30])for(const left of ['pincer','assault','guard']) {
  const s=run({seed:42,size,left});
  assert.equal(s.agents.length,size*2);assert(s.tick<=2700);assert(s.events.some(e=>e.type==='RESULT'));
  assert(s.agents.every(a=>a.hp>=0&&a.hp<=100&&a.x>=35&&a.x<=865&&a.y>=50&&a.y<=550));
}
assert.throws(()=>new Arena({size:0}));assert.throws(()=>new Arena({left:'unknown'}));
assert.notDeepEqual(run({seed:732}).export(),a.export());
console.log('PASS: deterministic replay, 9 tactic/size matches, bounds, health, completion and input validation.');
