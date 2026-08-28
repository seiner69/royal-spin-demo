# Royal Spin Demo

Royal Spin Demo is a responsive slot-machine interface built for front-end state, animation, audio, and accessibility experiments. It uses virtual chips only: there is no account system, payment, deposit, withdrawal, prize, or backend.

## Highlights

- Five reels across three rows with five predefined paylines
- Four deterministic payout tiers driven by an isolated game model
- Single-spin and 20-spin automatic modes
- Persistent local statistics and virtual-chip balance
- Web Audio win cues with no bundled media files
- Keyboard control, ARIA state, responsive rails, and CSS celebration effects

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer

## Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Press `Space` outside a focused control to spin, or use the on-screen button.

## Validate

```bash
npm test
npm run build
```

The tests exercise constants, grid invariants, and all four payout tiers with deterministic random sources. The production build also runs strict TypeScript checking.

## Project structure

```text
src/App.tsx          Interface state, animations, audio, and controls
src/game-model.ts    Symbols, paylines, bets, and payout outcomes
src/styles.css       Responsive machine, side rails, and effects
src/main.tsx         React entry point
tests/               Deterministic game-model tests
```

## Known limitations

- Outcome thresholds are intentionally fixed for demonstration and are not a regulated return-to-player model.
- `Math.random()` is suitable for a visual demo, not for wagering or security-sensitive decisions.
- Local progress is stored only in the current browser.
- Some navigation buttons are decorative interface elements.

## Provenance

The original Codex-assisted prototype was created on 2026-08-15. This repository is a clean standalone reconstruction of its code-generated game core. Third-party-inspired metadata, generic Sites infrastructure, hosting configuration, template examples, build caches, generated outputs, and the original Git history were excluded. No external art, audio, fonts, or user data are included.

No open-source license is included; default copyright applies.
