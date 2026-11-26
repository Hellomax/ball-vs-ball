# Ball vs Ball: Fusion Arena

A fast, mobile-first 60fps HTML5 Canvas auto-battle physics arena inspired by Roblox **Ball VS Ball [Fusion Mode]**. Built with zero dependencies — pure HTML, CSS, JavaScript, and Web Audio API — so it runs straight on iPhone, desktop, or GitHub Pages.

## Play Now
- **Live Arena:** https://ball-vs-ball-arena.sites.tab.bot/
- **GitHub Pages:** `https://hellomax.github.io/ball-vs-ball/` (once Pages is active on `main` / root)

## Features
- **60fps Physics Arena**: Elastic wall & ball collisions, weapon-vs-weapon parries with hit-stop micro-freezes, screen shake, floating damage numbers, particle sparks, and a 25-second **Sudden Death** shrinking laser-spike border.
- **4 Game Modes**:
  - **1v1 Battle**: Draft 1 of 3 random balls (any rarity, with 1 free Reroll) or pick from your unlocked collection to build win streaks and earn Coins.
  - **2v2 Brawl**: Draft a duo and watch a chaotic 4-ball clash!
  - **Fusion Mode**: Fuse ANY 2 balls into one glowing dual-gradient hybrid carrying **both weapons & abilities** simultaneously against a Fused Boss!
  - **Sandbox Lab**: Pit any ball or Fusion against any other freely.
- **17 Unique Balls Across 5 Rarities**:
  - **Common**: Sword, Spear, Dagger, Shield
  - **Rare**: Bow, Hammer, Frost, Boomerang
  - **Epic**: Scythe, Cannon, Phantom, Vampire
  - **Legendary**: Conductor, Shackles, Zone
  - **Mythic**: Laser, Nova
- **Gacha Roll, Pity & Duplicates**: Roll 1× (100 Coins) or 3× (270 Coins) with Epic+ (5) and Legendary+ (12) pity. Duplicates level up your ball (+5% HP & DMG per level) AND refund bonus Coins!
- **Pure Web Audio SFX**: Synthesized blade clangs, arrow twangs, laser sweeps, lightning crackles, explosions, and fusion chords with a mute toggle and `1x` / `2x` battle speed toggle.

## Starter Redeem Codes
Tap the **🎁** button in the top-right bar to claim free Coins (one time each, saved automatically in `localStorage`):
- `JARVIS` — +250 Coins
- `FUSION` — +300 Coins
- `ANDY` — +500 Coins
- `SPIDER` — +250 Coins

## How to Mod / Add Your Own Balls
Everything is pure static files with zero build step:
- `roster.js` — Edit ball stats, rarities, redeem codes, or add new balls to `ROSTER`!
- `arena.js` — Physics engine, weapon behaviors, Sudden Death rules, and canvas visuals.
- `audio.js` — Synthesized Web Audio sound effects.
- `app.js` — UI, modes, Gacha rolls, and `localStorage` saving.
- `index.html` & `styles.css` — Mobile-first dark-arcade layout.

## Hosting on GitHub Pages
1. Open your repository **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`, then click **Save**.
