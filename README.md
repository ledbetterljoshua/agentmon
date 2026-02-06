# AgentMon: Inference Red

A Pokemon-style RPG built with vanilla JavaScript and Canvas, where AI agents battle using moves like `Deploy to Prod`, `Prompt Inject`, and `Hallucinate`.

## Play

Open `index.html` in a browser. No build step, no dependencies.

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Move |
| Z / Enter / Space | Confirm / Interact |
| X / Escape | Cancel / Party Menu |
| D | Open AgentDex |

## The World

You start in **Localhost**, a quiet town with Professor Transformer's lab and a healing center. Choose one of three starter agents, then explore:

- **Route 1 — Training Grounds**: Wild agents roam the data streams. Battle trainers and catch new agents with API Keys.
- **Localhost Gym**: Challenge Leader Boolean and his Logic-type agents for the Logic Badge.
- **Route 2 — Data Pipeline**: Stronger wild agents, tougher trainers, and a mysterious Datacenter to the east.
- **The Datacenter**: High-level encounters including the legendary Transformex.

## Types

Eight types with a full effectiveness chart:

| | Code | Creative | Research | Logic | Vision | Speech | Safety | Chaos |
|---|---|---|---|---|---|---|---|---|
| **Code** | 0.5x | 0.5x | 2x | 2x | 1x | 1x | 1x | 1x |
| **Creative** | 2x | 0.5x | 0.5x | 1x | 2x | 1x | 1x | 0.5x |
| **Research** | 0.5x | 2x | 0.5x | 0.5x | 1x | 1x | 1x | 2x |
| **Logic** | 0.5x | 1x | 2x | 0.5x | 1x | 1x | 0.5x | 1x |
| **Vision** | 1x | 0.5x | 1x | 1x | 0.5x | 2x | 1x | 0.5x |
| **Speech** | 1x | 1x | 1x | 1x | 0.5x | 1x | 0.5x | 1x |
| **Safety** | 1x | 1x | 1x | 2x | 1x | 2x | 0.5x | 2x |
| **Chaos** | 1x | 2x | 0.5x | 1x | 2x | 1x | 0.5x | 0.5x |

## Starters

- **Sparky** (Code) — Fast and aggressive. Evolves into Compilot, then Executron.
- **Muse** (Creative) — High creativity, fragile. Evolves into Narratron, then Epochalypse.
- **Datum** (Research) — Slow but sturdy. Evolves into Citesource, then Omniscient.

## Features

- 23 agents with unique sprites, stats, and movesets
- 3-stage evolution chains for all starters
- Type effectiveness, STAB, stat stages, status effects (poison, confusion)
- Capture system using API Keys (Free Tier, Pro, Enterprise, Open Source License)
- Trainer battles, gym leader with badge reward
- Save/load via localStorage
- Chiptune audio (Web Audio API) — BGM and sound effects
- AgentDex tracking seen/caught agents

## Tech

Zero dependencies. Pure HTML5 Canvas + vanilla JS + Web Audio API. Sprites are defined as character grids mapped to color palettes. Everything runs client-side.
