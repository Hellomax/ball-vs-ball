/**
 * BALL VS BALL: FUSION ARENA — Pure Web Audio API Synthesizer
 * Zero external audio assets; unlocks cleanly on first user tap.
 */
(function (global) {
  'use strict';

  let ctx = null;
  let muted = false;
  let lastPlay = Object.create(null);

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        ctx = new AudioCtx();
      } catch (_err) {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function unlock() {
    if (!muted) ensureCtx();
  }

  function setMuted(next) {
    muted = Boolean(next);
  }

  function isMuted() {
    return muted;
  }

  function throttle(key, minMs) {
    const now = performance.now();
    if (lastPlay[key] && now - lastPlay[key] < minMs) return false;
    lastPlay[key] = now;
    return true;
  }

  function noiseBuffer(audioCtx, durationSec) {
    const len = Math.max(1, Math.floor(audioCtx.sampleRate * durationSec));
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  function uiClick() {
    const c = ensureCtx();
    if (!c || !throttle('ui', 30)) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(920, t + 0.045);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  function wallBounce() {
    const c = ensureCtx();
    if (!c || !throttle('wall', 45)) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(68, t + 0.06);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  function clang() {
    const c = ensureCtx();
    if (!c || !throttle('clang', 50)) return;
    const t = c.currentTime;
    const freqs = [1180, 1790, 2650];
    freqs.forEach(function (f, idx) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = idx === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(f * (0.95 + Math.random() * 0.1), t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.14);
      gain.gain.setValueAtTime(0.055 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  function hit(heavy) {
    const c = ensureCtx();
    if (!c || !throttle('hit', 35)) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = heavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(heavy ? 185 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 45 : 75, t + (heavy ? 0.14 : 0.08));
    gain.gain.setValueAtTime(heavy ? 0.16 : 0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.15 : 0.09));
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + (heavy ? 0.16 : 0.095));
  }

  function arrow() {
    const c = ensureCtx();
    if (!c || !throttle('arrow', 55)) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(760, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.075);
    gain.gain.setValueAtTime(0.075, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.085);
  }

  function laser() {
    const c = ensureCtx();
    if (!c || !throttle('laser', 140)) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.24);
    gain.gain.setValueAtTime(0.095, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  function lightning() {
    const c = ensureCtx();
    if (!c || !throttle('lightning', 80)) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.14);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, t);
    filter.Q.setValueAtTime(3.2, t);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(t);
  }

  function explosion() {
    const c = ensureCtx();
    if (!c || !throttle('explosion', 90)) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.28);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(640, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.28);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.29);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(t);

    const sub = c.createOscillator();
    const sgain = c.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(34, t + 0.22);
    sgain.gain.setValueAtTime(0.16, t);
    sgain.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
    sub.connect(sgain);
    sgain.connect(c.destination);
    sub.start(t);
    sub.stop(t + 0.24);
  }

  function freeze() {
    const c = ensureCtx();
    if (!c || !throttle('freeze', 90)) return;
    const t = c.currentTime;
    [1318, 1760].forEach(function (f, i) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.03);
      gain.gain.setValueAtTime(0.06, t + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t + i * 0.03);
      osc.stop(t + 0.19);
    });
  }

  function drain() {
    const c = ensureCtx();
    if (!c || !throttle('drain', 90)) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.14);
    gain.gain.setValueAtTime(0.075, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  function fusion() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const notes = [261.6, 329.6, 392.0, 523.3, 659.3, 784.0];
    notes.forEach(function (freq, idx) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
      const start = t + idx * 0.065;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, start + 0.25);
      gain.gain.setValueAtTime(0.075, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  function rollReveal(rarityId) {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const chords = {
      common: [392, 493.9],
      rare: [440, 554.4, 659.3],
      epic: [440, 523.3, 659.3, 880],
      legendary: [523.3, 659.3, 784, 1046.5],
      mythic: [523.3, 659.3, 784, 987.8, 1318.5],
    };
    const notes = chords[rarityId] || chords.common;
    notes.forEach(function (freq, idx) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = rarityId === 'mythic' || rarityId === 'legendary' ? 'triangle' : 'sine';
      const st = t + idx * 0.055;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.09, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.36);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(st);
      osc.stop(st + 0.38);
    });
  }

  function ko(playerWon) {
    explosion();
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime + 0.1;
    const notes = playerWon ? [523.3, 659.3, 784.0, 1046.5] : [392.0, 349.2, 293.7];
    notes.forEach(function (freq, idx) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      const st = t + idx * 0.08;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.095, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.34);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(st);
      osc.stop(st + 0.36);
    });
  }

  function suddenDeath() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    [440, 293.7, 440].forEach(function (freq, idx) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sawtooth';
      const st = t + idx * 0.11;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.075, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.1);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(st);
      osc.stop(st + 0.11);
    });
  }

  global.BVBAudio = {
    unlock: unlock,
    setMuted: setMuted,
    isMuted: isMuted,
    uiClick: uiClick,
    wallBounce: wallBounce,
    clang: clang,
    hit: hit,
    arrow: arrow,
    laser: laser,
    lightning: lightning,
    explosion: explosion,
    freeze: freeze,
    drain: drain,
    fusion: fusion,
    rollReveal: rollReveal,
    ko: ko,
    suddenDeath: suddenDeath,
  };
})(window);
