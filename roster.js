/**
 * BALL VS BALL: FUSION ARENA — Roster, Rarities, Codes & Helpers
 * Want to mod this game on GitHub? Add your own custom ball object to ROSTER below!
 */
(function (global) {
  'use strict';

  const RARITIES = {
    common: {
      id: 'common',
      label: 'Common',
      color: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.45)',
      bg: 'rgba(148, 163, 184, 0.12)',
      weight: 46,
      dupeCoins: 25,
      order: 1,
    },
    rare: {
      id: 'rare',
      label: 'Rare',
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.5)',
      bg: 'rgba(56, 189, 248, 0.14)',
      weight: 28,
      dupeCoins: 40,
      order: 2,
    },
    epic: {
      id: 'epic',
      label: 'Epic',
      color: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.55)',
      bg: 'rgba(192, 132, 252, 0.15)',
      weight: 15,
      dupeCoins: 65,
      order: 3,
    },
    legendary: {
      id: 'legendary',
      label: 'Legendary',
      color: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.6)',
      bg: 'rgba(251, 191, 36, 0.16)',
      weight: 8,
      dupeCoins: 110,
      order: 4,
    },
    mythic: {
      id: 'mythic',
      label: 'Mythic',
      color: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.68)',
      bg: 'rgba(244, 63, 94, 0.18)',
      weight: 3,
      dupeCoins: 175,
      order: 5,
    },
  };

  /**
   * All 17 playable balls across 5 rarities.
   * Starter unlocked: sword, spear, shield, bow.
   */
  const ROSTER = [
    // === COMMON ===
    {
      id: 'sword',
      name: 'Sword',
      rarity: 'common',
      starter: true,
      color: '#60a5fa',
      accent: '#dbeafe',
      hp: 118,
      speed: 222,
      radius: 23,
      baseDamage: 10,
      weaponType: 'sword',
      abilityName: 'Sharpen',
      abilityDesc: 'Spinning blade gains +3 DMG on every hit and glows hotter.',
      tag: 'Scaling Melee',
    },
    {
      id: 'spear',
      name: 'Spear',
      rarity: 'common',
      starter: true,
      color: '#34d399',
      accent: '#d1fae5',
      hp: 112,
      speed: 245,
      radius: 22,
      baseDamage: 11,
      weaponType: 'spear',
      abilityName: 'Joust Rush',
      abilityDesc: 'Long thrust spear gains +reach and +speed with every strike.',
      tag: 'Long Reach',
    },
    {
      id: 'dagger',
      name: 'Dagger',
      rarity: 'common',
      starter: false,
      color: '#f59e0b',
      accent: '#fef3c7',
      hp: 104,
      speed: 264,
      radius: 21,
      baseDamage: 7,
      weaponType: 'dagger',
      abilityName: 'Twin Frenzy',
      abilityDesc: 'Fast dual blades strike rapidly and ramp spin speed by +14% per hit.',
      tag: 'Hyper Speed',
    },
    {
      id: 'shield',
      name: 'Shield',
      rarity: 'common',
      starter: true,
      color: '#3b82f6',
      accent: '#bfdbfe',
      hp: 142,
      speed: 198,
      radius: 25,
      baseDamage: 9,
      weaponType: 'shield',
      abilityName: 'Reflect Bulwark',
      abilityDesc: 'Blocks & reflects enemy projectiles and slams foes with huge knockback.',
      tag: 'Tank / Parry',
    },

    // === RARE ===
    {
      id: 'bow',
      name: 'Bow',
      rarity: 'rare',
      starter: true,
      color: '#38bdf8',
      accent: '#e0f2fe',
      hp: 108,
      speed: 228,
      radius: 22,
      baseDamage: 8,
      weaponType: 'bow',
      abilityName: 'Multishot Volley',
      abilityDesc: 'Fires aimed arrows; every 3 shots adds +1 arrow (up to 5) & faster fire.',
      tag: 'Ranged Volley',
    },
    {
      id: 'hammer',
      name: 'Hammer',
      rarity: 'rare',
      starter: false,
      color: '#fb923c',
      accent: '#ffedd5',
      hp: 132,
      speed: 198,
      radius: 25,
      baseDamage: 15,
      weaponType: 'hammer',
      abilityName: 'Earthshaker',
      abilityDesc: 'Heavy slam unleashes a knockback shockwave that crushes foes into walls.',
      tag: 'Heavy Slam',
    },
    {
      id: 'frost',
      name: 'Frost',
      rarity: 'rare',
      starter: false,
      color: '#22d3ee',
      accent: '#cffafe',
      hp: 116,
      speed: 225,
      radius: 23,
      baseDamage: 9,
      weaponType: 'frost',
      abilityName: 'Permafrost',
      abilityDesc: 'Chills enemy movement & weapon spin; 4 stacks trigger an Ice Shatter burst.',
      tag: 'Freeze Control',
    },
    {
      id: 'boomerang',
      name: 'Boomerang',
      rarity: 'rare',
      starter: false,
      color: '#2dd4bf',
      accent: '#ccfbf1',
      hp: 112,
      speed: 235,
      radius: 22,
      baseDamage: 10,
      weaponType: 'boomerang',
      abilityName: 'Curving Return',
      abilityDesc: 'Throws a piercing curving blade that hits going out AND coming back (+3 DMG on catch).',
      tag: 'Piercing Arc',
    },

    // === EPIC ===
    {
      id: 'scythe',
      name: 'Scythe',
      rarity: 'epic',
      starter: false,
      color: '#a855f7',
      accent: '#f3e8ff',
      hp: 116,
      speed: 236,
      radius: 23,
      baseDamage: 10,
      weaponType: 'scythe',
      abilityName: 'Venom Bleed',
      abilityDesc: 'Sweeping reaper blade inflicts infinitely stacking bleed & poison ticks.',
      tag: 'Stacking DoT',
    },
    {
      id: 'cannon',
      name: 'Cannon',
      rarity: 'epic',
      starter: false,
      color: '#ef4444',
      accent: '#fee2e2',
      hp: 126,
      speed: 204,
      radius: 24,
      baseDamage: 16,
      weaponType: 'cannon',
      abilityName: 'Blast Shells',
      abilityDesc: 'Launches explosive AoE shells that detonate on impact or bounce + recoil dash.',
      tag: 'Explosive AoE',
    },
    {
      id: 'phantom',
      name: 'Phantom',
      rarity: 'epic',
      starter: false,
      color: '#818cf8',
      accent: '#e0e7ff',
      hp: 108,
      speed: 258,
      radius: 21,
      baseDamage: 12,
      weaponType: 'phantom',
      abilityName: 'Phase Blink',
      abilityDesc: 'Blinks through danger with invulnerability frames, leaving afterimages & crit strikes.',
      tag: 'Blink / Dodge',
    },
    {
      id: 'vampire',
      name: 'Vampire',
      rarity: 'epic',
      starter: false,
      color: '#e11d48',
      accent: '#ffe4e6',
      hp: 118,
      speed: 232,
      radius: 23,
      baseDamage: 11,
      weaponType: 'vampire',
      abilityName: 'Crimson Drain',
      abilityDesc: 'Siphons 55% of all damage dealt as healing + gains +2 DMG per strike.',
      tag: 'Lifesteal',
    },

    // === LEGENDARY ===
    {
      id: 'conductor',
      name: 'Conductor',
      rarity: 'legendary',
      starter: false,
      color: '#facc15',
      accent: '#fef9c3',
      hp: 122,
      speed: 236,
      radius: 23,
      baseDamage: 11,
      weaponType: 'conductor',
      abilityName: 'Chain Voltage',
      abilityDesc: 'Zaps enemies with chaining lightning arcs + escalating static shock pulses.',
      tag: 'Chain Lightning',
    },
    {
      id: 'shackles',
      name: 'Shackles',
      rarity: 'legendary',
      starter: false,
      color: '#f97316',
      accent: '#ffedd5',
      hp: 132,
      speed: 216,
      radius: 24,
      baseDamage: 12,
      weaponType: 'shackles',
      abilityName: 'Soul Tether',
      abilityDesc: 'Fires a glowing chain that tethers, yanks, and briefly stuns enemies in place.',
      tag: 'Tether / Stun',
    },
    {
      id: 'zone',
      name: 'Zone',
      rarity: 'legendary',
      starter: false,
      color: '#eab308',
      accent: '#fef08a',
      hp: 136,
      speed: 208,
      radius: 24,
      baseDamage: 8,
      weaponType: 'zone',
      abilityName: 'Domain Expansion',
      abilityDesc: 'Emits a growing golden energy ring that pulses damage and slows foes inside.',
      tag: 'Aura Control',
    },

    // === MYTHIC ===
    {
      id: 'laser',
      name: 'Laser',
      rarity: 'mythic',
      starter: false,
      color: '#ec4899',
      accent: '#fce7f3',
      hp: 126,
      speed: 224,
      radius: 23,
      baseDamage: 14,
      weaponType: 'laser',
      abilityName: 'Hyper Sweep',
      abilityDesc: 'Locks on and sweeps a high-damage neon plasma beam clear across the arena.',
      tag: 'Sweeping Beam',
    },
    {
      id: 'nova',
      name: 'Nova',
      rarity: 'mythic',
      starter: false,
      color: '#d946ef',
      accent: '#fae8ff',
      hp: 128,
      speed: 234,
      radius: 23,
      baseDamage: 12,
      weaponType: 'nova',
      abilityName: 'Supernova Orbs',
      abilityDesc: 'Orbiting plasma spheres burst on contact, growing up to 6 high-scaling orbs.',
      tag: 'Plasma Burst',
    },
  ];

  const ROSTER_MAP = Object.create(null);
  ROSTER.forEach(function (b) {
    ROSTER_MAP[b.id] = b;
  });

  const REDEEM_CODES = {
    JARVIS: { coins: 250, msg: 'Jarvis supply drop unlocked, sir! +250 Coins' },
    FUSION: { coins: 300, msg: 'Fusion core supercharged! +300 Coins' },
    ANDY: { coins: 500, msg: 'VIP Creator bonus claimed! +500 Coins' },
    SPIDER: { coins: 250, msg: 'Web-slinger stash claimed! +250 Coins' },
  };

  function getBall(id) {
    return ROSTER_MAP[id] || ROSTER[0];
  }

  function getRarity(rarityId) {
    return RARITIES[rarityId] || RARITIES.common;
  }

  function getLevelMultiplier(level) {
    const lv = Math.max(1, Number(level) || 1);
    return 1 + (lv - 1) * 0.05;
  }

  /**
   * Builds a clean fighter spec from 1 ball (normal) or 2 balls (Fusion!).
   */
  function createFighterSpec(ballIds, levelMap, options) {
    const ids = Array.isArray(ballIds) ? ballIds.filter(Boolean) : [ballIds];
    const b1 = getBall(ids[0]);
    const b2 = ids[1] ? getBall(ids[1]) : null;
    const lv1 = (levelMap && levelMap[b1.id]) || 1;
    const lv2 = b2 ? ((levelMap && levelMap[b2.id]) || 1) : lv1;
    const mult1 = getLevelMultiplier(lv1);
    const mult2 = getLevelMultiplier(lv2);
    const bossScale = (options && options.bossScale) || 1;

    if (!b2) {
      return {
        isFusion: false,
        ids: [b1.id],
        balls: [b1],
        name: b1.name,
        rarity: b1.rarity,
        color: b1.color,
        color2: b1.accent,
        accent: b1.accent,
        hp: Math.round(b1.hp * mult1 * bossScale),
        speed: Math.round(b1.speed * (1 + (lv1 - 1) * 0.015)),
        radius: b1.radius,
        damageMult: mult1 * bossScale,
        level: lv1,
        weapons: [b1.weaponType],
      };
    }

    const avgMult = (mult1 + mult2) * 0.5;
    const r1 = getRarity(b1.rarity);
    const r2 = getRarity(b2.rarity);
    const topRarity = r1.order >= r2.order ? b1.rarity : b2.rarity;

    return {
      isFusion: true,
      ids: [b1.id, b2.id],
      balls: [b1, b2],
      name: b1.name + ' + ' + b2.name,
      rarity: topRarity,
      color: b1.color,
      color2: b2.color,
      accent: '#ffffff',
      hp: Math.round((b1.hp + b2.hp) * 0.72 * avgMult * bossScale),
      speed: Math.round(((b1.speed + b2.speed) * 0.52) * (1 + ((lv1 + lv2) * 0.5 - 1) * 0.015)),
      radius: Math.min(28, Math.round((b1.radius + b2.radius) * 0.5 + 3)),
      damageMult: avgMult * bossScale,
      level: Math.round((lv1 + lv2) * 0.5),
      weapons: [b1.weaponType, b2.weaponType],
    };
  }

  /**
   * Crisp inline SVG weapon emblem for cards (no external image files needed).
   */
  function getBallSvg(ballId, size) {
    const b = getBall(ballId);
    const s = size || 46;
    const c = b.color;
    const a = b.accent;
    let glyph = '';

    switch (b.weaponType) {
      case 'sword':
        glyph = '<path d="M27 11l6 6-14 14-6-6z" fill="' + a + '"/><path d="M12 28l4 4m-5 1l3-3" stroke="' + c + '" stroke-width="2.8" stroke-linecap="round"/><path d="M29 9l6 6-2 2-6-6z" fill="' + c + '"/>';
        break;
      case 'spear':
        glyph = '<line x1="10" y1="34" x2="31" y2="13" stroke="' + a + '" stroke-width="2.8" stroke-linecap="round"/><polygon points="35,9 26,12 32,18" fill="' + c + '"/>';
        break;
      case 'dagger':
        glyph = '<path d="M12 31l13-13 3 3-13 13z" fill="' + a + '"/><path d="M20 33l13-13 2 2-13 13z" fill="' + c + '"/>';
        break;
      case 'shield':
        glyph = '<path d="M22 9l11 4v9c0 7-4.8 11.8-11 14-6.2-2.2-11-7-11-14v-9z" fill="' + c + '" fill-opacity="0.35" stroke="' + a + '" stroke-width="2.4"/><path d="M22 13v18" stroke="' + a + '" stroke-width="2" stroke-opacity="0.7"/>';
        break;
      case 'bow':
        glyph = '<path d="M15 11c9 4 9 18 0 22" fill="none" stroke="' + a + '" stroke-width="2.8" stroke-linecap="round"/><line x1="15" y1="11" x2="15" y2="33" stroke="' + c + '" stroke-width="1.6"/><line x1="13" y1="22" x2="34" y2="22" stroke="' + a + '" stroke-width="2.4"/><polygon points="36,22 30,18 30,26" fill="' + c + '"/>';
        break;
      case 'hammer':
        glyph = '<line x1="12" y1="33" x2="25" y2="20" stroke="' + a + '" stroke-width="3.2" stroke-linecap="round"/><rect x="19" y="10" width="15" height="9" rx="2.5" transform="rotate(45 26 14)" fill="' + c + '" stroke="' + a + '" stroke-width="1.6"/>';
        break;
      case 'frost':
        glyph = '<g stroke="' + a + '" stroke-width="2.4" stroke-linecap="round"><line x1="22" y1="9" x2="22" y2="35"/><line x1="10" y1="22" x2="34" y2="22"/><line x1="13.5" y1="13.5" x2="30.5" y2="30.5"/><line x1="30.5" y1="13.5" x2="13.5" y2="30.5"/></g><circle cx="22" cy="22" r="4" fill="' + c + '"/>';
        break;
      case 'boomerang':
        glyph = '<path d="M12 15c7-5 19-3 22 6 1.5 4.5-0.5 10-4 13l-4-3c2-2 3-5.5 2-8.5-2-5.5-9-6.5-13-3z" fill="' + c + '" stroke="' + a + '" stroke-width="1.8"/>';
        break;
      case 'scythe':
        glyph = '<line x1="14" y1="34" x2="27" y2="12" stroke="' + a + '" stroke-width="2.8" stroke-linecap="round"/><path d="M26 11c-9-2-15 3-17 10 5-3 11-3 17-1z" fill="' + c + '" stroke="' + a + '" stroke-width="1.6"/>';
        break;
      case 'cannon':
        glyph = '<rect x="11" y="16" width="19" height="10" rx="4" transform="rotate(-20 20 21)" fill="' + c + '" stroke="' + a + '" stroke-width="2"/><circle cx="33" cy="14" r="3.5" fill="#fbbf24"/>';
        break;
      case 'phantom':
        glyph = '<path d="M22 10c-6.5 0-10 4.5-10 11v12l3.5-2.8 3.2 2.8 3.3-2.8 3.3 2.8 3.2-2.8 3.5 2.8V21c0-6.5-3.5-11-10-11z" fill="' + c + '" fill-opacity="0.45" stroke="' + a + '" stroke-width="2"/><circle cx="18.5" cy="20" r="2" fill="' + a + '"/><circle cx="25.5" cy="20" r="2" fill="' + a + '"/>';
        break;
      case 'vampire':
        glyph = '<path d="M22 9c-4 6.5-9 11.2-9 16.5a9 9 0 0 0 18 0C31 20.2 26 15.5 22 9z" fill="' + c + '" stroke="' + a + '" stroke-width="2"/><path d="M18 22l2 4 2-4m2 0l2 4 2-4" stroke="' + a + '" stroke-width="1.8" fill="none"/>';
        break;
      case 'conductor':
        glyph = '<polygon points="24,8 13,23 21,23 19,36 31,20 23,20" fill="' + c + '" stroke="' + a + '" stroke-width="1.8" stroke-linejoin="round"/>';
        break;
      case 'shackles':
        glyph = '<rect x="10" y="16" width="11" height="7" rx="3.5" transform="rotate(-35 15 19)" fill="none" stroke="' + a + '" stroke-width="2.6"/><rect x="23" y="21" width="11" height="7" rx="3.5" transform="rotate(-35 28 24)" fill="none" stroke="' + c + '" stroke-width="2.6"/><line x1="18" y1="22" x2="26" y2="22" stroke="' + a + '" stroke-width="2.6"/>';
        break;
      case 'zone':
        glyph = '<circle cx="22" cy="22" r="12.5" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-dasharray="5 3"/><circle cx="22" cy="22" r="7.5" fill="' + c + '" fill-opacity="0.28" stroke="' + a + '" stroke-width="2"/><circle cx="22" cy="22" r="2.5" fill="' + a + '"/>';
        break;
      case 'laser':
        glyph = '<line x1="9" y1="33" x2="35" y2="11" stroke="' + c + '" stroke-width="6" stroke-linecap="round" stroke-opacity="0.45"/><line x1="9" y1="33" x2="35" y2="11" stroke="' + a + '" stroke-width="2.6" stroke-linecap="round"/><circle cx="33" cy="13" r="4" fill="' + c + '"/>';
        break;
      case 'nova':
        glyph = '<circle cx="22" cy="22" r="5" fill="' + a + '"/><circle cx="22" cy="10" r="3.4" fill="' + c + '"/><circle cx="33" cy="28" r="3.4" fill="#38bdf8"/><circle cx="11" cy="28" r="3.4" fill="' + c + '"/><circle cx="22" cy="22" r="12" fill="none" stroke="' + a + '" stroke-width="1.2" stroke-opacity="0.5"/>';
        break;
      default:
        glyph = '<circle cx="22" cy="22" r="9" fill="' + c + '"/>';
    }

    return (
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 44 44" aria-hidden="true">' +
      '<circle cx="22" cy="22" r="20" fill="' + c + '" fill-opacity="0.16" stroke="' + c + '" stroke-width="1.8" stroke-opacity="0.7"/>' +
      glyph +
      '</svg>'
    );
  }

  /**
   * Roll one random ball with optional minimum rarity tier for pity.
   */
  function rollRandomBall(minRarityOrder) {
    const minOrder = minRarityOrder || 1;
    const poolRarities = Object.values(RARITIES).filter(function (r) {
      return r.order >= minOrder;
    });
    const totalWeight = poolRarities.reduce(function (sum, r) {
      return sum + r.weight;
    }, 0);
    let pick = Math.random() * totalWeight;
    let chosenRarity = poolRarities[0].id;
    for (let i = 0; i < poolRarities.length; i++) {
      pick -= poolRarities[i].weight;
      if (pick <= 0) {
        chosenRarity = poolRarities[i].id;
        break;
      }
    }
    const candidates = ROSTER.filter(function (b) {
      return b.rarity === chosenRarity;
    });
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Pick N distinct random balls from the whole roster for Draft modes.
   */
  function pickDistinctBalls(count, excludeIds) {
    const exclude = new Set(excludeIds || []);
    const pool = ROSTER.filter(function (b) {
      return !exclude.has(b.id);
    });
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy.slice(0, count);
  }

  global.BVBData = {
    RARITIES: RARITIES,
    ROSTER: ROSTER,
    ROSTER_MAP: ROSTER_MAP,
    REDEEM_CODES: REDEEM_CODES,
    getBall: getBall,
    getRarity: getRarity,
    getLevelMultiplier: getLevelMultiplier,
    createFighterSpec: createFighterSpec,
    getBallSvg: getBallSvg,
    rollRandomBall: rollRandomBall,
    pickDistinctBalls: pickDistinctBalls,
  };
})(window);
