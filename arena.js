/**
 * BALL VS BALL: FUSION ARENA — 60fps HTML5 Canvas Auto-Battle Physics Engine
 */
(function (global) {
  'use strict';

  const WORLD = 480;
  const WALL_PAD = 14;
  const SUDDEN_DEATH_TIME = 25;

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function segmentsIntersect(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y) {
    function ccw(p1x, p1y, p2x, p2y, p3x, p3y) {
      return (p3y - p1y) * (p2x - p1x) > (p2y - p1y) * (p3x - p1x);
    }
    return (
      ccw(a1x, a1y, b1x, b1y, b2x, b2y) !== ccw(a2x, a2y, b1x, b1y, b2x, b2y) &&
      ccw(a1x, a1y, a2x, a2y, b1x, b1y) !== ccw(a1x, a1y, a2x, a2y, b2x, b2y)
    );
  }

  function angleDiff(a, b) {
    let d = (b - a + Math.PI) % (Math.PI * 2);
    if (d < 0) d += Math.PI * 2;
    return d - Math.PI;
  }

  const MELEE_TYPES = new Set([
    'sword',
    'spear',
    'dagger',
    'shield',
    'hammer',
    'frost',
    'scythe',
    'phantom',
    'vampire',
  ]);

  function makeWeaponState(weaponType, idx, total) {
    const startAngle = idx * Math.PI + Math.random() * Math.PI * 2;
    return {
      type: weaponType,
      angle: startAngle,
      dir: idx % 2 === 0 ? 1 : -1,
      spinRate: getBaseSpin(weaponType),
      damageBonus: 0,
      reachBonus: 0,
      speedStacks: 0,
      hitCooldowns: Object.create(null),
      clashCooldown: 0,
      fireTimer: 0.45 + idx * 0.25,
      shotCount: 0,
      specialTimer: 1.0 + idx * 0.35,
      zoneRadius: 56,
      laserState: 'idle', // idle | charge | fire
      laserTimer: 1.4,
      laserAngle: startAngle,
      laserSweepDir: 1,
      laserTick: 0,
      orbs: weaponType === 'nova' ? [
        { active: true, respawn: 0 },
        { active: true, respawn: 0 },
        { active: true, respawn: 0 },
      ] : [],
      orbGrowthTimer: 4.5,
      boomerangOut: false,
    };
  }

  function getBaseSpin(weaponType) {
    switch (weaponType) {
      case 'dagger': return 5.8;
      case 'sword': return 3.6;
      case 'spear': return 3.1;
      case 'shield': return 2.9;
      case 'hammer': return 2.55;
      case 'frost': return 3.5;
      case 'scythe': return 3.4;
      case 'phantom': return 4.4;
      case 'vampire': return 3.7;
      case 'nova': return 3.1;
      default: return 2.8;
    }
  }

  function getWeaponLength(f, w) {
    const r = f.radius;
    switch (w.type) {
      case 'sword': return r + 32;
      case 'spear': return r + 42 + Math.min(20, w.reachBonus);
      case 'dagger': return r + 23;
      case 'shield': return r + 15;
      case 'hammer': return r + 35;
      case 'frost': return r + 30;
      case 'scythe': return r + 36;
      case 'phantom': return r + 29;
      case 'vampire': return r + 31;
      default: return r + 26;
    }
  }

  function createFighter(spec, team, x, y, index) {
    const angle = team === 0 ? (Math.random() - 0.5) * 1.1 : Math.PI + (Math.random() - 0.5) * 1.1;
    const spd = spec.speed;
    const weapons = spec.weapons.map(function (wt, idx) {
      return makeWeaponState(wt, idx, spec.weapons.length);
    });
    return {
      uid: 'f_' + team + '_' + index + '_' + Math.floor(Math.random() * 1e6),
      team: team,
      spec: spec,
      name: spec.name,
      isFusion: spec.isFusion,
      color: spec.color,
      color2: spec.color2,
      accent: spec.accent,
      rarity: spec.rarity,
      x: x,
      y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      radius: spec.radius,
      hp: spec.hp,
      maxHp: spec.hp,
      baseSpeed: spec.speed,
      damageMult: spec.damageMult,
      alive: true,
      weapons: weapons,
      // Statuses
      chillStacks: 0,
      chillTimer: 0,
      bleedStacks: 0,
      bleedTick: 0.5,
      stunTimer: 0,
      invulnTimer: 0,
      flashTimer: 0,
      wallBurnCooldown: 0,
      wallSlamBonus: 0,
      // Visual trails & afterimages
      trail: [],
      afterimages: [],
      // Live telemetry
      hitsDealt: 0,
      damageDealt: 0,
      healedTotal: 0,
    };
  }

  function ArenaEngine(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.speedMult = 1;
    this.rafId = null;
    this.lastTime = 0;
    this.running = false;
    this.mode = 'idle';
    this.fighters = [];
    this.projectiles = [];
    this.particles = [];
    this.floats = [];
    this.rings = [];
    this.arcs = [];
    this.tethers = [];
    this.elapsed = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.suddenDeath = false;
    this.shrinkInset = 0;
    this.bannerText = '';
    this.bannerTimer = 0;
    this.fusionIntro = null;
    this.onHud = null;
    this.onFinish = null;
    this.hudAccum = 0;
    this.finished = false;
    this.idlePhase = 0;

    this._resize();
    this._loop = this._loop.bind(this);
  }

  ArenaEngine.prototype._resize = function () {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const cssSize = Math.max(240, Math.round(rect.width || 360));
    const target = Math.round(cssSize * dpr);
    if (this.canvas.width !== target || this.canvas.height !== target) {
      this.canvas.width = target;
      this.canvas.height = target;
    }
    this.scale = target / WORLD;
  };

  ArenaEngine.prototype.setSpeed = function (mult) {
    this.speedMult = mult === 2 ? 2 : 1;
  };

  ArenaEngine.prototype.stop = function () {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  ArenaEngine.prototype.startIdleDemo = function (previewSpecs) {
    this.stop();
    this.mode = 'idle';
    this.finished = false;
    this.fighters = [];
    this.projectiles = [];
    this.particles = [];
    this.floats = [];
    this.rings = [];
    this.arcs = [];
    this.tethers = [];
    this.elapsed = 0;
    this.suddenDeath = false;
    this.shrinkInset = 0;
    this.fusionIntro = null;
    this.bannerText = '';
    this.bannerTimer = 0;

    if (previewSpecs && previewSpecs.length) {
      const specs = previewSpecs.slice(0, 2);
      specs.forEach(function (sp, idx) {
        const x = specs.length === 1 ? WORLD / 2 : (idx === 0 ? WORLD * 0.32 : WORLD * 0.68);
        const f = createFighter(sp, idx, x, WORLD * 0.5, idx);
        f.vx = (idx === 0 ? 1 : -1) * 55;
        f.vy = (idx === 0 ? -1 : 1) * 45;
        this.fighters.push(f);
      }, this);
    }

    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._loop);
  };

  ArenaEngine.prototype.startMatch = function (opts) {
    this.stop();
    this.mode = opts.mode || '1v1';
    this.onHud = opts.onHud || null;
    this.onFinish = opts.onFinish || null;
    this.fighters = [];
    this.projectiles = [];
    this.particles = [];
    this.floats = [];
    this.rings = [];
    this.arcs = [];
    this.tethers = [];
    this.elapsed = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.suddenDeath = false;
    this.shrinkInset = 0;
    this.finished = false;
    this.hudAccum = 0;

    const teamA = opts.teamA || [];
    const teamB = opts.teamB || [];

    teamA.forEach(function (spec, i) {
      const y = teamA.length === 1 ? WORLD * 0.5 : (i === 0 ? WORLD * 0.32 : WORLD * 0.68);
      this.fighters.push(createFighter(spec, 0, WORLD * 0.25, y, i));
    }, this);

    teamB.forEach(function (spec, i) {
      const y = teamB.length === 1 ? WORLD * 0.5 : (i === 0 ? WORLD * 0.32 : WORLD * 0.68);
      this.fighters.push(createFighter(spec, 1, WORLD * 0.75, y, i));
    }, this);

    if (opts.fusionIntro && teamA[0] && teamA[0].isFusion) {
      this.fusionIntro = {
        timer: 0.92,
        duration: 0.92,
        ball1: teamA[0].balls[0],
        ball2: teamA[0].balls[1],
        targetX: WORLD * 0.25,
        targetY: WORLD * 0.5,
      };
      this.bannerText = 'FUSION ACTIVATE!';
      this.bannerTimer = 1.05;
      if (global.BVBAudio) global.BVBAudio.fusion();
    } else {
      this.fusionIntro = null;
      this.bannerText = this.mode === '2v2' ? '2v2 BRAWL!' : 'FIGHT!';
      this.bannerTimer = 0.85;
    }

    this.running = true;
    this.lastTime = performance.now();
    this._emitHud(true);
    this.rafId = requestAnimationFrame(this._loop);
  };

  ArenaEngine.prototype._loop = function (now) {
    if (!this.running) return;
    this._resize();
    const rawDt = Math.min(0.033, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.mode === 'idle') {
      this._updateIdle(rawDt);
      this._render();
      this.rafId = requestAnimationFrame(this._loop);
      return;
    }

    const stepDt = rawDt * this.speedMult;
    const subSteps = this.speedMult === 2 ? 2 : 1;
    const dt = stepDt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this._updateMatch(dt);
    }

    this._render();

    this.hudAccum += rawDt;
    if (this.hudAccum >= 0.08) {
      this.hudAccum = 0;
      this._emitHud(false);
    }

    if (this.running) {
      this.rafId = requestAnimationFrame(this._loop);
    }
  };

  ArenaEngine.prototype._updateIdle = function (dt) {
    this.idlePhase += dt;
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const minP = WALL_PAD + f.radius + 14;
      const maxP = WORLD - WALL_PAD - f.radius - 14;
      if (f.x < minP) { f.x = minP; f.vx = Math.abs(f.vx); }
      if (f.x > maxP) { f.x = maxP; f.vx = -Math.abs(f.vx); }
      if (f.y < minP) { f.y = minP; f.vy = Math.abs(f.vy); }
      if (f.y > maxP) { f.y = maxP; f.vy = -Math.abs(f.vy); }
      f.weapons.forEach(function (w) {
        w.angle += w.spinRate * 0.7 * dt * w.dir;
      });
    }
  };

  ArenaEngine.prototype._updateMatch = function (dt) {
    if (this.bannerTimer > 0) this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);

    // Visual effects always tick
    this._updateParticles(dt);

    if (this.fusionIntro) {
      this.fusionIntro.timer -= dt;
      if (Math.random() < 0.75) {
        this._spawnSparks(
          this.fusionIntro.targetX + (Math.random() - 0.5) * 60,
          this.fusionIntro.targetY + (Math.random() - 0.5) * 60,
          Math.random() < 0.5 ? this.fusionIntro.ball1.color : this.fusionIntro.ball2.color,
          3
        );
      }
      if (this.fusionIntro.timer <= 0) {
        this._spawnRing(this.fusionIntro.targetX, this.fusionIntro.targetY, 18, 95, '#ffffff', 0.35);
        this._spawnSparks(this.fusionIntro.targetX, this.fusionIntro.targetY, this.fusionIntro.ball1.color, 18);
        this._spawnSparks(this.fusionIntro.targetX, this.fusionIntro.targetY, this.fusionIntro.ball2.color, 18);
        this.shake = 7;
        this.fusionIntro = null;
      }
      return;
    }

    if (this.finished) return;

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    this.elapsed += dt;

    // Sudden death trigger
    if (!this.suddenDeath && this.elapsed >= SUDDEN_DEATH_TIME) {
      this.suddenDeath = true;
      this.bannerText = 'SUDDEN DEATH!';
      this.bannerTimer = 1.6;
      this.shake = 6;
      if (global.BVBAudio) global.BVBAudio.suddenDeath();
    }
    if (this.suddenDeath) {
      this.shrinkInset = Math.min(138, (this.elapsed - SUDDEN_DEATH_TIME) * 7.8);
    }

    const alive = this.fighters.filter(function (f) { return f.alive; });

    // Update each fighter
    for (let i = 0; i < alive.length; i++) {
      this._updateFighter(alive[i], dt);
    }

    // Ball-to-ball collisions
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        this._resolveBallCollision(alive[i], alive[j]);
      }
    }

    // Weapon-vs-weapon clashes (melee parries)
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        if (alive[i].team === alive[j].team) continue;
        this._checkWeaponClash(alive[i], alive[j]);
      }
    }

    // Weapon hits against opponents
    for (let i = 0; i < alive.length; i++) {
      const f = alive[i];
      if (!f.alive) continue;
      for (let wIdx = 0; wIdx < f.weapons.length; wIdx++) {
        this._updateWeaponCombat(f, f.weapons[wIdx], dt);
      }
    }

    // Update projectiles & tethers
    this._updateProjectiles(dt);
    this._updateTethers(dt);

    // Check match victory
    const teamAAlive = this.fighters.some(function (f) { return f.team === 0 && f.alive; });
    const teamBAlive = this.fighters.some(function (f) { return f.team === 1 && f.alive; });
    if (!teamAAlive || !teamBAlive) {
      this.finished = true;
      const winnerTeam = teamAAlive ? 0 : (teamBAlive ? 1 : -1);
      this.bannerText = winnerTeam === 0 ? 'VICTORY!' : (winnerTeam === 1 ? 'DEFEAT!' : 'DOUBLE KO!');
      this.bannerTimer = 3.0;
      if (global.BVBAudio) global.BVBAudio.ko(winnerTeam === 0);
      this._emitHud(true);
      if (this.onFinish) {
        const self = this;
        const summary = {
          winnerTeam: winnerTeam,
          elapsed: this.elapsed,
          fighters: this.fighters.map(function (f) {
            return {
              team: f.team,
              name: f.name,
              hp: Math.max(0, Math.ceil(f.hp)),
              maxHp: f.maxHp,
              damageDealt: Math.round(f.damageDealt),
              hitsDealt: f.hitsDealt,
              healedTotal: Math.round(f.healedTotal),
            };
          }),
        };
        setTimeout(function () {
          if (self.onFinish) self.onFinish(summary);
        }, 620);
      }
    }
  };

  ArenaEngine.prototype._findNearestEnemy = function (fighter) {
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < this.fighters.length; i++) {
      const other = this.fighters[i];
      if (!other.alive || other.team === fighter.team) continue;
      const d = dist(fighter.x, fighter.y, other.x, other.y);
      if (d < bestD) {
        bestD = d;
        best = other;
      }
    }
    return best;
  };

  ArenaEngine.prototype._updateFighter = function (f, dt) {
    if (f.flashTimer > 0) f.flashTimer = Math.max(0, f.flashTimer - dt);
    if (f.invulnTimer > 0) f.invulnTimer = Math.max(0, f.invulnTimer - dt);
    if (f.wallBurnCooldown > 0) f.wallBurnCooldown = Math.max(0, f.wallBurnCooldown - dt);
    if (f.wallSlamBonus > 0) f.wallSlamBonus = Math.max(0, f.wallSlamBonus - dt);

    // Decay chill
    if (f.chillTimer > 0) {
      f.chillTimer -= dt;
      if (f.chillTimer <= 0) f.chillStacks = 0;
    }

    // Bleed/poison ticks
    if (f.bleedStacks > 0) {
      f.bleedTick -= dt;
      if (f.bleedTick <= 0) {
        f.bleedTick = 0.55;
        const bleedDmg = Math.max(1, Math.round(f.bleedStacks * 1.6));
        this._applyDamage(null, f, bleedDmg, { color: '#c084fc', label: '-' + bleedDmg + ' ☠', silent: true });
        this._spawnSparks(f.x, f.y, '#a855f7', 4);
        if (!f.alive) return;
      }
    }

    // Stun timer
    const speedFactor = f.stunTimer > 0 ? 0.14 : (1 - Math.min(0.52, f.chillStacks * 0.13));
    if (f.stunTimer > 0) f.stunTimer = Math.max(0, f.stunTimer - dt);

    // Subtle homing steer so balls stay actively engaged
    const target = this._findNearestEnemy(f);
    if (target && f.stunTimer <= 0) {
      const dx = target.x - f.x;
      const dy = target.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      const isRanged = f.weapons.every(function (w) {
        return w.type === 'bow' || w.type === 'cannon' || w.type === 'laser';
      });
      // Ranged balls prefer mid-distance; melee balls close in
      const steerForce = isRanged ? (d < 130 ? -65 : 55) : 95;
      f.vx += (dx / d) * steerForce * dt;
      f.vy += (dy / d) * steerForce * dt;
    }

    // Maintain lively speed bounds
    const curSpd = Math.hypot(f.vx, f.vy) || 1;
    const minSpd = f.baseSpeed * 0.82 * speedFactor;
    const maxSpd = f.baseSpeed * 1.48 * speedFactor;
    if (curSpd < minSpd) {
      f.vx = (f.vx / curSpd) * minSpd;
      f.vy = (f.vy / curSpd) * minSpd;
    } else if (curSpd > maxSpd) {
      f.vx = (f.vx / curSpd) * (curSpd - (curSpd - maxSpd) * Math.min(1, dt * 6));
      f.vy = (f.vy / curSpd) * (curSpd - (curSpd - maxSpd) * Math.min(1, dt * 6));
    }

    f.x += f.vx * dt;
    f.y += f.vy * dt;

    // Wall bounds (shrinking during Sudden Death)
    const minB = WALL_PAD + this.shrinkInset + f.radius;
    const maxB = WORLD - WALL_PAD - this.shrinkInset - f.radius;
    let hitWall = false;

    if (f.x < minB) { f.x = minB; f.vx = Math.abs(f.vx) * 1.02; hitWall = true; }
    else if (f.x > maxB) { f.x = maxB; f.vx = -Math.abs(f.vx) * 1.02; hitWall = true; }
    if (f.y < minB) { f.y = minB; f.vy = Math.abs(f.vy) * 1.02; hitWall = true; }
    else if (f.y > maxB) { f.y = maxB; f.vy = -Math.abs(f.vy) * 1.02; hitWall = true; }

    if (hitWall) {
      this._spawnSparks(f.x, f.y, this.suddenDeath ? '#f43f5e' : f.color, 5);
      if (global.BVBAudio) global.BVBAudio.wallBounce();
      if (f.wallSlamBonus > 0) {
        f.wallSlamBonus = 0;
        this._applyDamage(null, f, 8, { color: '#fb923c', label: 'WALL SLAM -8!' });
        this.shake = Math.max(this.shake, 5);
      }
      if (this.suddenDeath && f.wallBurnCooldown <= 0) {
        f.wallBurnCooldown = 0.42;
        this._applyDamage(null, f, 7, { color: '#f43f5e', label: '-7 🔥' });
        const cx = WORLD / 2 - f.x;
        const cy = WORLD / 2 - f.y;
        const cd = Math.hypot(cx, cy) || 1;
        f.vx += (cx / cd) * 110;
        f.vy += (cy / cd) * 110;
      }
    }

    // Trail update
    f.trail.push({ x: f.x, y: f.y, a: 0.45 });
    if (f.trail.length > 9) f.trail.shift();
    for (let t = 0; t < f.trail.length; t++) {
      f.trail[t].a -= dt * 1.2;
    }

    // Afterimages decay
    for (let a = f.afterimages.length - 1; a >= 0; a--) {
      f.afterimages[a].alpha -= dt * 2.2;
      if (f.afterimages[a].alpha <= 0) f.afterimages.splice(a, 1);
    }

    // Tick weapon cooldowns
    for (let wIdx = 0; wIdx < f.weapons.length; wIdx++) {
      const w = f.weapons[wIdx];
      if (w.clashCooldown > 0) w.clashCooldown = Math.max(0, w.clashCooldown - dt);
      const keys = Object.keys(w.hitCooldowns);
      for (let k = 0; k < keys.length; k++) {
        w.hitCooldowns[keys[k]] -= dt;
        if (w.hitCooldowns[keys[k]] <= 0) delete w.hitCooldowns[keys[k]];
      }
      // Spin melee & orbiting weapons
      const spinSlow = 1 - Math.min(0.5, f.chillStacks * 0.12);
      if (w.type === 'bow' || w.type === 'cannon') {
        if (target) {
          const desired = Math.atan2(target.y - f.y, target.x - f.x);
          w.angle += angleDiff(w.angle, desired) * Math.min(1, dt * 8);
        }
      } else if (w.type !== 'laser' || w.laserState === 'idle') {
        const mult = w.type === 'dagger' ? (1 + Math.min(2.2, w.speedStacks * 0.14)) : 1;
        w.angle += w.spinRate * mult * spinSlow * dt * w.dir;
      }
    }
  };

  ArenaEngine.prototype._resolveBallCollision = function (a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const minD = a.radius + b.radius;
    if (d >= minD) return;

    const nx = dx / d;
    const ny = dy / d;
    const overlap = minD - d;
    a.x -= nx * overlap * 0.52;
    a.y -= ny * overlap * 0.52;
    b.x += nx * overlap * 0.52;
    b.y += ny * overlap * 0.52;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velAlong = rvx * nx + rvy * ny;
    if (velAlong < 0) {
      const impulse = -(1.85) * velAlong * 0.5;
      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;
      this._spawnSparks((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, '#ffffff', 6);
      if (global.BVBAudio) global.BVBAudio.wallBounce();
    }
  };

  ArenaEngine.prototype._getMeleeSegment = function (f, w) {
    const len = getWeaponLength(f, w);
    const x1 = f.x + Math.cos(w.angle) * (f.radius * 0.55);
    const y1 = f.y + Math.sin(w.angle) * (f.radius * 0.55);
    const x2 = f.x + Math.cos(w.angle) * len;
    const y2 = f.y + Math.sin(w.angle) * len;
    return { x1: x1, y1: y1, x2: x2, y2: y2 };
  };

  ArenaEngine.prototype._checkWeaponClash = function (a, b) {
    for (let i = 0; i < a.weapons.length; i++) {
      const wa = a.weapons[i];
      if (!MELEE_TYPES.has(wa.type) || wa.clashCooldown > 0) continue;
      const sa = this._getMeleeSegment(a, wa);
      for (let j = 0; j < b.weapons.length; j++) {
        const wb = b.weapons[j];
        if (!MELEE_TYPES.has(wb.type) || wb.clashCooldown > 0) continue;
        const sb = this._getMeleeSegment(b, wb);

        const hit =
          segmentsIntersect(sa.x1, sa.y1, sa.x2, sa.y2, sb.x1, sb.y1, sb.x2, sb.y2) ||
          distToSegment(sa.x2, sa.y2, sb.x1, sb.y1, sb.x2, sb.y2) < 10 ||
          distToSegment(sb.x2, sb.y2, sa.x1, sa.y1, sa.x2, sa.y2) < 10;

        if (hit) {
          wa.dir *= -1;
          wb.dir *= -1;
          wa.clashCooldown = 0.28;
          wb.clashCooldown = 0.28;
          const mx = (sa.x2 + sb.x2) * 0.5;
          const my = (sa.y2 + sb.y2) * 0.5;
          this._spawnSparks(mx, my, '#fef08a', 14);
          this._spawnRing(mx, my, 4, 28, '#fef08a', 0.2);
          this._spawnFloat(mx, my - 10, 'PARRY!', '#fef08a', true);
          this.hitStop = 0.04;
          this.shake = Math.max(this.shake, 4.2);

          // Push balls apart slightly
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const push = (wa.type === 'shield' || wb.type === 'shield') ? 165 : 95;
          a.vx -= (dx / d) * push;
          a.vy -= (dy / d) * push;
          b.vx += (dx / d) * push;
          b.vy += (dy / d) * push;

          if (wa.type === 'shield') wa.damageBonus += 2;
          if (wb.type === 'shield') wb.damageBonus += 2;

          if (global.BVBAudio) global.BVBAudio.clang();
        }
      }
    }
  };

  ArenaEngine.prototype._updateWeaponCombat = function (f, w, dt) {
    const enemies = this.fighters.filter(function (o) {
      return o.alive && o.team !== f.team;
    });
    if (!enemies.length) return;

    const baseBall = global.BVBData.getBall(w.type);
    const baseDmg = (baseBall ? baseBall.baseDamage : 10) * f.damageMult;

    // 1. MELEE WEAPONS
    if (MELEE_TYPES.has(w.type)) {
      const segs = [this._getMeleeSegment(f, w)];
      if (w.type === 'dagger') {
        const opp = { angle: w.angle + Math.PI, type: 'dagger', reachBonus: 0 };
        segs.push(this._getMeleeSegment(f, opp));
      }

      for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
        const enemy = enemies[eIdx];
        if (w.hitCooldowns[enemy.uid]) continue;

        let touched = false;
        for (let s = 0; s < segs.length; s++) {
          const seg = segs[s];
          const hitPad = w.type === 'hammer' || w.type === 'scythe' ? 8 : (w.type === 'shield' ? 9 : 5);
          if (distToSegment(enemy.x, enemy.y, seg.x1, seg.y1, seg.x2, seg.y2) <= enemy.radius + hitPad) {
            touched = true;
            break;
          }
        }
        if (!touched) continue;

        const cd = w.type === 'dagger' ? 0.16 : (w.type === 'hammer' ? 0.42 : 0.28);
        w.hitCooldowns[enemy.uid] = cd;
        w.dir *= -1;

        let dmg = Math.round(baseDmg + w.damageBonus);
        let heavy = false;

        if (w.type === 'sword') {
          w.damageBonus += 3;
        } else if (w.type === 'spear') {
          w.reachBonus = Math.min(20, w.reachBonus + 4);
          f.baseSpeed = Math.min(340, f.baseSpeed + 12);
          w.damageBonus += 1.5;
        } else if (w.type === 'dagger') {
          w.speedStacks += 1;
          w.damageBonus += 0.6;
        } else if (w.type === 'shield') {
          w.damageBonus += 2;
          heavy = true;
          const dx = enemy.x - f.x;
          const dy = enemy.y - f.y;
          const d = Math.hypot(dx, dy) || 1;
          enemy.vx += (dx / d) * 240;
          enemy.vy += (dy / d) * 240;
        } else if (w.type === 'hammer') {
          heavy = true;
          w.damageBonus += 2;
          const dx = enemy.x - f.x;
          const dy = enemy.y - f.y;
          const d = Math.hypot(dx, dy) || 1;
          enemy.vx += (dx / d) * 280;
          enemy.vy += (dy / d) * 280;
          enemy.wallSlamBonus = 0.65;
          this._spawnRing(enemy.x, enemy.y, 10, 74, '#fb923c', 0.3);
          this.shake = Math.max(this.shake, 7);
          if (global.BVBAudio) global.BVBAudio.explosion();
        } else if (w.type === 'frost') {
          enemy.chillStacks += 1;
          enemy.chillTimer = 3.2;
          if (global.BVBAudio) global.BVBAudio.freeze();
          if (enemy.chillStacks >= 4) {
            enemy.chillStacks = 0;
            dmg += Math.round(14 * f.damageMult);
            heavy = true;
            this._spawnRing(enemy.x, enemy.y, 8, 62, '#67e8f9', 0.28);
            this._spawnFloat(enemy.x, enemy.y - 28, 'SHATTER!', '#67e8f9', true);
          }
        } else if (w.type === 'scythe') {
          enemy.bleedStacks += 1;
          this._spawnFloat(enemy.x, enemy.y - 26, 'BLEED ×' + enemy.bleedStacks, '#c084fc', false);
        } else if (w.type === 'vampire') {
          w.damageBonus += 2;
          const heal = Math.max(2, Math.round(dmg * 0.55));
          this._healFighter(f, heal, enemy.x, enemy.y);
        } else if (w.type === 'phantom') {
          w.damageBonus += 1.5;
        }

        this._applyDamage(f, enemy, dmg, { heavy: heavy, color: f.color });
        this.hitStop = heavy ? 0.05 : 0.028;
      }

      // Phantom periodic Phase Blink!
      if (w.type === 'phantom') {
        w.specialTimer -= dt;
        if (w.specialTimer <= 0) {
          w.specialTimer = 2.35;
          const target = this._findNearestEnemy(f);
          if (target) {
            for (let k = 0; k < 3; k++) {
              f.afterimages.push({ x: f.x, y: f.y, alpha: 0.7 - k * 0.18, radius: f.radius });
            }
            const ang = Math.atan2(target.y - f.y, target.x - f.x);
            const blinkDist = Math.min(130, dist(f.x, f.y, target.x, target.y) + 34);
            const minB = WALL_PAD + this.shrinkInset + f.radius;
            const maxB = WORLD - WALL_PAD - this.shrinkInset - f.radius;
            f.x = clamp(f.x + Math.cos(ang) * blinkDist, minB, maxB);
            f.y = clamp(f.y + Math.sin(ang) * blinkDist, minB, maxB);
            f.invulnTimer = 0.55;
            this._spawnRing(f.x, f.y, 6, 42, '#818cf8', 0.25);
            this._spawnFloat(f.x, f.y - 26, 'BLINK!', '#a5b4fc', false);
            if (dist(f.x, f.y, target.x, target.y) < 76) {
              const crit = Math.round((baseDmg + w.damageBonus) * 1.25);
              this._applyDamage(f, target, crit, { color: '#818cf8', label: 'CRIT -' + crit });
            }
          }
        }
      }
      return;
    }

    // 2. BOW — Multi-arrow Volley
    if (w.type === 'bow') {
      w.fireTimer -= dt;
      if (w.fireTimer <= 0) {
        const target = this._findNearestEnemy(f);
        if (!target) return;
        w.shotCount += 1;
        const arrows = Math.min(5, 1 + Math.floor(w.shotCount / 3));
        const rate = Math.max(0.42, 0.92 - w.shotCount * 0.035);
        w.fireTimer = rate;
        const aim = Math.atan2(target.y - f.y, target.x - f.x);
        const spread = 0.16;
        for (let i = 0; i < arrows; i++) {
          const offset = (i - (arrows - 1) * 0.5) * spread;
          const a = aim + offset;
          this.projectiles.push({
            kind: 'arrow',
            owner: f,
            team: f.team,
            x: f.x + Math.cos(a) * (f.radius + 8),
            y: f.y + Math.sin(a) * (f.radius + 8),
            vx: Math.cos(a) * 390,
            vy: Math.sin(a) * 390,
            damage: Math.round(baseDmg + Math.floor(w.shotCount * 0.5)),
            color: '#38bdf8',
            radius: 5,
            life: 2.2,
          });
        }
        if (global.BVBAudio) global.BVBAudio.arrow();
      }
      return;
    }

    // 3. BOOMERANG — Curving Piercing Blade
    if (w.type === 'boomerang') {
      w.fireTimer -= dt;
      if (w.fireTimer <= 0 && !w.boomerangOut) {
        const target = this._findNearestEnemy(f);
        if (!target) return;
        w.boomerangOut = true;
        w.fireTimer = 0.35;
        const aim = Math.atan2(target.y - f.y, target.x - f.x);
        this.projectiles.push({
          kind: 'boomerang',
          owner: f,
          weapon: w,
          team: f.team,
          x: f.x + Math.cos(aim) * (f.radius + 10),
          y: f.y + Math.sin(aim) * (f.radius + 10),
          vx: Math.cos(aim) * 340,
          vy: Math.sin(aim) * 340,
          damage: Math.round(baseDmg + w.damageBonus),
          color: '#2dd4bf',
          radius: 12,
          spin: 0,
          age: 0,
          returning: false,
          hitSetOut: Object.create(null),
          hitSetBack: Object.create(null),
          life: 3.4,
        });
        if (global.BVBAudio) global.BVBAudio.arrow();
      }
      return;
    }

    // 4. CANNON — Explosive AoE Shells + Recoil Dash
    if (w.type === 'cannon') {
      w.fireTimer -= dt;
      if (w.fireTimer <= 0) {
        const target = this._findNearestEnemy(f);
        if (!target) return;
        w.fireTimer = 1.25;
        w.damageBonus += 1;
        const aim = Math.atan2(target.y - f.y, target.x - f.x);
        // Recoil dash!
        f.vx -= Math.cos(aim) * 125;
        f.vy -= Math.sin(aim) * 125;
        this.projectiles.push({
          kind: 'shell',
          owner: f,
          team: f.team,
          x: f.x + Math.cos(aim) * (f.radius + 12),
          y: f.y + Math.sin(aim) * (f.radius + 12),
          vx: Math.cos(aim) * 285,
          vy: Math.sin(aim) * 285,
          damage: Math.round(baseDmg + w.damageBonus),
          color: '#ef4444',
          radius: 9,
          life: 2.0,
        });
        this._spawnSparks(f.x + Math.cos(aim) * f.radius, f.y + Math.sin(aim) * f.radius, '#fbbf24', 8);
        if (global.BVBAudio) global.BVBAudio.hit(true);
      }
      return;
    }

    // 5. CONDUCTOR — Chain Lightning & Periodic Shock
    if (w.type === 'conductor') {
      w.specialTimer -= dt;
      if (w.specialTimer <= 0) {
        w.specialTimer = 1.45;
        w.damageBonus += 2;
        const dmg = Math.round(baseDmg + w.damageBonus);
        let prevX = f.x;
        let prevY = f.y;
        const sorted = enemies.slice().sort(function (a, b) {
          return dist(f.x, f.y, a.x, a.y) - dist(f.x, f.y, b.x, b.y);
        });
        let zappedAny = false;
        for (let i = 0; i < sorted.length; i++) {
          const enemy = sorted[i];
          if (dist(prevX, prevY, enemy.x, enemy.y) <= 235) {
            zappedAny = true;
            this.arcs.push({
              x1: prevX,
              y1: prevY,
              x2: enemy.x,
              y2: enemy.y,
              color: '#facc15',
              life: 0.24,
              maxLife: 0.24,
            });
            this._applyDamage(f, enemy, dmg, { color: '#facc15', label: '⚡-' + dmg });
            prevX = enemy.x;
            prevY = enemy.y;
          }
        }
        if (zappedAny) {
          this._spawnRing(f.x, f.y, f.radius, f.radius + 45, '#facc15', 0.24);
          if (global.BVBAudio) global.BVBAudio.lightning();
        }
      }
      return;
    }

    // 6. SHACKLES — Tether, Pull & Brief Stun
    if (w.type === 'shackles') {
      w.fireTimer -= dt;
      if (w.fireTimer <= 0) {
        const target = this._findNearestEnemy(f);
        if (!target) return;
        w.fireTimer = 2.05;
        w.damageBonus += 2;
        const d = dist(f.x, f.y, target.x, target.y);
        if (d <= 270) {
          const dmg = Math.round(baseDmg + w.damageBonus);
          target.stunTimer = 0.5;
          const ang = Math.atan2(f.y - target.y, f.x - target.x);
          target.vx = Math.cos(ang) * 260;
          target.vy = Math.sin(ang) * 260;
          this.tethers.push({
            from: f,
            to: target,
            life: 0.65,
            maxLife: 0.65,
            color: '#f97316',
          });
          this._applyDamage(f, target, dmg, { color: '#f97316', label: 'YANK -' + dmg });
          this._spawnFloat(target.x, target.y - 30, 'STUN!', '#fdba74', true);
          if (global.BVBAudio) global.BVBAudio.clang();
        }
      }
      return;
    }

    // 7. ZONE — Expanding Pulsing Energy Ring
    if (w.type === 'zone') {
      w.zoneRadius = Math.min(138, w.zoneRadius + dt * 4.8);
      w.specialTimer -= dt;
      if (w.specialTimer <= 0) {
        w.specialTimer = 0.85;
        w.damageBonus += 1;
        this._spawnRing(f.x, f.y, f.radius, w.zoneRadius, '#eab308', 0.35);
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (dist(f.x, f.y, enemy.x, enemy.y) <= w.zoneRadius + enemy.radius) {
            const dmg = Math.round(baseDmg + w.damageBonus * 0.7);
            enemy.chillStacks = Math.min(3, enemy.chillStacks + 1);
            enemy.chillTimer = 1.4;
            this._applyDamage(f, enemy, dmg, { color: '#facc15', label: '-' + dmg });
          }
        }
      }
      return;
    }

    // 8. LASER — Charge & Sweep High-Damage Beam Across Arena
    if (w.type === 'laser') {
      w.laserTimer -= dt;
      if (w.laserState === 'idle') {
        if (w.laserTimer <= 0) {
          const target = this._findNearestEnemy(f);
          w.laserState = 'charge';
          w.laserTimer = 0.58;
          w.laserSweepDir = Math.random() < 0.5 ? 1 : -1;
          const aim = target ? Math.atan2(target.y - f.y, target.x - f.x) : w.angle;
          w.laserAngle = aim - w.laserSweepDir * 0.45;
          w.angle = w.laserAngle;
        }
      } else if (w.laserState === 'charge') {
        if (w.laserTimer <= 0) {
          w.laserState = 'fire';
          w.laserTimer = 0.72;
          w.laserTick = 0;
          w.damageBonus += 2;
          this.shake = Math.max(this.shake, 5);
          if (global.BVBAudio) global.BVBAudio.laser();
        }
      } else if (w.laserState === 'fire') {
        w.laserAngle += w.laserSweepDir * 1.45 * dt;
        w.angle = w.laserAngle;
        w.laserTick -= dt;
        if (w.laserTick <= 0) {
          w.laserTick = 0.14;
          const bx2 = f.x + Math.cos(w.laserAngle) * 620;
          const by2 = f.y + Math.sin(w.laserAngle) * 620;
          for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (distToSegment(enemy.x, enemy.y, f.x, f.y, bx2, by2) <= enemy.radius + 9) {
              const dmg = Math.round((baseDmg + w.damageBonus) * 0.48);
              this._applyDamage(f, enemy, dmg, { color: '#ec4899', label: '-' + dmg });
              this._spawnSparks(enemy.x, enemy.y, '#f472b6', 6);
            }
          }
        }
        if (w.laserTimer <= 0) {
          w.laserState = 'idle';
          w.laserTimer = 1.35;
        }
      }
      return;
    }

    // 9. NOVA — Orbiting Plasma Spheres That Burst & Multiply
    if (w.type === 'nova') {
      w.orbGrowthTimer -= dt;
      if (w.orbGrowthTimer <= 0 && w.orbs.length < 6) {
        w.orbGrowthTimer = 4.2;
        w.orbs.push({ active: true, respawn: 0 });
        this._spawnFloat(f.x, f.y - 30, '+1 NOVA ORB!', '#f0abfc', true);
      }
      const orbitR = f.radius + 26;
      for (let idx = 0; idx < w.orbs.length; idx++) {
        const orb = w.orbs[idx];
        if (!orb.active) {
          orb.respawn -= dt;
          if (orb.respawn <= 0) orb.active = true;
          continue;
        }
        const a = w.angle + (idx / w.orbs.length) * Math.PI * 2;
        const ox = f.x + Math.cos(a) * orbitR;
        const oy = f.y + Math.sin(a) * orbitR;
        for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
          const enemy = enemies[eIdx];
          if (dist(ox, oy, enemy.x, enemy.y) <= enemy.radius + 11) {
            orb.active = false;
            orb.respawn = 1.65;
            w.damageBonus += 1.5;
            const dmg = Math.round(baseDmg + w.damageBonus);
            this._applyDamage(f, enemy, dmg, { color: '#d946ef', heavy: true });
            this._spawnRing(ox, oy, 4, 48, '#e879f9', 0.25);
            this._spawnSparks(ox, oy, '#f0abfc', 12);
            if (global.BVBAudio) global.BVBAudio.explosion();
            break;
          }
        }
      }
    }
  };

  ArenaEngine.prototype._updateProjectiles = function (dt) {
    const minB = WALL_PAD + this.shrinkInset;
    const maxB = WORLD - WALL_PAD - this.shrinkInset;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      if (p.kind === 'boomerang') {
        p.age += dt;
        p.spin += dt * 16;
        if (!p.returning && p.age >= 0.52) {
          p.returning = true;
        }
        if (p.returning && p.owner && p.owner.alive) {
          const dx = p.owner.x - p.x;
          const dy = p.owner.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          p.vx += (dx / d) * 1100 * dt;
          p.vy += (dy / d) * 1100 * dt;
          const sp = Math.hypot(p.vx, p.vy) || 1;
          if (sp > 390) {
            p.vx = (p.vx / sp) * 390;
            p.vy = (p.vy / sp) * 390;
          }
          if (d < p.owner.radius + 14) {
            if (p.weapon) {
              p.weapon.boomerangOut = false;
              p.weapon.damageBonus += 3;
            }
            this._spawnFloat(p.owner.x, p.owner.y - 24, '+3 CATCH', '#5eead4', false);
            this.projectiles.splice(i, 1);
            continue;
          }
        } else {
          // Slight lateral curve on outgoing arc
          const perpX = -p.vy * 0.55 * dt;
          const perpY = p.vx * 0.55 * dt;
          p.vx += perpX;
          p.vy += perpY;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wall interaction
      if (p.x < minB || p.x > maxB || p.y < minB || p.y > maxB) {
        if (p.kind === 'shell') {
          this._detonateShell(p);
          this.projectiles.splice(i, 1);
          continue;
        } else if (p.kind === 'boomerang') {
          p.returning = true;
          p.x = clamp(p.x, minB, maxB);
          p.y = clamp(p.y, minB, maxB);
        } else {
          this._spawnSparks(p.x, p.y, p.color, 5);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.life <= 0) {
        if (p.kind === 'boomerang' && p.weapon) p.weapon.boomerangOut = false;
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check hits on enemy fighters (and Shield reflection!)
      let removed = false;
      for (let fIdx = 0; fIdx < this.fighters.length; fIdx++) {
        const target = this.fighters[fIdx];
        if (!target.alive || target.team === p.team) continue;

        // Check Shield reflection first
        let reflected = false;
        for (let wIdx = 0; wIdx < target.weapons.length; wIdx++) {
          const tw = target.weapons[wIdx];
          if (tw.type !== 'shield') continue;
          const dToTarget = dist(p.x, p.y, target.x, target.y);
          if (dToTarget <= target.radius + 22 && dToTarget >= target.radius - 4) {
            const angToP = Math.atan2(p.y - target.y, p.x - target.x);
            if (Math.abs(angleDiff(tw.angle, angToP)) < 1.05 && p.kind !== 'boomerang') {
              p.team = target.team;
              p.owner = target;
              p.vx = -p.vx * 1.15;
              p.vy = -p.vy * 1.15;
              p.color = '#60a5fa';
              tw.damageBonus += 2;
              this._spawnSparks(p.x, p.y, '#93c5fd', 12);
              this._spawnFloat(target.x, target.y - 26, 'REFLECT!', '#60a5fa', true);
              if (global.BVBAudio) global.BVBAudio.clang();
              reflected = true;
              break;
            }
          }
        }
        if (reflected) break;

        if (dist(p.x, p.y, target.x, target.y) <= target.radius + p.radius) {
          if (p.kind === 'boomerang') {
            const hitMap = p.returning ? p.hitSetBack : p.hitSetOut;
            if (!hitMap[target.uid]) {
              hitMap[target.uid] = true;
              this._applyDamage(p.owner, target, p.damage, { color: p.color });
            }
          } else if (p.kind === 'shell') {
            this._detonateShell(p);
            this.projectiles.splice(i, 1);
            removed = true;
            break;
          } else {
            this._applyDamage(p.owner, target, p.damage, { color: p.color });
            this.projectiles.splice(i, 1);
            removed = true;
            break;
          }
        }
      }
      if (removed) continue;
    }
  };

  ArenaEngine.prototype._detonateShell = function (p) {
    const blastR = 68;
    this._spawnRing(p.x, p.y, 6, blastR, '#ef4444', 0.32);
    this._spawnRing(p.x, p.y, 4, blastR * 0.65, '#fbbf24', 0.24);
    this._spawnSparks(p.x, p.y, '#fb923c', 18);
    this.shake = Math.max(this.shake, 7);
    if (global.BVBAudio) global.BVBAudio.explosion();

    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      if (!f.alive || f.team === p.team) continue;
      const d = dist(p.x, p.y, f.x, f.y);
      if (d <= blastR + f.radius) {
        const dx = f.x - p.x;
        const dy = f.y - p.y;
        const nd = Math.hypot(dx, dy) || 1;
        f.vx += (dx / nd) * 210;
        f.vy += (dy / nd) * 210;
        this._applyDamage(p.owner, f, p.damage, { heavy: true, color: '#ef4444' });
      }
    }
  };

  ArenaEngine.prototype._updateTethers = function (dt) {
    for (let i = this.tethers.length - 1; i >= 0; i--) {
      const t = this.tethers[i];
      t.life -= dt;
      if (t.life <= 0 || !t.from.alive || !t.to.alive) {
        this.tethers.splice(i, 1);
      }
    }
  };

  ArenaEngine.prototype._healFighter = function (f, amount, fromX, fromY) {
    if (!f.alive) return;
    const actual = Math.min(amount, f.maxHp - f.hp);
    f.hp = Math.min(f.maxHp, f.hp + amount);
    f.healedTotal += actual > 0 ? actual : amount;
    this._spawnFloat(f.x, f.y - 26, '+' + amount, '#4ade80', false);
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: fromX + (Math.random() - 0.5) * 16,
        y: fromY + (Math.random() - 0.5) * 16,
        vx: (f.x - fromX) * 2.6 + (Math.random() - 0.5) * 40,
        vy: (f.y - fromY) * 2.6 + (Math.random() - 0.5) * 40,
        color: '#f43f5e',
        size: 3.4,
        life: 0.36,
        maxLife: 0.36,
      });
    }
    if (global.BVBAudio) global.BVBAudio.drain();
  };

  ArenaEngine.prototype._applyDamage = function (attacker, victim, amount, opts) {
    if (!victim.alive) return;
    if (victim.invulnTimer > 0 && attacker) {
      this._spawnFloat(victim.x, victim.y - 22, 'DODGE', '#a5b4fc', false);
      return;
    }
    const dmg = Math.max(1, Math.round(amount));
    victim.hp -= dmg;
    victim.flashTimer = 0.12;

    if (attacker) {
      attacker.hitsDealt += 1;
      attacker.damageDealt += dmg;
      // If fused with Vampire, heal from OTHER weapon's hits too!
      if (attacker.isFusion && attacker.weapons.some(function (w) { return w.type === 'vampire'; })) {
        if (!opts || !opts._fromVamp) {
          const vampHeal = Math.max(1, Math.round(dmg * 0.25));
          this._healFighter(attacker, vampHeal, victim.x, victim.y);
        }
      }
    }

    const color = (opts && opts.color) || '#ffffff';
    const label = (opts && opts.label) || ('-' + dmg);
    const heavy = Boolean(opts && opts.heavy);
    this._spawnFloat(victim.x + (Math.random() - 0.5) * 14, victim.y - victim.radius - 6, label, color, heavy);
    this._spawnSparks(victim.x, victim.y, color, heavy ? 14 : 7);

    if (!opts || !opts.silent) {
      if (global.BVBAudio) global.BVBAudio.hit(heavy);
    }
    if (heavy) {
      this.shake = Math.max(this.shake, 5.5);
    }

    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.alive = false;
      this.shake = 10;
      this.hitStop = 0.085;
      this._spawnRing(victim.x, victim.y, 8, 95, victim.color, 0.42);
      this._spawnSparks(victim.x, victim.y, victim.color, 30);
      this._spawnSparks(victim.x, victim.y, '#ffffff', 14);
      this._spawnFloat(victim.x, victim.y - 12, 'K.O.!', '#f43f5e', true);
    }
  };

  ArenaEngine.prototype._spawnSparks = function (x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 65 + Math.random() * 195;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: color,
        size: 2 + Math.random() * 2.8,
        life: 0.24 + Math.random() * 0.28,
        maxLife: 0.52,
      });
    }
  };

  ArenaEngine.prototype._spawnRing = function (x, y, r0, r1, color, duration) {
    this.rings.push({ x: x, y: y, r0: r0, r1: r1, color: color, life: duration, maxLife: duration });
  };

  ArenaEngine.prototype._spawnFloat = function (x, y, text, color, big) {
    this.floats.push({
      x: x,
      y: y,
      vy: big ? -58 : -44,
      text: text,
      color: color,
      big: Boolean(big),
      life: big ? 0.85 : 0.68,
      maxLife: big ? 0.85 : 0.68,
    });
  };

  ArenaEngine.prototype._updateParticles = function (dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].life -= dt;
      if (this.rings[i].life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const fl = this.floats[i];
      fl.life -= dt;
      fl.y += fl.vy * dt;
      fl.vy *= 0.96;
      if (fl.life <= 0) this.floats.splice(i, 1);
    }
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].life -= dt;
      if (this.arcs[i].life <= 0) this.arcs.splice(i, 1);
    }
  };

  ArenaEngine.prototype._emitHud = function (force) {
    if (!this.onHud) return;
    this.onHud({
      elapsed: this.elapsed,
      suddenDeath: this.suddenDeath,
      finished: this.finished,
      fighters: this.fighters.map(function (f) {
        const bonusDmg = f.weapons.reduce(function (s, w) { return s + w.damageBonus; }, 0);
        return {
          uid: f.uid,
          team: f.team,
          name: f.name,
          isFusion: f.isFusion,
          color: f.color,
          color2: f.color2,
          rarity: f.rarity,
          hp: Math.max(0, Math.ceil(f.hp)),
          maxHp: f.maxHp,
          alive: f.alive,
          hitsDealt: f.hitsDealt,
          damageDealt: Math.round(f.damageDealt),
          bonusDmg: Math.round(bonusDmg),
          bleedStacks: f.bleedStacks,
          chillStacks: f.chillStacks,
        };
      }),
    }, force);
  };

  // ===================== RENDERING =====================
  ArenaEngine.prototype._render = function () {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.scale, this.scale);

    // Background obsidian gradient
    const bgGrad = ctx.createRadialGradient(WORLD / 2, WORLD / 2, 20, WORLD / 2, WORLD / 2, WORLD * 0.72);
    bgGrad.addColorStop(0, '#12182b');
    bgGrad.addColorStop(1, '#080b13');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, WORLD, WORLD);

    // Screen shake transform
    if (this.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    // Subtle tactical grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.065)';
    ctx.lineWidth = 1;
    const step = 40;
    ctx.beginPath();
    for (let g = WALL_PAD; g <= WORLD - WALL_PAD; g += step) {
      ctx.moveTo(g, WALL_PAD);
      ctx.lineTo(g, WORLD - WALL_PAD);
      ctx.moveTo(WALL_PAD, g);
      ctx.lineTo(WORLD - WALL_PAD, g);
    }
    ctx.stroke();

    // Arena outer border
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(WALL_PAD, WALL_PAD, WORLD - WALL_PAD * 2, WORLD - WALL_PAD * 2);

    // Sudden Death shrinking laser wall + spikes
    if (this.suddenDeath && this.shrinkInset > 0) {
      const ins = WALL_PAD + this.shrinkInset;
      const innerSize = WORLD - ins * 2;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
      ctx.fillRect(WALL_PAD, WALL_PAD, WORLD - WALL_PAD * 2, this.shrinkInset);
      ctx.fillRect(WALL_PAD, WORLD - ins, WORLD - WALL_PAD * 2, this.shrinkInset);
      ctx.fillRect(WALL_PAD, ins, this.shrinkInset, innerSize);
      ctx.fillRect(WORLD - ins, ins, this.shrinkInset, innerSize);

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.strokeRect(ins, ins, innerSize, innerSize);
      ctx.shadowBlur = 0;

      // Sawtooth spikes on inner edge
      ctx.fillStyle = '#fb7185';
      const tooth = 12;
      for (let x = ins; x < WORLD - ins - tooth; x += tooth) {
        ctx.beginPath();
        ctx.moveTo(x, ins);
        ctx.lineTo(x + tooth / 2, ins + 7);
        ctx.lineTo(x + tooth, ins);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, WORLD - ins);
        ctx.lineTo(x + tooth / 2, WORLD - ins - 7);
        ctx.lineTo(x + tooth, WORLD - ins);
        ctx.fill();
      }
      for (let y = ins; y < WORLD - ins - tooth; y += tooth) {
        ctx.beginPath();
        ctx.moveTo(ins, y);
        ctx.lineTo(ins + 7, y + tooth / 2);
        ctx.lineTo(ins, y + tooth);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(WORLD - ins, y);
        ctx.lineTo(WORLD - ins - 7, y + tooth / 2);
        ctx.lineTo(WORLD - ins, y + tooth);
        ctx.fill();
      }
    }

    // Center emblem watermark
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(WORLD / 2, WORLD / 2, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Expanding rings (shockwaves, zone pulses, explosions)
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      const p = 1 - r.life / r.maxLife;
      const rad = r.r0 + (r.r1 - r.r0) * p;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * (1 - p * 0.5);
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Zone persistent aura rings (underneath balls)
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      if (!f.alive) continue;
      for (let wIdx = 0; wIdx < f.weapons.length; wIdx++) {
        const w = f.weapons[wIdx];
        if (w.type === 'zone') {
          ctx.save();
          ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.arc(f.x, f.y, w.zoneRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Shackles tethers
    for (let i = 0; i < this.tethers.length; i++) {
      const t = this.tethers[i];
      ctx.save();
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 5]);
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(t.from.x, t.from.y);
      ctx.lineTo(t.to.x, t.to.y);
      ctx.stroke();
      ctx.restore();
    }

    // Fusion Intro Spiral Animation
    if (this.fusionIntro) {
      const fi = this.fusionIntro;
      const progress = 1 - fi.timer / fi.duration;
      const orbitDist = (1 - progress) * 86;
      const ang = progress * Math.PI * 4.5;
      const b1x = fi.targetX + Math.cos(ang) * orbitDist;
      const b1y = fi.targetY + Math.sin(ang) * orbitDist;
      const b2x = fi.targetX - Math.cos(ang) * orbitDist;
      const b2y = fi.targetY - Math.sin(ang) * orbitDist;

      [
        { x: b1x, y: b1y, c: fi.ball1.color },
        { x: b2x, y: b2y, c: fi.ball2.color },
      ].forEach(function (item) {
        ctx.save();
        ctx.shadowColor = item.c;
        ctx.shadowBlur = 18;
        ctx.fillStyle = item.c;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 19, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else {
      // Fighters & weapons
      for (let i = 0; i < this.fighters.length; i++) {
        const f = this.fighters[i];
        if (!f.alive) continue;
        this._drawFighter(ctx, f);
      }
    }

    // Projectiles
    for (let i = 0; i < this.projectiles.length; i++) {
      this._drawProjectile(ctx, this.projectiles[i]);
    }

    // Lightning arcs
    for (let i = 0; i < this.arcs.length; i++) {
      this._drawLightningArc(ctx, this.arcs[i]);
    }

    // Sparks / particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.save();
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating combat numbers
    for (let i = 0; i < this.floats.length; i++) {
      const fl = this.floats[i];
      ctx.save();
      ctx.globalAlpha = clamp(fl.life / fl.maxLife, 0, 1);
      ctx.font = (fl.big ? '900 17px ' : '800 14px ') + 'system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(8, 11, 19, 0.9)';
      ctx.strokeText(fl.text, fl.x, fl.y);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.restore();
    }

    // Center Banner (FIGHT! / FUSION ACTIVATE! / SUDDEN DEATH! / VICTORY!)
    if (this.bannerTimer > 0 && this.bannerText) {
      ctx.save();
      const alpha = Math.min(1, this.bannerTimer * 2.2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(8, 11, 19, 0.78)';
      ctx.fillRect(0, WORLD * 0.41, WORLD, 62);
      ctx.font = '900 28px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = this.suddenDeath ? '#f43f5e' : '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.fillStyle = this.suddenDeath ? '#fda4af' : '#ffffff';
      ctx.fillText(this.bannerText, WORLD / 2, WORLD * 0.41 + 31);
      ctx.restore();
    }

    ctx.restore();
  };

  ArenaEngine.prototype._drawFighter = function (ctx, f) {
    // Motion trail
    for (let t = 0; t < f.trail.length; t++) {
      const tr = f.trail[t];
      if (tr.a <= 0) continue;
      ctx.save();
      ctx.globalAlpha = tr.a * 0.25;
      ctx.fillStyle = f.color;
      const rad = f.radius * ((t + 1) / f.trail.length) * 0.85;
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Phantom afterimages
    for (let a = 0; a < f.afterimages.length; a++) {
      const img = f.afterimages[a];
      ctx.save();
      ctx.globalAlpha = img.alpha * 0.45;
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(img.x, img.y, img.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw each weapon
    for (let wIdx = 0; wIdx < f.weapons.length; wIdx++) {
      this._drawWeapon(ctx, f, f.weapons[wIdx]);
    }

    // Fusion cosmic outer aura
    if (f.isFusion) {
      ctx.save();
      const auraGrad = ctx.createLinearGradient(f.x - f.radius, f.y - f.radius, f.x + f.radius, f.y + f.radius);
      auraGrad.addColorStop(0, f.color);
      auraGrad.addColorStop(1, f.color2);
      ctx.strokeStyle = auraGrad;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Ball body
    ctx.save();
    if (f.invulnTimer > 0) ctx.globalAlpha = 0.55;
    if (f.isFusion) {
      const grad = ctx.createLinearGradient(f.x - f.radius, f.y - f.radius, f.x + f.radius, f.y + f.radius);
      grad.addColorStop(0, f.flashTimer > 0 ? '#ffffff' : f.color);
      grad.addColorStop(1, f.flashTimer > 0 ? '#ffffff' : f.color2);
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createRadialGradient(
        f.x - f.radius * 0.3,
        f.y - f.radius * 0.3,
        3,
        f.x,
        f.y,
        f.radius
      );
      grad.addColorStop(0, f.flashTimer > 0 ? '#ffffff' : f.accent);
      grad.addColorStop(0.35, f.flashTimer > 0 ? '#ffffff' : f.color);
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
    }
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Team ring indicator (Blue/Cyan for Player Team A, Rose/Red for Enemy Team B)
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = f.team === 0 ? '#38bdf8' : '#fb7185';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    ctx.stroke();

    // HP radial arc on outer edge
    const hpPct = clamp(f.hp / f.maxHp, 0, 1);
    ctx.lineWidth = 3;
    ctx.strokeStyle = hpPct > 0.45 ? '#4ade80' : (hpPct > 0.2 ? '#fbbf24' : '#f43f5e');
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius + 2.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPct);
    ctx.stroke();

    // Status tint overlay (Frost / Stun)
    if (f.chillStacks > 0) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius - 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Crisp HP number inside ball
    ctx.font = '900 ' + (f.radius >= 24 ? '15px' : '13px') + ' system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = 'rgba(8, 11, 19, 0.92)';
    const hpText = String(Math.max(0, Math.ceil(f.hp)));
    ctx.strokeText(hpText, f.x, f.y + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, f.x, f.y + 1);

    // Compact fighter label underneath
    ctx.font = '700 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = f.team === 0 ? '#bae6fd' : '#fecdd3';
    ctx.strokeStyle = 'rgba(8, 11, 19, 0.85)';
    ctx.lineWidth = 2.5;
    const shortName = f.name.length > 16 ? f.name.slice(0, 15) + '…' : f.name;
    ctx.strokeText(shortName, f.x, f.y + f.radius + 13);
    ctx.fillText(shortName, f.x, f.y + f.radius + 13);

    ctx.restore();
  };

  ArenaEngine.prototype._drawWeapon = function (ctx, f, w) {
    const r = f.radius;
    const len = getWeaponLength(f, w);

    // Laser beam draws in world coords
    if (w.type === 'laser') {
      ctx.save();
      const ex = f.x + Math.cos(w.angle) * (r + 12);
      const ey = f.y + Math.sin(w.angle) * (r + 12);
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fill();

      if (w.laserState === 'charge') {
        const bx2 = f.x + Math.cos(w.laserAngle) * 600;
        const by2 = f.y + Math.sin(w.laserAngle) * 600;
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(bx2, by2);
        ctx.stroke();
      } else if (w.laserState === 'fire') {
        const bx2 = f.x + Math.cos(w.laserAngle) * 620;
        const by2 = f.y + Math.sin(w.laserAngle) * 620;
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(bx2, by2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(bx2, by2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Nova orbiting plasma spheres
    if (w.type === 'nova') {
      const orbitR = r + 26;
      ctx.save();
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, orbitR, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < w.orbs.length; i++) {
        if (!w.orbs[i].active) continue;
        const a = w.angle + (i / w.orbs.length) * Math.PI * 2;
        const ox = f.x + Math.cos(a) * orbitR;
        const oy = f.y + Math.sin(a) * orbitR;
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 12;
        ctx.fillStyle = i % 2 === 0 ? '#e879f9' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(ox, oy, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox, oy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Conductor orbiting Tesla nodes
    if (w.type === 'conductor') {
      ctx.save();
      for (let i = 0; i < 2; i++) {
        const a = w.angle + i * Math.PI;
        const cx = f.x + Math.cos(a) * (r + 12);
        const cy = f.y + Math.sin(a) * (r + 12);
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(w.angle);

    if (w.type === 'sword') {
      ctx.shadowColor = w.damageBonus >= 9 ? '#facc15' : '#60a5fa';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(r - 2, -4, len - r, 8);
      ctx.beginPath();
      ctx.moveTo(len, -4);
      ctx.lineTo(len + 10, 0);
      ctx.lineTo(len, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      // Crossguard
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(r - 1, -10, 4, 20);
    } else if (w.type === 'spear') {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(r - 4, 0);
      ctx.lineTo(len - 8, 0);
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(len + 6, 0);
      ctx.lineTo(len - 10, -6);
      ctx.lineTo(len - 10, 6);
      ctx.closePath();
      ctx.fill();
    } else if (w.type === 'dagger') {
      [1, -1].forEach(function (side) {
        ctx.save();
        if (side < 0) ctx.rotate(Math.PI);
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(r - 1, -3.5);
        ctx.lineTo(len + 4, 0);
        ctx.lineTo(r - 1, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    } else if (w.type === 'shield') {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, r + 11, -0.88, 0.88);
      ctx.stroke();
      ctx.strokeStyle = '#dbeafe';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 11, -0.78, 0.78);
      ctx.stroke();
    } else if (w.type === 'hammer') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(r - 2, 0);
      ctx.lineTo(len - 4, 0);
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 10;
      ctx.fillRect(len - 11, -12, 14, 24);
      ctx.fillStyle = '#ffedd5';
      ctx.fillRect(len - 9, -10, 4, 20);
    } else if (w.type === 'frost') {
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = '#67e8f9';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(r, -5);
      ctx.lineTo(len + 6, 0);
      ctx.lineTo(r, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ecfeff';
      ctx.beginPath();
      ctx.moveTo(r + 6, -2);
      ctx.lineTo(len, 0);
      ctx.lineTo(r + 6, 2);
      ctx.fill();
    } else if (w.type === 'scythe') {
      ctx.strokeStyle = '#d8b4fe';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(r - 2, 0);
      ctx.lineTo(len - 2, 0);
      ctx.stroke();
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(len - 2, -2);
      ctx.quadraticCurveTo(len + 4, 16, len - 18, 22);
      ctx.quadraticCurveTo(len - 6, 12, len - 8, 2);
      ctx.closePath();
      ctx.fill();
    } else if (w.type === 'phantom') {
      ctx.fillStyle = '#a5b4fc';
      ctx.shadowColor = '#818cf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(r, -4);
      ctx.lineTo(len + 7, 0);
      ctx.lineTo(r, 4);
      ctx.closePath();
      ctx.fill();
    } else if (w.type === 'vampire') {
      ctx.fillStyle = '#e11d48';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(r - 1, -5);
      ctx.lineTo(len + 6, 0);
      ctx.lineTo(r - 1, 5);
      ctx.lineTo(r + 6, 0);
      ctx.closePath();
      ctx.fill();
    } else if (w.type === 'bow') {
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r - 2, 0, 14, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r + 4, -12);
      ctx.lineTo(r + 4, 12);
      ctx.stroke();
    } else if (w.type === 'cannon') {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillRect(r - 4, -6, 19, 12);
      ctx.strokeRect(r - 4, -6, 19, 12);
    } else if (w.type === 'boomerang' && !w.boomerangOut) {
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(r + 8, 0, 9, -1.2, 1.2);
      ctx.stroke();
    } else if (w.type === 'shackles') {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r + 10, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  ArenaEngine.prototype._drawProjectile = function (ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.kind === 'arrow') {
      const a = Math.atan2(p.vy, p.vx);
      ctx.rotate(a);
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(3, -4);
      ctx.lineTo(3, 4);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'shell') {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (p.kind === 'boomerang') {
      ctx.rotate(p.spin);
      ctx.shadowColor = '#2dd4bf';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 10, -1.2, 1.35);
      ctx.stroke();
    }
    ctx.restore();
  };

  ArenaEngine.prototype._drawLightningArc = function (ctx, arc) {
    ctx.save();
    ctx.globalAlpha = clamp(arc.life / arc.maxLife, 0, 1);
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = arc.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1);
    const steps = 6;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = arc.x1 + (arc.x2 - arc.x1) * t + (Math.random() - 0.5) * 18;
      const y = arc.y1 + (arc.y2 - arc.y1) * t + (Math.random() - 0.5) * 18;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(arc.x2, arc.y2);
    ctx.stroke();
    ctx.restore();
  };

  global.ArenaEngine = ArenaEngine;
})(window);
