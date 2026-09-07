/* Seeded rules-based sandbox. No model calls and no benchmark claims. */
(function (root) {
  'use strict';
  const DT = 1 / 30;
  function random(seed) { let n = seed >>> 0; return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  class Arena {
    constructor({ seed = 731, size = 20, left = 'pincer', right = 'assault' } = {}) {
      if (![10, 20, 30].includes(size)) throw Error('Size must be 10, 20 or 30.');
      if (![left, right].every(x => ['pincer', 'assault', 'guard'].includes(x))) throw Error('Unknown tactic.');
      this.config = { seed: seed >>> 0, size, left, right }; this.rng = random(seed);
      this.t = 0; this.tick = 0; this.shots = []; this.events = []; this.history = []; this.over = false;
      this.agents = Array.from({ length: size * 2 }, (_, i) => {
        const side = i < size ? 0 : 1, k = i % size;
        return { id: i, side, squad: Math.floor(k / 5), x: side ? 800 - Math.floor(k / 10) * 26 : 100 + Math.floor(k / 10) * 26,
          y: 110 + (k % 10) * 39, hp: 100, cooldown: this.rng() * 1.5, dodge: 0, hits: 0 };
      });
      this.log('DEPLOY', `${size} v ${size} / ${size / 5} linked squads per team`);
    }
    log(type, message) { this.events.push({ tick: this.tick, time: +this.t.toFixed(2), type, message }); }
    alive(side) { return this.agents.filter(a => a.side === side && a.hp > 0); }
    step() {
      if (this.over) return;
      this.tick++; this.t = this.tick * DT;
      if (this.tick === 90) this.log('TACTICS', `${this.config.left} / ${this.config.right} engaged`);
      for (const a of this.agents) {
        if (a.hp <= 0) continue;
        const enemies = this.alive(1 - a.side); if (!enemies.length) continue;
        const target = enemies.reduce((b, e) => Math.hypot(e.x - a.x, e.y - a.y) < Math.hypot(b.x - a.x, b.y - a.y) ? e : b);
        const tactic = a.side ? this.config.right : this.config.left;
        const flank = tactic === 'pincer' && this.t < 8;
        let gx = flank ? 450 + (a.side ? -50 : 50) : target.x;
        let gy = flank ? (a.squad % 2 ? 525 : 65) : target.y;
        let dx = gx - a.x, dy = gy - a.y, dist = Math.hypot(dx, dy) || 1;
        const range = tactic === 'guard' ? 300 : 220;
        let vx = dist > range || flank ? dx / dist : -dx / dist * .14;
        let vy = dist > range || flank ? dy / dist : -dy / dist * .14;
        a.dodge = Math.max(0, a.dodge - DT);
        const threat = this.shots.find(s => s.side !== a.side && Math.hypot(s.x - a.x, s.y - a.y) < 54);
        if (threat && a.dodge === 0 && this.rng() < .1) a.dodge = .35;
        if (a.dodge > 0) { vx += (a.id % 2 ? 1 : -1) * .9; vy += (a.id % 3 ? -1 : 1) * 1.5; }
        for (const b of this.agents) if (b !== a && b.hp > 0) {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 22 && d > 0) { vx += (a.x - b.x) / d * 1.1; vy += (a.y - b.y) / d * 1.1; }
        }
        const speed = tactic === 'assault' ? 50 : 42;
        a.x = Math.max(35, Math.min(865, a.x + vx * speed * DT));
        a.y = Math.max(50, Math.min(550, a.y + vy * speed * DT));
        a.cooldown -= DT;
        const distance = Math.hypot(target.x - a.x, target.y - a.y);
        if (a.cooldown <= 0 && distance < 370 && this.t > 2) {
          const angle = Math.atan2(target.y - a.y, target.x - a.x) + (this.rng() - .5) * .16;
          this.shots.push({ x: a.x, y: a.y, vx: Math.cos(angle) * 255, vy: Math.sin(angle) * 255, side: a.side, owner: a.id, ttl: 2 });
          a.cooldown = (tactic === 'guard' ? 1.5 : 1.2) + this.rng() * .7;
        }
      }
      // Every projectile advances once on a fixed clock, independent of screen FPS.
      for (const s of this.shots) {
        s.x += s.vx * DT; s.y += s.vy * DT; s.ttl -= DT;
        const victim = this.agents.find(a => a.hp > 0 && a.side !== s.side && Math.hypot(a.x - s.x, a.y - s.y) < (a.dodge > 0 ? 6 : 10));
        if (victim) {
          victim.hp = Math.max(0, victim.hp - 24); s.ttl = 0; this.agents[s.owner].hits++;
          if (!victim.hp) this.log('TAG', `${victim.side ? 'B' : 'A'}-${String(victim.id % this.config.size + 1).padStart(2, '0')} eliminated`);
        }
      }
      this.shots = this.shots.filter(s => s.ttl > 0 && s.x >= 0 && s.x <= 900 && s.y >= 0 && s.y <= 600);
      const counts = [this.alive(0).length, this.alive(1).length];
      if (this.tick % 30 === 0) this.history.push({ time: Math.round(this.t), a: counts[0], b: counts[1] });
      if (!counts[0] || !counts[1] || this.tick >= 2700) {
        this.over = true;
        this.result = counts[0] === counts[1] ? 'DRAW' : counts[0] > counts[1] ? 'TEAM A' : 'TEAM B';
        this.log('RESULT', `${this.result} / ${counts.join(' : ')} survivors${this.tick >= 2700 ? ' / time limit' : ''}`);
      }
    }
    export() { return { disclosure: 'Rules-based simulation, not an LLM benchmark. Winner emerges from the seeded rules.', config: this.config, time: this.t, result: this.result || 'IN PROGRESS', agents: this.agents, history: this.history, events: this.events }; }
  }
  const api = { Arena, random, DT }; if (typeof module !== 'undefined') module.exports = api; else root.ArenaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
