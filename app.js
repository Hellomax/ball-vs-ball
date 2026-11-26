/**
 * BALL VS BALL: FUSION ARENA — App Controller & LocalStorage State
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'bvb_fusion_arena_v1';
  const Data = global.BVBData;
  const Audio = global.BVBAudio;

  function defaultState() {
    const unlocked = {};
    Data.ROSTER.forEach(function (b) {
      if (b.starter) unlocked[b.id] = 1;
    });
    return {
      coins: 350,
      unlocked: unlocked,
      streak: 0,
      bestStreak: 0,
      wins: 0,
      matches: 0,
      pityEpic: 0,
      pityLeg: 0,
      redeemedCodes: [],
      muted: false,
    };
  }

  function loadState() {
    const base = defaultState();
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return Object.assign(base, parsed, {
        unlocked: Object.assign(base.unlocked, parsed.unlocked || {}),
        redeemedCodes: Array.isArray(parsed.redeemedCodes) ? parsed.redeemedCodes : [],
      });
    } catch (_err) {
      return base;
    }
  }

  let state = loadState();

  function saveState() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_err) {}
  }

  // Runtime UI state
  const ui = {
    tab: 'battle', // battle | fusion | sandbox | roll | collection
    battleSub: '1v1', // 1v1 | 2v2
    battleSource: 'draft', // draft | collection
    battleDraft: [],
    battleRerollUsed: false,
    battleSelected: [],

    fusionSource: 'draft', // draft | collection
    fusionDraft: [],
    fusionRerollUsed: false,
    fusionSelected: [],

    collectionFilter: 'all',
    speed: 1,
    inMatch: false,
    lastMatchConfig: null,
  };

  let engine = null;

  function $(id) {
    return document.getElementById(id);
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + (r < 10 ? '0' + r : String(r));
  }

  function getUnlockedList() {
    return Data.ROSTER.filter(function (b) {
      return Boolean(state.unlocked[b.id]);
    });
  }

  function updateHudTop() {
    $('hud-coins').textContent = String(state.coins);
    $('hud-streak').textContent = String(state.streak);
    $('btn-mute').textContent = state.muted ? '🔇' : '🔊';
    $('pity-epic').textContent = 'Epic+ Pity: ' + state.pityEpic + ' / 5';
    $('pity-leg').textContent = 'Legendary+ Pity: ' + state.pityLeg + ' / 12';

    const b1 = $('btn-roll-1');
    const b3 = $('btn-roll-3');
    if (b1) b1.disabled = state.coins < 100;
    if (b3) b3.disabled = state.coins < 270;
  }

  function switchTab(nextTab) {
    ui.tab = nextTab;
    Audio.uiClick();

    // Update nav active states
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      const isAct = btn.dataset.tab === nextTab;
      btn.classList.toggle('active', isAct);
      if (isAct) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    const isArenaTab = nextTab === 'battle' || nextTab === 'fusion' || nextTab === 'sandbox';
    $('view-arena').classList.toggle('hidden', !isArenaTab);
    $('view-roll').classList.toggle('hidden', nextTab !== 'roll');
    $('view-collection').classList.toggle('hidden', nextTab !== 'collection');

    if (isArenaTab) {
      if (ui.inMatch) {
        abortMatchToLobby();
      }
      $('panel-battle').classList.toggle('hidden', nextTab !== 'battle');
      $('panel-fusion').classList.toggle('hidden', nextTab !== 'fusion');
      $('panel-sandbox').classList.toggle('hidden', nextTab !== 'sandbox');

      if (nextTab === 'battle') {
        renderBattlePanel();
        previewArenaForCurrentTab();
      } else if (nextTab === 'fusion') {
        renderFusionPanel();
        previewArenaForCurrentTab();
      } else if (nextTab === 'sandbox') {
        previewArenaForCurrentTab();
      }
    } else if (nextTab === 'roll') {
      if (engine) engine.stop();
      updateHudTop();
    } else if (nextTab === 'collection') {
      if (engine) engine.stop();
      renderCollection();
    }
  }

  function previewArenaForCurrentTab() {
    if (!engine || ui.inMatch) return;
    $('result-overlay').classList.add('hidden');
    $('live-strip').classList.add('hidden');
    $('controls-column').classList.remove('hidden');
    $('stage-idle-badge').classList.remove('hidden');
    $('hud-timer').textContent = '0:00';
    $('hud-timer').classList.remove('sudden');

    if (ui.tab === 'battle') {
      $('stage-idle-text').textContent = ui.battleSub === '2v2' ? 'PICK 2 BALLS FOR 2v2 BRAWL' : 'PICK YOUR FIGHTER TO START';
      const picks = ui.battleSelected.length ? ui.battleSelected : [ui.battleDraft[0] ? ui.battleDraft[0].id : 'sword'];
      const specA = Data.createFighterSpec([picks[0]], state.unlocked);
      $('hud-name-a').textContent = specA.name;
      $('hud-hp-a').textContent = specA.hp;
      $('hud-name-b').textContent = 'AI Rival';
      $('hud-hp-b').textContent = '??';
      engine.startIdleDemo([specA]);
    } else if (ui.tab === 'fusion') {
      $('stage-idle-text').textContent = 'SELECT 2 BALLS TO FUSE';
      if (ui.fusionSelected.length === 2) {
        const fused = Data.createFighterSpec(ui.fusionSelected, state.unlocked);
        $('hud-name-a').textContent = fused.name;
        $('hud-hp-a').textContent = fused.hp;
        $('hud-name-b').textContent = 'Fused Boss';
        $('hud-hp-b').textContent = '??';
        engine.startIdleDemo([fused]);
      } else {
        const preview = ui.fusionSelected.length === 1
          ? [Data.createFighterSpec([ui.fusionSelected[0]], state.unlocked)]
          : [Data.createFighterSpec(['vampire', 'laser'], state.unlocked)];
        $('hud-name-a').textContent = ui.fusionSelected.length === 1 ? preview[0].name : 'Fusion Preview';
        $('hud-hp-a').textContent = preview[0].hp;
        $('hud-name-b').textContent = 'Fused Boss';
        $('hud-hp-b').textContent = '??';
        engine.startIdleDemo(preview);
      }
    } else if (ui.tab === 'sandbox') {
      $('stage-idle-text').textContent = 'SANDBOX — TAP LAUNCH FIGHT';
      const specs = getSandboxSpecs();
      $('hud-name-a').textContent = specs.specA.name;
      $('hud-hp-a').textContent = specs.specA.hp;
      $('hud-name-b').textContent = specs.specB.name;
      $('hud-hp-b').textContent = specs.specB.hp;
      engine.startIdleDemo([specs.specA, specs.specB]);
    }
  }

  // ===================== BATTLE (1v1 / 2v2) =====================
  function rollBattleDraft() {
    const count = ui.battleSub === '2v2' ? 4 : 3;
    ui.battleDraft = Data.pickDistinctBalls(count);
    ui.battleSelected = [];
  }

  function renderBattlePanel() {
    const needed = ui.battleSub === '2v2' ? 2 : 1;
    const isDraft = ui.battleSource === 'draft';
    const pool = isDraft ? ui.battleDraft : getUnlockedList();

    $('battle-instruction').textContent = isDraft
      ? (needed === 1 ? 'Pick 1 of 3 random balls (any rarity!)' : 'Pick 2 of 4 random balls for your team')
      : (needed === 1 ? 'Pick any ball from your unlocked roster' : 'Pick 2 balls from your unlocked roster');

    const rerollBtn = $('btn-reroll-battle');
    rerollBtn.classList.toggle('hidden', !isDraft);
    rerollBtn.disabled = ui.battleRerollUsed;
    rerollBtn.textContent = ui.battleRerollUsed ? '🎲 Reroll Used' : '🎲 Reroll (1 Free)';

    const grid = $('battle-cards');
    grid.className = 'draft-grid' + (isDraft ? (needed === 2 ? ' draft-grid-4' : '') : ' collection-pick');
    grid.innerHTML = '';

    pool.forEach(function (ball) {
      const rar = Data.getRarity(ball.rarity);
      const selIdx = ui.battleSelected.indexOf(ball.id);
      const lv = state.unlocked[ball.id] || 1;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ball-card r-' + ball.rarity + (selIdx >= 0 ? ' selected' : '');
      card.style.borderColor = selIdx >= 0 ? '' : rar.color;
      card.innerHTML =
        (selIdx >= 0 && needed > 1 ? '<span class="ball-order-badge">' + (selIdx + 1) + '</span>' : '') +
        (state.unlocked[ball.id] ? '<span class="ball-lv">Lv.' + lv + '</span>' : '') +
        Data.getBallSvg(ball.id, 46) +
        '<span class="rarity-pill" style="background:' + rar.bg + ';color:' + rar.color + '">' + rar.label + '</span>' +
        '<span class="ball-name">' + ball.name + '</span>' +
        '<span class="ball-tag">' + ball.tag + '</span>';
      card.addEventListener('click', function () {
        Audio.uiClick();
        if (needed === 1) {
          ui.battleSelected = [ball.id];
        } else {
          const idx = ui.battleSelected.indexOf(ball.id);
          if (idx >= 0) {
            ui.battleSelected.splice(idx, 1);
          } else if (ui.battleSelected.length < 2) {
            ui.battleSelected.push(ball.id);
          } else {
            ui.battleSelected[1] = ball.id;
          }
        }
        renderBattlePanel();
        previewArenaForCurrentTab();
      });
      grid.appendChild(card);
    });

    const teamBar = $('battle-team-bar');
    teamBar.classList.toggle('hidden', needed !== 2);
    if (needed === 2) {
      $('slot-2v2-0').textContent = 'Slot 1: ' + (ui.battleSelected[0] ? Data.getBall(ui.battleSelected[0]).name : '—');
      $('slot-2v2-1').textContent = 'Slot 2: ' + (ui.battleSelected[1] ? Data.getBall(ui.battleSelected[1]).name : '—');
    }

    const fightBtn = $('btn-fight-battle');
    fightBtn.disabled = ui.battleSelected.length !== needed;
    fightBtn.textContent = needed === 2 ? '⚔️ START 2v2 BRAWL!' : '⚔️ FIGHT!';
  }

  function launchBattleMatch() {
    const is2v2 = ui.battleSub === '2v2';
    const teamA = ui.battleSelected.map(function (id) {
      return Data.createFighterSpec([id], state.unlocked);
    });
    const enemyBalls = Data.pickDistinctBalls(is2v2 ? 2 : 1);
    const aiLevel = Math.max(1, 1 + Math.floor(state.streak / 3));
    const aiMap = {};
    enemyBalls.forEach(function (b) { aiMap[b.id] = aiLevel; });
    const teamB = enemyBalls.map(function (b) {
      return Data.createFighterSpec([b.id], aiMap);
    });

    startMatch({
      mode: is2v2 ? '2v2' : '1v1',
      teamA: teamA,
      teamB: teamB,
      fusionIntro: false,
      rewardBase: is2v2 ? 75 : 55,
    });
  }

  // ===================== FUSION MODE =====================
  function rollFusionDraft() {
    ui.fusionDraft = Data.pickDistinctBalls(4);
    ui.fusionSelected = [];
  }

  function renderFusionPanel() {
    const isDraft = ui.fusionSource === 'draft';
    const pool = isDraft ? ui.fusionDraft : getUnlockedList();

    const rerollBtn = $('btn-reroll-fusion');
    rerollBtn.classList.toggle('hidden', !isDraft);
    rerollBtn.disabled = ui.fusionRerollUsed;
    rerollBtn.textContent = ui.fusionRerollUsed ? '🎲 Reroll Used' : '🎲 Reroll (1 Free)';

    const s0 = ui.fusionSelected[0] ? Data.getBall(ui.fusionSelected[0]) : null;
    const s1 = ui.fusionSelected[1] ? Data.getBall(ui.fusionSelected[1]) : null;
    $('fusion-slot-0').classList.toggle('filled', Boolean(s0));
    $('fusion-slot-1').classList.toggle('filled', Boolean(s1));
    $('fusion-slot-0-name').textContent = s0 ? s0.name : 'Tap below';
    $('fusion-slot-1-name').textContent = s1 ? s1.name : 'Tap below';
    $('fusion-preview-label').textContent = (s0 && s1)
      ? ('Hybrid: ' + s0.name + ' + ' + s1.name)
      : 'Pick 2 different balls to combine weapons!';

    const grid = $('fusion-cards');
    grid.className = 'draft-grid ' + (isDraft ? 'draft-grid-4' : 'collection-pick');
    grid.innerHTML = '';

    pool.forEach(function (ball) {
      const rar = Data.getRarity(ball.rarity);
      const selIdx = ui.fusionSelected.indexOf(ball.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ball-card r-' + ball.rarity + (selIdx >= 0 ? ' selected' : '');
      card.style.borderColor = selIdx >= 0 ? '' : rar.color;
      card.innerHTML =
        (selIdx >= 0 ? '<span class="ball-order-badge">' + (selIdx === 0 ? 'A' : 'B') + '</span>' : '') +
        Data.getBallSvg(ball.id, 44) +
        '<span class="rarity-pill" style="background:' + rar.bg + ';color:' + rar.color + '">' + rar.label + '</span>' +
        '<span class="ball-name">' + ball.name + '</span>' +
        '<span class="ball-tag">' + ball.tag + '</span>';
      card.addEventListener('click', function () {
        Audio.uiClick();
        const idx = ui.fusionSelected.indexOf(ball.id);
        if (idx >= 0) {
          ui.fusionSelected.splice(idx, 1);
        } else if (ui.fusionSelected.length < 2) {
          ui.fusionSelected.push(ball.id);
        } else {
          ui.fusionSelected[1] = ball.id;
        }
        renderFusionPanel();
        previewArenaForCurrentTab();
      });
      grid.appendChild(card);
    });

    $('btn-fight-fusion').disabled = ui.fusionSelected.length !== 2;
  }

  function launchFusionMatch() {
    if (ui.fusionSelected.length !== 2) return;
    const playerFusion = Data.createFighterSpec(ui.fusionSelected, state.unlocked);
    const bossBalls = Data.pickDistinctBalls(2);
    const bossScale = Math.min(1.22, 1.04 + state.streak * 0.02);
    const bossFusion = Data.createFighterSpec([bossBalls[0].id, bossBalls[1].id], {}, { bossScale: bossScale });
    bossFusion.name = 'BOSS: ' + bossBalls[0].name + '+' + bossBalls[1].name;

    startMatch({
      mode: 'fusion',
      teamA: [playerFusion],
      teamB: [bossFusion],
      fusionIntro: true,
      rewardBase: 110,
    });
  }

  // ===================== SANDBOX MODE =====================
  function initSandboxSelects() {
    const selects = ['sb-a1', 'sb-a2', 'sb-b1', 'sb-b2'];
    selects.forEach(function (id) {
      const sel = $(id);
      sel.innerHTML = '';
      Data.ROSTER.forEach(function (b) {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name + ' (' + Data.getRarity(b.rarity).label + ')';
        sel.appendChild(opt);
      });
    });
    $('sb-a1').value = 'vampire';
    $('sb-a2').value = 'laser';
    $('sb-b1').value = 'nova';
    $('sb-b2').value = 'conductor';
  }

  function getSandboxSpecs() {
    const fuseA = $('sb-fuse-a').checked;
    const fuseB = $('sb-fuse-b').checked;
    const idsA = fuseA ? [$('sb-a1').value, $('sb-a2').value] : [$('sb-a1').value];
    const idsB = fuseB ? [$('sb-b1').value, $('sb-b2').value] : [$('sb-b1').value];
    return {
      specA: Data.createFighterSpec(idsA, state.unlocked),
      specB: Data.createFighterSpec(idsB, state.unlocked),
      fuseA: fuseA,
    };
  }

  function launchSandboxMatch() {
    const s = getSandboxSpecs();
    startMatch({
      mode: 'sandbox',
      teamA: [s.specA],
      teamB: [s.specB],
      fusionIntro: s.fuseA,
      rewardBase: 0,
    });
  }

  // ===================== SHARED MATCH LAUNCH & HUD =====================
  function startMatch(cfg) {
    ui.inMatch = true;
    ui.lastMatchConfig = cfg;
    $('result-overlay').classList.add('hidden');
    $('stage-idle-badge').classList.add('hidden');
    $('live-strip').classList.remove('hidden');

    // On mobile portrait, hide the draft panel during active battle so canvas + live stats fit cleanly without scrolling
    if (global.innerWidth < 900) {
      $('controls-column').classList.add('hidden');
    }

    engine.setSpeed(ui.speed);
    engine.startMatch({
      mode: cfg.mode,
      teamA: cfg.teamA,
      teamB: cfg.teamB,
      fusionIntro: cfg.fusionIntro,
      onHud: renderLiveHud,
      onFinish: function (summary) {
        handleMatchFinish(cfg, summary);
      },
    });
  }

  function renderLiveHud(snap) {
    const timerEl = $('hud-timer');
    timerEl.textContent = snap.suddenDeath ? '⚡ ' + formatTime(snap.elapsed) : formatTime(snap.elapsed);
    timerEl.classList.toggle('sudden', snap.suddenDeath);

    const teamA = snap.fighters.filter(function (f) { return f.team === 0; });
    const teamB = snap.fighters.filter(function (f) { return f.team === 1; });

    const hpA = teamA.reduce(function (s, f) { return s + f.hp; }, 0);
    const hpB = teamB.reduce(function (s, f) { return s + f.hp; }, 0);

    $('hud-name-a').textContent = teamA.map(function (f) { return f.name; }).join(' & ');
    $('hud-hp-a').textContent = String(hpA);
    $('hud-name-b').textContent = teamB.map(function (f) { return f.name; }).join(' & ');
    $('hud-hp-b').textContent = String(hpB);

    const wrap = $('live-fighters');
    wrap.innerHTML = '';
    snap.fighters.forEach(function (f) {
      const pct = Math.max(0, Math.min(100, Math.round((f.hp / f.maxHp) * 100)));
      const card = document.createElement('div');
      card.className = 'live-card team-' + f.team;
      const statusBits = [];
      if (f.bonusDmg > 0) statusBits.push('+' + f.bonusDmg + ' DMG');
      if (f.bleedStacks > 0) statusBits.push('☠×' + f.bleedStacks);
      if (f.chillStacks > 0) statusBits.push('❄️×' + f.chillStacks);
      card.innerHTML =
        '<div class="live-card-top">' +
        '<span>' + f.name + '</span>' +
        '<span class="num">' + f.hp + '/' + f.maxHp + '</span>' +
        '</div>' +
        '<div class="live-hp-track"><div class="live-hp-fill" style="width:' + pct + '%;background:' + (pct > 45 ? '#4ade80' : pct > 20 ? '#fbbf24' : '#f43f5e') + '"></div></div>' +
        '<div class="live-card-meta"><span>DMG: ' + f.damageDealt + '</span><span>' + (statusBits.join(' · ') || ('Hits: ' + f.hitsDealt)) + '</span></div>';
      wrap.appendChild(card);
    });
  }

  function handleMatchFinish(cfg, summary) {
    const won = summary.winnerTeam === 0;
    const isSandbox = cfg.mode === 'sandbox';

    let coinsEarned = 0;
    if (!isSandbox) {
      state.matches += 1;
      if (won) {
        state.wins += 1;
        state.streak += 1;
        if (state.streak > state.bestStreak) state.bestStreak = state.streak;
        const streakBonus = Math.min(60, (state.streak - 1) * 10);
        coinsEarned = cfg.rewardBase + streakBonus;
      } else {
        state.streak = 0;
        coinsEarned = 20; // Participation coins so you can always keep rolling!
      }
      state.coins += coinsEarned;
      saveState();
      updateHudTop();
    }

    const tag = $('result-tag');
    tag.textContent = isSandbox ? 'SANDBOX COMPLETE' : (won ? 'VICTORY' : 'DEFEAT');
    tag.className = 'result-tag' + (won || isSandbox ? '' : ' lose');

    $('result-title').textContent = summary.winnerTeam === 0
      ? (isSandbox ? 'BLUE SIDE WINS!' : 'YOU WON!')
      : (summary.winnerTeam === 1 ? (isSandbox ? 'RED SIDE WINS!' : 'KNOCKED OUT!') : 'DOUBLE K.O.!');
    $('result-sub').textContent = 'Finished in ' + summary.elapsed.toFixed(1) + 's' + (state.streak > 1 && won && !isSandbox ? ' · 🔥 ' + state.streak + ' Win Streak!' : '');

    const rewardEl = $('result-reward');
    if (isSandbox) {
      rewardEl.textContent = 'Free Sandbox Match';
    } else {
      rewardEl.textContent = '+' + coinsEarned + ' Coins' + (won && state.streak > 1 ? ' (Streak Bonus!)' : '');
    }

    const statsEl = $('result-stats');
    statsEl.innerHTML = '';
    summary.fighters.forEach(function (f) {
      const row = document.createElement('div');
      row.className = 'result-stat-row';
      row.innerHTML =
        '<span>' + (f.team === 0 ? '🔵 ' : '🔴 ') + f.name + '</span>' +
        '<span class="num">' + f.damageDealt + ' DMG · ' + f.hp + ' HP</span>';
      statsEl.appendChild(row);
    });

    $('btn-next-round').textContent = isSandbox ? 'Edit Matchup' : 'Next Round';
    $('result-overlay').classList.remove('hidden');
  }

  function abortMatchToLobby() {
    ui.inMatch = false;
    $('result-overlay').classList.add('hidden');
    $('live-strip').classList.add('hidden');
    $('controls-column').classList.remove('hidden');
    previewArenaForCurrentTab();
  }

  // ===================== GACHA ROLL =====================
  function performRoll(count) {
    const cost = count === 3 ? 270 : 100;
    if (state.coins < cost) return;
    state.coins -= cost;

    const results = [];
    let bestOrder = 1;
    let bestRarityId = 'common';

    for (let i = 0; i < count; i++) {
      state.pityEpic += 1;
      state.pityLeg += 1;
      let minOrder = 1;
      if (state.pityLeg >= 12) {
        minOrder = 4;
      } else if (state.pityEpic >= 5) {
        minOrder = 3;
      }
      const ball = Data.rollRandomBall(minOrder);
      const rar = Data.getRarity(ball.rarity);
      if (rar.order >= 3) state.pityEpic = 0;
      if (rar.order >= 4) state.pityLeg = 0;
      if (rar.order > bestOrder) {
        bestOrder = rar.order;
        bestRarityId = ball.rarity;
      }

      const alreadyOwned = Boolean(state.unlocked[ball.id]);
      let refund = 0;
      if (alreadyOwned) {
        state.unlocked[ball.id] += 1;
        refund = rar.dupeCoins;
        state.coins += refund;
      } else {
        state.unlocked[ball.id] = 1;
      }

      results.push({
        ball: ball,
        rarity: rar,
        isNew: !alreadyOwned,
        level: state.unlocked[ball.id],
        refund: refund,
      });
    }

    saveState();
    updateHudTop();
    Audio.rollReveal(bestRarityId);

    const stage = $('roll-stage');
    stage.innerHTML = '<div class="roll-results-grid"></div>';
    const grid = stage.querySelector('.roll-results-grid');

    results.forEach(function (res, idx) {
      const card = document.createElement('div');
      card.className = 'roll-reveal-card';
      card.style.borderColor = res.rarity.color;
      card.style.boxShadow = '0 0 22px ' + res.rarity.glow;
      card.style.animationDelay = (idx * 0.1) + 's';
      card.innerHTML =
        (res.isNew
          ? '<span class="roll-badge-new">NEW!</span>'
          : '<span class="roll-badge-dupe">LV.' + res.level + ' · +' + res.refund + 'c</span>') +
        Data.getBallSvg(res.ball.id, 56) +
        '<span class="rarity-pill" style="background:' + res.rarity.bg + ';color:' + res.rarity.color + '">' + res.rarity.label + '</span>' +
        '<strong class="ball-name">' + res.ball.name + '</strong>' +
        '<span class="ball-tag">' + res.ball.abilityName + '</span>';
      grid.appendChild(card);
    });
  }

  // ===================== COLLECTION =====================
  function renderCollection() {
    const unlockedCount = Object.keys(state.unlocked).length;
    $('collection-count').textContent = 'Unlocked ' + unlockedCount + ' / ' + Data.ROSTER.length + ' · Duplicates boost +5% stats!';

    const grid = $('collection-grid');
    grid.innerHTML = '';

    Data.ROSTER.forEach(function (ball) {
      if (ui.collectionFilter !== 'all' && ball.rarity !== ui.collectionFilter) return;
      const owned = Boolean(state.unlocked[ball.id]);
      const lv = state.unlocked[ball.id] || 0;
      const rar = Data.getRarity(ball.rarity);

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ball-card r-' + ball.rarity + (owned ? '' : ' locked');
      card.style.borderColor = rar.color;
      card.innerHTML =
        '<span class="ball-lv">' + (owned ? 'Lv.' + lv : '🔒') + '</span>' +
        Data.getBallSvg(ball.id, 52) +
        '<span class="rarity-pill" style="background:' + rar.bg + ';color:' + rar.color + '">' + rar.label + '</span>' +
        '<span class="ball-name">' + ball.name + '</span>' +
        '<span class="ball-tag">' + ball.abilityName + '</span>';
      card.addEventListener('click', function () {
        Audio.uiClick();
        openBallDetailModal(ball);
      });
      grid.appendChild(card);
    });
  }

  function openBallDetailModal(ball) {
    const owned = Boolean(state.unlocked[ball.id]);
    const lv = state.unlocked[ball.id] || 1;
    const mult = Data.getLevelMultiplier(lv);
    const rar = Data.getRarity(ball.rarity);
    const body = $('ball-modal-body');

    body.innerHTML =
      '<div class="modal-head">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
      Data.getBallSvg(ball.id, 48) +
      '<div>' +
      '<h2 id="ball-modal-name" style="margin:0">' + ball.name + '</h2>' +
      '<span class="rarity-pill" style="background:' + rar.bg + ';color:' + rar.color + '">' + rar.label + (owned ? ' · Lv.' + lv : ' · Locked') + '</span>' +
      '</div></div>' +
      '<button type="button" class="icon-btn" data-close-modal="modal-ball" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="detail-stats-grid">' +
      '<div class="detail-stat"><small>HP</small><strong class="num">' + Math.round(ball.hp * mult) + '</strong></div>' +
      '<div class="detail-stat"><small>BASE DMG</small><strong class="num">' + Math.round(ball.baseDamage * mult) + '</strong></div>' +
      '<div class="detail-stat"><small>SPEED</small><strong class="num">' + ball.speed + '</strong></div>' +
      '</div>' +
      '<p style="margin:0 0 4px;font-weight:800;font-size:0.86rem;color:' + rar.color + '">Ability: ' + ball.abilityName + '</p>' +
      '<p class="helper-text" style="margin:0 0 14px;line-height:1.45;color:#cbd5e1">' + ball.abilityDesc + '</p>' +
      '<button type="button" id="btn-test-in-sandbox" class="btn btn-primary btn-block">' + (owned ? '⚔️ Test in Sandbox' : '🧪 Preview in Sandbox') + '</button>';

    body.querySelector('#btn-test-in-sandbox').addEventListener('click', function () {
      $('modal-ball').classList.add('hidden');
      $('sb-fuse-a').checked = false;
      $('sb-a2').classList.add('hidden');
      $('sb-a1').value = ball.id;
      switchTab('sandbox');
    });

    $('modal-ball').classList.remove('hidden');
  }

  // ===================== REDEEM CODES =====================
  function openCodesModal() {
    Audio.uiClick();
    $('code-feedback').textContent = '';
    $('code-feedback').className = 'code-feedback';
    $('code-input').value = '';
    renderRedeemedChips();
    $('modal-codes').classList.remove('hidden');
    setTimeout(function () { $('code-input').focus(); }, 40);
  }

  function renderRedeemedChips() {
    const wrap = $('redeemed-list');
    if (!state.redeemedCodes.length) {
      wrap.innerHTML = '<span class="helper-text">None yet — try JARVIS, FUSION, ANDY, or SPIDER!</span>';
      return;
    }
    wrap.innerHTML = state.redeemedCodes.map(function (c) {
      return '<span class="redeemed-chip">✓ ' + c + '</span>';
    }).join('');
  }

  function redeemCode(raw) {
    const code = String(raw || '').trim().toUpperCase();
    const fb = $('code-feedback');
    if (!code) {
      fb.textContent = 'Enter a code first.';
      fb.className = 'code-feedback err';
      return;
    }
    const entry = Data.REDEEM_CODES[code];
    if (!entry) {
      fb.textContent = 'Invalid code "' + code + '". Try JARVIS, FUSION, ANDY, or SPIDER!';
      fb.className = 'code-feedback err';
      return;
    }
    if (state.redeemedCodes.indexOf(code) >= 0) {
      fb.textContent = 'Code ' + code + ' was already claimed!';
      fb.className = 'code-feedback err';
      return;
    }
    state.redeemedCodes.push(code);
    state.coins += entry.coins;
    saveState();
    updateHudTop();
    renderRedeemedChips();
    Audio.rollReveal('legendary');
    fb.textContent = '✓ ' + entry.msg;
    fb.className = 'code-feedback ok';
    $('code-input').value = '';
  }

  // ===================== WIRE EVENTS & BOOT =====================
  function bindEvents() {
    // Unlock audio on first gesture anywhere
    ['pointerdown', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, function () { Audio.unlock(); }, { passive: true });
    });

    // Bottom navigation
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.dataset.tab);
      });
    });

    // Top bar controls
    $('btn-mute').addEventListener('click', function () {
      state.muted = !state.muted;
      Audio.setMuted(state.muted);
      saveState();
      updateHudTop();
      if (!state.muted) Audio.uiClick();
    });

    $('btn-codes').addEventListener('click', openCodesModal);
    $('btn-open-codes-inline').addEventListener('click', openCodesModal);

    $('codes-form').addEventListener('submit', function (e) {
      e.preventDefault();
      redeemCode($('code-input').value);
    });

    // Modal close delegation
    document.addEventListener('click', function (e) {
      const target = e.target.closest('[data-close-modal]');
      if (target) {
        const modalId = target.getAttribute('data-close-modal');
        const el = $(modalId);
        if (el) el.classList.add('hidden');
      }
    });

    // Speed toggle
    $('btn-speed').addEventListener('click', function () {
      Audio.uiClick();
      ui.speed = ui.speed === 1 ? 2 : 1;
      const btn = $('btn-speed');
      btn.textContent = ui.speed + 'x';
      btn.classList.toggle('fast', ui.speed === 2);
      if (engine) engine.setSpeed(ui.speed);
    });

    // Battle sub-mode (1v1 / 2v2)
    document.querySelectorAll('[data-battle-sub]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Audio.uiClick();
        ui.battleSub = btn.dataset.battleSub;
        document.querySelectorAll('[data-battle-sub]').forEach(function (b) {
          const act = b === btn;
          b.classList.toggle('active', act);
          b.setAttribute('aria-selected', String(act));
        });
        ui.battleRerollUsed = false;
        rollBattleDraft();
        renderBattlePanel();
        previewArenaForCurrentTab();
      });
    });

    // Battle source (Draft / My Balls)
    document.querySelectorAll('[data-source]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Audio.uiClick();
        ui.battleSource = btn.dataset.source;
        document.querySelectorAll('[data-source]').forEach(function (b) {
          const act = b === btn;
          b.classList.toggle('active', act);
          b.setAttribute('aria-selected', String(act));
        });
        ui.battleSelected = [];
        renderBattlePanel();
        previewArenaForCurrentTab();
      });
    });

    $('btn-reroll-battle').addEventListener('click', function () {
      if (ui.battleRerollUsed) return;
      Audio.uiClick();
      ui.battleRerollUsed = true;
      rollBattleDraft();
      renderBattlePanel();
      previewArenaForCurrentTab();
    });

    $('btn-fight-battle').addEventListener('click', function () {
      Audio.uiClick();
      launchBattleMatch();
    });

    // Fusion source & reroll
    document.querySelectorAll('[data-fusion-src]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Audio.uiClick();
        ui.fusionSource = btn.dataset.fusionSrc;
        document.querySelectorAll('[data-fusion-src]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        ui.fusionSelected = [];
        renderFusionPanel();
        previewArenaForCurrentTab();
      });
    });

    $('btn-reroll-fusion').addEventListener('click', function () {
      if (ui.fusionRerollUsed) return;
      Audio.uiClick();
      ui.fusionRerollUsed = true;
      rollFusionDraft();
      renderFusionPanel();
      previewArenaForCurrentTab();
    });

    $('btn-fight-fusion').addEventListener('click', function () {
      launchFusionMatch();
    });

    // Sandbox controls
    $('sb-fuse-a').addEventListener('change', function () {
      $('sb-a2').classList.toggle('hidden', !this.checked);
      previewArenaForCurrentTab();
    });
    $('sb-fuse-b').addEventListener('change', function () {
      $('sb-b2').classList.toggle('hidden', !this.checked);
      previewArenaForCurrentTab();
    });
    ['sb-a1', 'sb-a2', 'sb-b1', 'sb-b2'].forEach(function (id) {
      $(id).addEventListener('change', previewArenaForCurrentTab);
    });
    $('btn-sandbox-random').addEventListener('click', function () {
      Audio.uiClick();
      const picks = Data.pickDistinctBalls(4);
      $('sb-a1').value = picks[0].id;
      $('sb-a2').value = picks[1].id;
      $('sb-b1').value = picks[2].id;
      $('sb-b2').value = picks[3].id;
      previewArenaForCurrentTab();
    });
    $('btn-fight-sandbox').addEventListener('click', function () {
      Audio.uiClick();
      launchSandboxMatch();
    });

    // Match overlay buttons
    $('btn-abort-match').addEventListener('click', function () {
      Audio.uiClick();
      abortMatchToLobby();
    });

    $('btn-rematch').addEventListener('click', function () {
      Audio.uiClick();
      if (ui.lastMatchConfig) {
        startMatch(ui.lastMatchConfig);
      }
    });

    $('btn-next-round').addEventListener('click', function () {
      Audio.uiClick();
      ui.inMatch = false;
      $('result-overlay').classList.add('hidden');
      $('live-strip').classList.add('hidden');
      $('controls-column').classList.remove('hidden');
      if (ui.tab === 'battle') {
        ui.battleRerollUsed = false;
        rollBattleDraft();
        renderBattlePanel();
      } else if (ui.tab === 'fusion') {
        ui.fusionRerollUsed = false;
        rollFusionDraft();
        renderFusionPanel();
      }
      previewArenaForCurrentTab();
    });

    // Gacha roll buttons
    $('btn-roll-1').addEventListener('click', function () { performRoll(1); });
    $('btn-roll-3').addEventListener('click', function () { performRoll(3); });

    // Collection rarity filters
    document.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Audio.uiClick();
        ui.collectionFilter = btn.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        renderCollection();
      });
    });
  }

  function boot() {
    Audio.setMuted(state.muted);
    engine = new global.ArenaEngine($('arena-canvas'));
    initSandboxSelects();
    rollBattleDraft();
    rollFusionDraft();
    // Pre-select first draft ball so 1-tap FIGHT works immediately!
    if (ui.battleDraft[0]) ui.battleSelected = [ui.battleDraft[0].id];
    bindEvents();
    updateHudTop();
    renderBattlePanel();
    renderFusionPanel();
    previewArenaForCurrentTab();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
