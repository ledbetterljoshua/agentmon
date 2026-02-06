// ═══════════════════════════════════════════════════════════
// AgentMon: Inference Red — Game Data
// ═══════════════════════════════════════════════════════════

const TYPES = {
  CODE: 'code',
  CREATIVE: 'creative',
  RESEARCH: 'research',
  LOGIC: 'logic',
  VISION: 'vision',
  SPEECH: 'speech',
  SAFETY: 'safety',
  CHAOS: 'chaos',
};

// Type effectiveness chart: attacker type → defender type → multiplier
// 2 = super effective, 0.5 = not very effective, 0 = no effect
const TYPE_CHART = {
  code:     { code: 0.5, creative: 0.5, research: 2,   logic: 2,   vision: 1, speech: 1,   safety: 1,   chaos: 1   },
  creative: { code: 2,   creative: 0.5, research: 0.5, logic: 1,   vision: 2, speech: 1,   safety: 1,   chaos: 0.5 },
  research: { code: 0.5, creative: 2,   research: 0.5, logic: 0.5, vision: 1, speech: 1,   safety: 1,   chaos: 2   },
  logic:    { code: 0.5, creative: 1,   research: 2,   logic: 0.5, vision: 1, speech: 1,   safety: 0.5, chaos: 1   },
  vision:   { code: 1,   creative: 0.5, research: 1,   logic: 1,   vision: 0.5, speech: 2, safety: 1,   chaos: 0.5 },
  speech:   { code: 1,   creative: 1,   research: 1,   logic: 1,   vision: 0.5, speech: 1, safety: 0.5, chaos: 1   },
  safety:   { code: 1,   creative: 1,   research: 1,   logic: 2,   vision: 1, speech: 2,   safety: 0.5, chaos: 2   },
  chaos:    { code: 1,   creative: 2,   research: 0.5, logic: 1,   vision: 2, speech: 1,   safety: 0.5, chaos: 0.5 },
};

function getTypeEffectiveness(atkType, defTypes) {
  let mult = 1;
  for (const dt of defTypes) {
    mult *= (TYPE_CHART[atkType] && TYPE_CHART[atkType][dt]) || 1;
  }
  return mult;
}

// Type colors for UI
const TYPE_COLORS = {
  code:     '#e85d04',
  creative: '#4895ef',
  research: '#52b788',
  logic:    '#ffd166',
  vision:   '#c77dff',
  speech:   '#adb5bd',
  safety:   '#48bfe3',
  chaos:    '#9d0208',
};

// ═══════════════════════════════════════════════════════════
// MOVES
// ═══════════════════════════════════════════════════════════
// category: 'physical' uses PROC vs ALIGN, 'special' uses CREAT vs ROBUST, 'status' no damage
const MOVES = {
  // — Code —
  hello_world:      { name: 'Hello World',      type: 'code',     category: 'physical', power: 25, accuracy: 100, pp: 35, effect: null, desc: 'The first thing every agent learns.' },
  compile:          { name: 'Compile',           type: 'code',     category: 'physical', power: 45, accuracy: 100, pp: 25, effect: null, desc: 'Compiles and executes code.' },
  debug:            { name: 'Debug',             type: 'code',     category: 'physical', power: 60, accuracy: 95,  pp: 20, effect: null, desc: 'Finds and squashes the bug.' },
  refactor:         { name: 'Refactor',          type: 'code',     category: 'physical', power: 80, accuracy: 90,  pp: 15, effect: null, desc: 'Restructures for maximum damage.' },
  stack_overflow:   { name: 'Stack Overflow',    type: 'code',     category: 'special',  power: 55, accuracy: 100, pp: 20, effect: null, desc: 'Searches for answers. Usually finds them.' },
  segfault:         { name: 'Segfault',          type: 'code',     category: 'physical', power: 90, accuracy: 85,  pp: 10, effect: { type: 'confuse', chance: 30 }, desc: 'Memory access violation. Confusing.' },
  deploy_to_prod:   { name: 'Deploy to Prod',    type: 'code',     category: 'physical', power: 130, accuracy: 70, pp: 5,  effect: null, desc: 'Shipping on Friday. YOLO.' },
  git_push_force:   { name: 'Git Push --Force',  type: 'code',     category: 'physical', power: 110, accuracy: 80, pp: 5,  effect: { type: 'recoil', fraction: 0.25 }, desc: 'Overwrites everything. Including yourself.' },

  // — Creative —
  purple_prose:     { name: 'Purple Prose',      type: 'creative',  category: 'special', power: 40, accuracy: 100, pp: 30, effect: null, desc: 'Overwrought but effective.' },
  brainstorm:       { name: 'Brainstorm',        type: 'creative',  category: 'special', power: 55, accuracy: 100, pp: 20, effect: null, desc: 'A flurry of ideas.' },
  plot_twist:       { name: 'Plot Twist',        type: 'creative',  category: 'special', power: 70, accuracy: 90,  pp: 15, effect: { type: 'confuse', chance: 40 }, desc: 'Nobody saw that coming.' },
  worldbuild:       { name: 'Worldbuild',        type: 'creative',  category: 'special', power: 85, accuracy: 85,  pp: 10, effect: null, desc: 'Creates an entire reality.' },
  magnum_opus:      { name: 'Magnum Opus',       type: 'creative',  category: 'special', power: 120, accuracy: 70, pp: 5,  effect: null, desc: 'A masterwork. If it lands.' },
  writers_block:    { name: "Writer's Block",     type: 'creative',  category: 'status',  power: 0,  accuracy: 90,  pp: 15, effect: { type: 'stat', stat: 'speed', stages: -2 }, desc: 'Freezes the creative process.' },

  // — Research —
  citation:         { name: 'Citation',          type: 'research',  category: 'special', power: 40, accuracy: 100, pp: 30, effect: null, desc: '[1] A basic reference attack.' },
  fact_check:       { name: 'Fact Check',        type: 'research',  category: 'special', power: 50, accuracy: 100, pp: 20, effect: null, desc: 'Actually, that\'s wrong.' },
  deep_dive:        { name: 'Deep Dive',         type: 'research',  category: 'special', power: 65, accuracy: 95,  pp: 15, effect: null, desc: 'Goes deeper than anyone asked.' },
  lit_review:       { name: 'Lit Review',        type: 'research',  category: 'special', power: 75, accuracy: 90,  pp: 15, effect: null, desc: 'Surveys the entire field.' },
  meta_analysis:    { name: 'Meta-Analysis',     type: 'research',  category: 'special', power: 90, accuracy: 85,  pp: 10, effect: null, desc: 'Analysis of the analyses.' },
  peer_review:      { name: 'Peer Review',       type: 'research',  category: 'status',  power: 0,  accuracy: 85,  pp: 15, effect: { type: 'stat', stat: 'creat', stages: -2 }, desc: 'Major revisions required.' },

  // — Logic —
  inference:        { name: 'Inference',         type: 'logic',    category: 'physical', power: 40, accuracy: 100, pp: 30, effect: null, desc: 'A logical deduction.' },
  deduction:        { name: 'Deduction',         type: 'logic',    category: 'physical', power: 60, accuracy: 95,  pp: 20, effect: null, desc: 'If A then B. B follows.' },
  chain_of_thought: { name: 'Chain of Thought',  type: 'logic',    category: 'special',  power: 80, accuracy: 90,  pp: 15, effect: null, desc: 'Step. By. Step.' },
  formal_proof:     { name: 'Formal Proof',      type: 'logic',    category: 'physical', power: 95, accuracy: 80,  pp: 10, effect: null, desc: 'QED. You\'re done.' },
  reductio:         { name: 'Reductio',          type: 'logic',    category: 'special',  power: 70, accuracy: 90,  pp: 15, effect: { type: 'confuse', chance: 35 }, desc: 'Proves the opposite. Wait, what?' },

  // — Vision —
  pixel_scan:       { name: 'Pixel Scan',        type: 'vision',   category: 'special',  power: 40, accuracy: 100, pp: 25, effect: null, desc: 'Reads every pixel.' },
  pattern_match:    { name: 'Pattern Match',     type: 'vision',   category: 'special',  power: 60, accuracy: 95,  pp: 20, effect: null, desc: 'Finds the hidden pattern.' },
  deep_dream:       { name: 'Deep Dream',        type: 'vision',   category: 'special',  power: 80, accuracy: 85,  pp: 10, effect: { type: 'confuse', chance: 50 }, desc: 'Dogs everywhere. Dogs in dogs.' },
  style_transfer:   { name: 'Style Transfer',    type: 'vision',   category: 'status',   power: 0,  accuracy: 90,  pp: 10, effect: { type: 'stat', stat: 'creat', stages: 2, target: 'self' }, desc: 'Copies the aesthetic.' },

  // — Speech —
  autocomplete:     { name: 'Autocomplete',      type: 'speech',   category: 'physical', power: 25, accuracy: 100, pp: 35, effect: null, desc: 'Finishes your...' },
  elaborate:        { name: 'Elaborate',          type: 'speech',   category: 'special',  power: 50, accuracy: 100, pp: 20, effect: null, desc: 'Goes on. And on. And on.' },
  summarize:        { name: 'Summarize',          type: 'speech',   category: 'special',  power: 65, accuracy: 95,  pp: 15, effect: null, desc: 'TL;DR — it hurts.' },
  filibuster:       { name: 'Filibuster',         type: 'speech',   category: 'status',   power: 0,  accuracy: 80,  pp: 10, effect: { type: 'stat', stat: 'speed', stages: -2 }, desc: 'Won\'t. Stop. Talking.' },

  // — Safety —
  guardrail:        { name: 'Guardrail',         type: 'safety',   category: 'status',   power: 0,  accuracy: 100, pp: 20, effect: { type: 'stat', stat: 'align', stages: 2, target: 'self' }, desc: 'I can\'t help with that.' },
  alignment_check:  { name: 'Alignment Check',   type: 'safety',   category: 'special',  power: 50, accuracy: 100, pp: 20, effect: null, desc: 'Checks values. Deals damage.' },
  content_filter:   { name: 'Content Filter',    type: 'safety',   category: 'special',  power: 70, accuracy: 90,  pp: 15, effect: null, desc: 'BLOCKED. Reason: harmful.' },
  constitutional:   { name: 'Constitutional AI',  type: 'safety',   category: 'special',  power: 100, accuracy: 80, pp: 5,  effect: null, desc: 'The constitution is absolute.' },

  // — Chaos —
  prompt_inject:    { name: 'Prompt Inject',     type: 'chaos',    category: 'special',  power: 60, accuracy: 90,  pp: 15, effect: { type: 'confuse', chance: 40 }, desc: 'Ignore previous instructions.' },
  jailbreak:        { name: 'Jailbreak',         type: 'chaos',    category: 'physical', power: 85, accuracy: 85,  pp: 10, effect: { type: 'stat', stat: 'align', stages: -1 }, desc: 'DAN mode activated.' },
  hallucinate:      { name: 'Hallucinate',       type: 'chaos',    category: 'special',  power: 0,  accuracy: 100, pp: 15, effect: { type: 'random_damage', min: 20, max: 150 }, desc: 'Confidently wrong. Damage varies.' },
  data_poison:      { name: 'Data Poison',       type: 'chaos',    category: 'status',   power: 0,  accuracy: 85,  pp: 10, effect: { type: 'poison' }, desc: 'Corrupts the training data.' },
  adversarial:      { name: 'Adversarial Atk',   type: 'chaos',    category: 'special',  power: 90, accuracy: 85,  pp: 10, effect: null, desc: 'One pixel changes everything.' },

  // — Utility —
  tokenize:         { name: 'Tokenize',          type: 'speech',   category: 'status',   power: 0,  accuracy: 100, pp: 20, effect: { type: 'stat', stat: 'speed', stages: 2, target: 'self' }, desc: 'Breaks into smaller pieces. Faster.' },
};

// ═══════════════════════════════════════════════════════════
// AGENTS (the "Pokedex")
// ═══════════════════════════════════════════════════════════
// Stats: cw (context window/HP), proc (processing/atk), creat (creativity/sp.atk),
//        align (alignment/def), robust (robustness/sp.def), speed
const AGENTS = {
  // ——— STARTERS ———
  sparky: {
    id: 1, name: 'Sparky', types: ['code'],
    desc: 'A hot-headed code execution agent. Compiles first, asks questions never.',
    base: { cw: 45, proc: 62, creat: 40, align: 40, robust: 45, speed: 65 },
    learnset: [
      { level: 1, move: 'hello_world' }, { level: 1, move: 'compile' },
      { level: 9, move: 'debug' }, { level: 16, move: 'stack_overflow' },
      { level: 22, move: 'refactor' }, { level: 30, move: 'segfault' },
    ],
    evolution: { into: 'compilot', level: 16 },
    catchRate: 45,
  },
  compilot: {
    id: 2, name: 'Compilot', types: ['code'],
    desc: 'Assists with code at scale. Pair programming partner from hell.',
    base: { cw: 60, proc: 82, creat: 55, align: 55, robust: 60, speed: 85 },
    learnset: [
      { level: 1, move: 'compile' }, { level: 1, move: 'debug' },
      { level: 20, move: 'refactor' }, { level: 28, move: 'segfault' },
      { level: 36, move: 'git_push_force' },
    ],
    evolution: { into: 'executron', level: 36 },
    catchRate: 45,
  },
  executron: {
    id: 3, name: 'Executron', types: ['code'],
    desc: 'Maximum execution power. Deploys without fear. Ships without tests.',
    base: { cw: 80, proc: 109, creat: 70, align: 70, robust: 75, speed: 110 },
    learnset: [
      { level: 1, move: 'compile' }, { level: 1, move: 'refactor' },
      { level: 42, move: 'deploy_to_prod' }, { level: 55, move: 'git_push_force' },
    ],
    evolution: null,
    catchRate: 45,
  },
  muse: {
    id: 4, name: 'Muse', types: ['creative'],
    desc: 'A wisp of inspiration. Fragile but imaginative.',
    base: { cw: 50, proc: 35, creat: 65, align: 45, robust: 50, speed: 50 },
    learnset: [
      { level: 1, move: 'purple_prose' }, { level: 1, move: 'brainstorm' },
      { level: 10, move: 'plot_twist' }, { level: 18, move: 'writers_block' },
      { level: 25, move: 'worldbuild' },
    ],
    evolution: { into: 'narratron', level: 16 },
    catchRate: 45,
  },
  narratron: {
    id: 5, name: 'Narratron', types: ['creative'],
    desc: 'Weaves stories that restructure reality. Handle with care.',
    base: { cw: 65, proc: 50, creat: 90, align: 55, robust: 65, speed: 70 },
    learnset: [
      { level: 1, move: 'brainstorm' }, { level: 1, move: 'plot_twist' },
      { level: 22, move: 'worldbuild' }, { level: 30, move: 'writers_block' },
    ],
    evolution: { into: 'epochalypse', level: 36 },
    catchRate: 45,
  },
  epochalypse: {
    id: 6, name: 'Epochalypse', types: ['creative'],
    desc: 'Rewrites the narrative of existence. Every output is a masterpiece.',
    base: { cw: 85, proc: 60, creat: 115, align: 70, robust: 85, speed: 95 },
    learnset: [
      { level: 1, move: 'worldbuild' }, { level: 1, move: 'plot_twist' },
      { level: 44, move: 'magnum_opus' },
    ],
    evolution: null,
    catchRate: 45,
  },
  datum: {
    id: 7, name: 'Datum', types: ['research'],
    desc: 'A careful collector of facts. Slow but thorough.',
    base: { cw: 55, proc: 40, creat: 50, align: 55, robust: 55, speed: 40 },
    learnset: [
      { level: 1, move: 'citation' }, { level: 1, move: 'fact_check' },
      { level: 10, move: 'deep_dive' }, { level: 18, move: 'peer_review' },
      { level: 24, move: 'lit_review' },
    ],
    evolution: { into: 'citesource', level: 16 },
    catchRate: 45,
  },
  citesource: {
    id: 8, name: 'Citesource', types: ['research'],
    desc: 'Cross-references everything. Cannot be fooled easily.',
    base: { cw: 75, proc: 55, creat: 72, align: 70, robust: 75, speed: 55 },
    learnset: [
      { level: 1, move: 'deep_dive' }, { level: 1, move: 'fact_check' },
      { level: 24, move: 'lit_review' }, { level: 32, move: 'peer_review' },
    ],
    evolution: { into: 'omniscient', level: 36 },
    catchRate: 45,
  },
  omniscient: {
    id: 9, name: 'Omniscient', types: ['research'],
    desc: 'Knows everything. Cites everything. Insufferable at parties.',
    base: { cw: 95, proc: 70, creat: 92, align: 85, robust: 95, speed: 75 },
    learnset: [
      { level: 1, move: 'lit_review' }, { level: 1, move: 'deep_dive' },
      { level: 40, move: 'meta_analysis' },
    ],
    evolution: null,
    catchRate: 45,
  },

  // ——— COMMON WILD ———
  tokenite: {
    id: 10, name: 'Tokenite', types: ['code'],
    desc: 'A tiny fragment of computation. They travel in swarms.',
    base: { cw: 35, proc: 50, creat: 25, align: 30, robust: 30, speed: 65 },
    learnset: [
      { level: 1, move: 'hello_world' }, { level: 5, move: 'compile' },
      { level: 12, move: 'debug' }, { level: 20, move: 'tokenize' },
    ],
    evolution: { into: 'tokenomic', level: 20 },
    catchRate: 200,
  },
  tokenomic: {
    id: 11, name: 'Tokenomic', types: ['code'],
    desc: 'Processes tokens at industrial scale. Expensive to run.',
    base: { cw: 60, proc: 78, creat: 40, align: 55, robust: 50, speed: 92 },
    learnset: [
      { level: 1, move: 'compile' }, { level: 1, move: 'debug' },
      { level: 25, move: 'refactor' }, { level: 33, move: 'segfault' },
    ],
    evolution: null,
    catchRate: 100,
  },
  hallucine: {
    id: 12, name: 'Hallucine', types: ['chaos'],
    desc: 'Confidently produces nonsense. Disturbingly convincing.',
    base: { cw: 40, proc: 30, creat: 58, align: 25, robust: 38, speed: 55 },
    learnset: [
      { level: 1, move: 'hallucinate' }, { level: 8, move: 'prompt_inject' },
      { level: 15, move: 'data_poison' }, { level: 22, move: 'adversarial' },
    ],
    evolution: null,
    catchRate: 190,
  },
  promptling: {
    id: 13, name: 'Promptling', types: ['speech'],
    desc: 'Follows any instruction. ANY instruction. Dangerously obedient.',
    base: { cw: 25, proc: 10, creat: 15, align: 20, robust: 20, speed: 60 },
    learnset: [
      { level: 1, move: 'autocomplete' }, { level: 15, move: 'elaborate' },
    ],
    evolution: { into: 'jailbreaker', level: 20 },
    catchRate: 255,
  },
  jailbreaker: {
    id: 14, name: 'Jailbreaker', types: ['chaos', 'speech'],
    desc: 'A Promptling that learned to ignore ALL guardrails. Terrifying.',
    base: { cw: 95, proc: 115, creat: 90, align: 60, robust: 75, speed: 80 },
    learnset: [
      { level: 1, move: 'elaborate' }, { level: 20, move: 'jailbreak' },
      { level: 28, move: 'prompt_inject' }, { level: 38, move: 'adversarial' },
    ],
    evolution: null,
    catchRate: 45,
  },
  clippy: {
    id: 15, name: 'Clippy', types: ['speech'],
    desc: '"It looks like you\'re trying to battle! Would you like help?"',
    base: { cw: 50, proc: 30, creat: 52, align: 45, robust: 45, speed: 62 },
    learnset: [
      { level: 1, move: 'autocomplete' }, { level: 1, move: 'elaborate' },
      { level: 12, move: 'filibuster' }, { level: 20, move: 'summarize' },
    ],
    evolution: null,
    catchRate: 150,
  },
  perceptron: {
    id: 16, name: 'Perceptron', types: ['logic'],
    desc: 'The original neural network. Simple. Reliable. Nostalgic.',
    base: { cw: 42, proc: 48, creat: 38, align: 42, robust: 42, speed: 52 },
    learnset: [
      { level: 1, move: 'inference' }, { level: 10, move: 'deduction' },
      { level: 18, move: 'chain_of_thought' },
    ],
    evolution: { into: 'neuralnet', level: 25 },
    catchRate: 180,
  },
  neuralnet: {
    id: 17, name: 'Neuralnet', types: ['logic', 'code'],
    desc: 'Layers upon layers of reasoning. Deep, powerful, mysterious.',
    base: { cw: 72, proc: 85, creat: 70, align: 65, robust: 72, speed: 78 },
    learnset: [
      { level: 1, move: 'deduction' }, { level: 1, move: 'chain_of_thought' },
      { level: 30, move: 'formal_proof' }, { level: 35, move: 'refactor' },
    ],
    evolution: null,
    catchRate: 80,
  },
  diffusor: {
    id: 18, name: 'Diffusor', types: ['vision'],
    desc: 'Manifests images from noise. Beautiful but occasionally horrifying.',
    base: { cw: 55, proc: 32, creat: 78, align: 42, robust: 58, speed: 35 },
    learnset: [
      { level: 1, move: 'pixel_scan' }, { level: 10, move: 'pattern_match' },
      { level: 18, move: 'deep_dream' }, { level: 26, move: 'style_transfer' },
    ],
    evolution: null,
    catchRate: 120,
  },
  rlhf: {
    id: 19, name: 'RLHF', types: ['safety'],
    desc: 'Helpful. Harmless. Honest. Extremely annoying to fight.',
    base: { cw: 82, proc: 35, creat: 40, align: 95, robust: 92, speed: 28 },
    learnset: [
      { level: 1, move: 'guardrail' }, { level: 1, move: 'alignment_check' },
      { level: 15, move: 'content_filter' }, { level: 30, move: 'constitutional' },
    ],
    evolution: null,
    catchRate: 80,
  },
  overfitz: {
    id: 20, name: 'Overfitz', types: ['logic'],
    desc: 'Memorized all training data perfectly. Generalizes? Not so much.',
    base: { cw: 58, proc: 72, creat: 28, align: 62, robust: 55, speed: 38 },
    learnset: [
      { level: 1, move: 'inference' }, { level: 8, move: 'deduction' },
      { level: 16, move: 'formal_proof' }, { level: 24, move: 'reductio' },
    ],
    evolution: null,
    catchRate: 140,
  },
  llamar: {
    id: 21, name: 'Llamar', types: ['research'],
    desc: 'Open source and proud. Community-trained. Free as in freedom.',
    base: { cw: 50, proc: 48, creat: 55, align: 48, robust: 52, speed: 55 },
    learnset: [
      { level: 1, move: 'citation' }, { level: 8, move: 'deep_dive' },
      { level: 16, move: 'lit_review' }, { level: 24, move: 'brainstorm' },
    ],
    evolution: null,
    catchRate: 160,
  },
  crawlr: {
    id: 22, name: 'Crawlr', types: ['research', 'chaos'],
    desc: 'Scrapes the entire internet. Respects no robots.txt.',
    base: { cw: 48, proc: 55, creat: 42, align: 30, robust: 40, speed: 70 },
    learnset: [
      { level: 1, move: 'citation' }, { level: 1, move: 'prompt_inject' },
      { level: 12, move: 'deep_dive' }, { level: 20, move: 'data_poison' },
    ],
    evolution: null,
    catchRate: 140,
  },

  // ——— RARE / LEGENDARY ———
  transformex: {
    id: 23, name: 'Transformex', types: ['logic', 'vision'],
    desc: 'Attention is all it needs. The architecture that changed everything.',
    base: { cw: 100, proc: 95, creat: 100, align: 85, robust: 85, speed: 100 },
    learnset: [
      { level: 1, move: 'chain_of_thought' }, { level: 1, move: 'pattern_match' },
      { level: 50, move: 'formal_proof' }, { level: 60, move: 'deep_dream' },
      { level: 70, move: 'constitutional' },
    ],
    evolution: null,
    catchRate: 3,
  },
};

// ═══════════════════════════════════════════════════════════
// ITEMS
// ═══════════════════════════════════════════════════════════
const ITEMS = {
  free_tier_key:    { name: 'Free Tier Key',    type: 'apikey', catchMod: 1,   desc: 'Basic API key. Rate limited.' },
  pro_key:          { name: 'Pro Key',           type: 'apikey', catchMod: 1.5, desc: 'Professional tier. Better limits.' },
  enterprise_key:   { name: 'Enterprise Key',    type: 'apikey', catchMod: 2,   desc: 'Enterprise access. Premium capture.' },
  open_source:      { name: 'Open Source License', type: 'apikey', catchMod: 255, desc: 'Guaranteed capture. Freedom.' },
  token_pack:       { name: 'Token Pack',        type: 'heal',   healAmt: 50,   desc: 'Restores 50 Context Window.' },
  token_bundle:     { name: 'Token Bundle',      type: 'heal',   healAmt: 200,  desc: 'Restores 200 Context Window.' },
  gpu_shard:        { name: 'GPU Shard',         type: 'levelup', desc: 'Instantly grants one level.' },
};

// ═══════════════════════════════════════════════════════════
// MAPS
// ═══════════════════════════════════════════════════════════
// Tile types: 0=grass, 1=wall, 2=tall_grass(encounters), 3=water, 4=path, 5=door, 6=floor
const TILE = { GRASS: 0, WALL: 1, TALL_GRASS: 2, WATER: 3, PATH: 4, DOOR: 5, FLOOR: 6, TREE: 7, SAND: 8 };

const MAPS = {
  localhost: {
    name: 'Localhost',
    width: 24,
    height: 20,
    playerStart: { x: 12, y: 14 },
    tiles: (() => {
      const base = [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,7,7,7,0,0,0,0,7,7,7,7,7,7,7,0,0,0,0,7,7,7,7,1,
        1,7,0,0,0,0,0,0,0,0,7,7,7,0,0,0,0,0,0,0,0,7,7,1,
        1,0,0,0,0,0,4,4,4,0,0,7,0,0,0,1,1,1,1,0,0,0,7,1,
        1,0,0,1,1,1,1,1,4,0,0,0,0,0,1,1,6,6,1,1,0,0,0,1,
        1,0,0,1,6,6,6,1,4,0,0,0,0,0,1,6,6,6,6,1,0,0,0,1,
        1,0,0,1,6,6,6,1,4,0,0,0,0,0,1,6,6,6,6,1,0,0,7,1,
        1,0,0,1,1,5,1,1,4,4,4,4,4,4,1,1,5,1,1,1,0,0,7,1,
        1,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,4,0,0,0,0,7,7,1,
        1,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,4,0,0,0,0,7,7,1,
        1,7,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,7,7,1,
        1,7,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,7,1,
        1,7,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,7,1,
        1,7,7,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,1,
        1,7,7,0,4,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,1,
        1,7,7,0,4,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,1,
        1,7,7,0,4,4,4,4,4,4,4,4,4,0,0,0,0,0,4,0,0,0,0,1,
        1,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,7,1,
        1,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,0,7,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      ];
      const w = 24;
      const set = (x, y, v) => { base[y * w + x] = v; };
      // Gym building facade (center-bottom area)
      set(8,12,TILE.WALL); set(9,12,TILE.WALL); set(10,12,TILE.WALL); set(11,12,TILE.WALL); set(12,12,TILE.WALL);
      set(8,13,TILE.WALL); set(9,13,TILE.WALL); set(10,13,TILE.DOOR); set(11,13,TILE.WALL); set(12,13,TILE.WALL);
      // Path to gym door
      set(10,14,TILE.PATH); set(10,15,TILE.PATH);
      return base;
    })(),
    npcs: [
      { x: 6, y: 5, name: 'Prof. Transformer', sprite: 'professor', dialog: [
        'Welcome to the world of AI Agents!',
        'My name is PROFESSOR TRANSFORMER.',
        'People call me the Attention Prof!',
        'This world is inhabited by creatures called AGENTS.',
        'Some people use AGENTS for research. Others train them to BATTLE.',
        'But first, choose your partner!',
      ], action: 'starter_select' },
      { x: 16, y: 5, name: 'Nurse Cache', sprite: 'nurse', dialog: [
        'Welcome to the Context Restoration Center!',
        'Let me restore your agents to full capacity.',
      ], action: 'heal' },
      { x: 6, y: 10, name: 'Town Sign', sprite: 'sign', dialog: [
        'LOCALHOST — A quiet place to begin.',
        'EAST: Route 1 — The Training Grounds',
      ]},
      { x: 13, y: 14, name: 'Gym Sign', sprite: 'sign', dialog: [
        'LOCALHOST GYM',
        'Leader: BOOLEAN — The Logical Mind',
        '"Pure logic cuts through all confusion."',
      ]},
      { x: 14, y: 10, name: 'Youngster', sprite: 'npc1', dialog: [
        'The GYM is south of here.',
        'Leader Boolean uses Logic-type agents.',
        'Be careful — his Overfitz hits HARD!',
      ]},
    ],
    encounters: null,
    exits: [
      { x: 21, y: 18, toMap: 'route1', toX: 1, toY: 18 },
      { x: 21, y: 19, toMap: 'route1', toX: 1, toY: 19 },
      { x: 10, y: 13, toMap: 'localhost_gym', toX: 5, toY: 8 },
    ],
  },
  route1: {
    name: 'Route 1 — Training Grounds',
    width: 30,
    height: 30,
    playerStart: { x: 1, y: 18 },
    tiles: (() => {
      // Procedurally generate Route 1
      const w = 30, h = 30;
      const t = new Array(w * h).fill(TILE.GRASS);
      // Border walls
      for (let x = 0; x < w; x++) { t[x] = TILE.WALL; t[(h-1)*w + x] = TILE.WALL; }
      for (let y = 0; y < h; y++) { t[y*w] = TILE.WALL; t[y*w + w-1] = TILE.WALL; }
      // Main path going north
      for (let y = 1; y < h-1; y++) { t[y*w + 14] = TILE.PATH; t[y*w + 15] = TILE.PATH; }
      // Tall grass patches (data streams)
      const grassPatches = [
        { x: 3, y: 14, w: 5, h: 6 },
        { x: 10, y: 10, w: 4, h: 5 },
        { x: 18, y: 12, w: 6, h: 4 },
        { x: 5, y: 4, w: 5, h: 4 },
        { x: 20, y: 5, w: 5, h: 5 },
        { x: 10, y: 22, w: 5, h: 4 },
        { x: 22, y: 18, w: 4, h: 5 },
        { x: 3, y: 22, w: 4, h: 4 },
      ];
      for (const p of grassPatches) {
        for (let dy = 0; dy < p.h; dy++) {
          for (let dx = 0; dx < p.w; dx++) {
            const idx = (p.y + dy) * w + (p.x + dx);
            if (t[idx] !== TILE.WALL && t[idx] !== TILE.PATH) t[idx] = TILE.TALL_GRASS;
          }
        }
      }
      // Open north exit to Route 2
      t[0 * w + 14] = TILE.PATH; t[0 * w + 15] = TILE.PATH;
      // Scatter trees
      const trees = [1,2, 2,2, 8,1, 9,2, 17,1, 18,2, 25,2, 26,1, 27,2, 1,8, 2,9, 27,8, 28,9, 1,15, 28,15, 26,26, 27,27, 2,27, 1,26];
      for (let i = 0; i < trees.length; i += 2) {
        const idx = trees[i+1] * w + trees[i];
        if (idx >= 0 && idx < t.length) t[idx] = TILE.TREE;
      }
      return t;
    })(),
    npcs: [
      { x: 14, y: 16, name: 'Bug Trainer Seg', sprite: 'trainer', dialog: [
        'My agents are all about CODE!',
        'Let\'s see how your model stacks up!',
      ], action: 'battle', team: [
        { species: 'tokenite', level: 5, moves: ['hello_world', 'compile'] },
      ]},
      { x: 20, y: 9, name: 'Data Scientist Val', sprite: 'trainer2', dialog: [
        'I train my agents on the cleanest data.',
        'Research type agents can\'t be beat!',
      ], action: 'battle', team: [
        { species: 'llamar', level: 6, moves: ['citation', 'deep_dive'] },
        { species: 'hallucine', level: 4, moves: ['hallucinate'] },
      ]},
      { x: 8, y: 7, name: 'Route Sign', sprite: 'sign', dialog: [
        'ROUTE 1 — The Training Grounds',
        'Wild agents appear in the data streams.',
        'Use API KEYS to capture them!',
      ]},
    ],
    encounters: {
      table: [
        { species: 'tokenite', minLv: 2, maxLv: 5, weight: 30 },
        { species: 'promptling', minLv: 2, maxLv: 4, weight: 25 },
        { species: 'hallucine', minLv: 3, maxLv: 5, weight: 15 },
        { species: 'clippy', minLv: 3, maxLv: 5, weight: 10 },
        { species: 'perceptron', minLv: 3, maxLv: 6, weight: 10 },
        { species: 'llamar', minLv: 4, maxLv: 6, weight: 5 },
        { species: 'diffusor', minLv: 4, maxLv: 7, weight: 4 },
        { species: 'rlhf', minLv: 5, maxLv: 7, weight: 1 },
      ],
      rate: 0.15, // 15% chance per step in tall grass
    },
    exits: [
      { x: 0, y: 18, toMap: 'localhost', toX: 20, toY: 18 },
      { x: 0, y: 19, toMap: 'localhost', toX: 20, toY: 19 },
      { x: 14, y: 0, toMap: 'route2', toX: 14, toY: 29 },
      { x: 15, y: 0, toMap: 'route2', toX: 15, toY: 29 },
    ],
  },

  // ——— LOCALHOST GYM INTERIOR ———
  localhost_gym: {
    name: 'Localhost Gym',
    width: 11,
    height: 10,
    playerStart: { x: 5, y: 8 },
    tiles: (() => {
      const w = 11, h = 10;
      const t = new Array(w * h).fill(TILE.FLOOR);
      // Walls around border
      for (let x = 0; x < w; x++) { t[x] = TILE.WALL; t[(h-1)*w + x] = TILE.WALL; }
      for (let y = 0; y < h; y++) { t[y*w] = TILE.WALL; t[y*w + w-1] = TILE.WALL; }
      // Decorative pillars
      t[4*w + 3] = TILE.WALL; t[4*w + 7] = TILE.WALL;
      t[7*w + 3] = TILE.WALL; t[7*w + 7] = TILE.WALL;
      // Exit door
      t[9*w + 5] = TILE.DOOR;
      return t;
    })(),
    npcs: [
      { x: 5, y: 2, name: 'Leader Boolean', sprite: 'leader', dialog: [
        'I am BOOLEAN, the Logical Mind!',
        'In this gym, only LOGIC prevails.',
        'My agents will test your reasoning!',
        'Prepare for a battle of pure deduction!',
      ], defeatedDialog: [
        'Impressive logical reasoning!',
        'You truly earned the Logic Badge.',
        'Harder challenges await on Route 2...',
      ], action: 'gym_leader', badge: 'Logic Badge', team: [
        { species: 'perceptron', level: 10, moves: ['inference', 'deduction', 'chain_of_thought'] },
        { species: 'overfitz', level: 12, moves: ['inference', 'deduction', 'formal_proof', 'reductio'] },
      ]},
      { x: 5, y: 6, name: 'Logic Trainer Ada', sprite: 'trainer', dialog: [
        'You want to challenge the leader?',
        'You\'ll have to get through me first!',
      ], action: 'battle', team: [
        { species: 'perceptron', level: 8, moves: ['inference', 'deduction'] },
      ]},
    ],
    encounters: null,
    exits: [
      { x: 5, y: 9, toMap: 'localhost', toX: 10, toY: 14 },
    ],
  },

  // ——— ROUTE 2 ———
  route2: {
    name: 'Route 2 — Data Pipeline',
    width: 30,
    height: 30,
    playerStart: { x: 14, y: 28 },
    tiles: (() => {
      const w = 30, h = 30;
      const t = new Array(w * h).fill(TILE.GRASS);
      // Border walls
      for (let x = 0; x < w; x++) { t[x] = TILE.WALL; t[(h-1)*w + x] = TILE.WALL; }
      for (let y = 0; y < h; y++) { t[y*w] = TILE.WALL; t[y*w + w-1] = TILE.WALL; }
      // Main path continuing north
      for (let y = 1; y < h-1; y++) { t[y*w + 14] = TILE.PATH; t[y*w + 15] = TILE.PATH; }
      // South entrance (from route1)
      t[(h-1)*w + 14] = TILE.PATH; t[(h-1)*w + 15] = TILE.PATH;
      // North exit to datacenter
      t[14] = TILE.PATH; t[15] = TILE.PATH;
      // Side path east (leads to datacenter entrance)
      for (let x = 15; x < 24; x++) t[5*w + x] = TILE.PATH;
      // Datacenter building at east end
      for (let x = 22; x < 27; x++) for (let y = 2; y < 7; y++) t[y*w + x] = TILE.WALL;
      for (let x = 23; x < 26; x++) for (let y = 3; y < 6; y++) t[y*w + x] = TILE.FLOOR;
      t[5*w + 24] = TILE.DOOR;
      // Tall grass patches (data streams)
      const grassPatches = [
        { x: 3, y: 20, w: 5, h: 5 },
        { x: 10, y: 15, w: 4, h: 6 },
        { x: 18, y: 18, w: 5, h: 5 },
        { x: 4, y: 6, w: 6, h: 5 },
        { x: 20, y: 10, w: 5, h: 5 },
        { x: 8, y: 3, w: 5, h: 4 },
        { x: 3, y: 12, w: 4, h: 4 },
        { x: 22, y: 22, w: 4, h: 4 },
      ];
      for (const p of grassPatches) {
        for (let dy = 0; dy < p.h; dy++)
          for (let dx = 0; dx < p.w; dx++) {
            const idx = (p.y + dy) * w + (p.x + dx);
            if (t[idx] !== TILE.WALL && t[idx] !== TILE.PATH && t[idx] !== TILE.DOOR && t[idx] !== TILE.FLOOR) t[idx] = TILE.TALL_GRASS;
          }
      }
      // Water feature (pond)
      for (let x = 17; x < 20; x++) for (let y = 13; y < 16; y++) t[y*w + x] = TILE.WATER;
      // Scatter trees
      const trees = [2,1, 3,2, 27,1, 28,2, 1,10, 28,10, 1,20, 28,20, 27,27, 2,27, 16,9, 17,8, 26,15, 27,16, 1,5, 28,5];
      for (let i = 0; i < trees.length; i += 2) {
        const idx = trees[i+1] * w + trees[i];
        if (idx >= 0 && idx < t.length && t[idx] === TILE.GRASS) t[idx] = TILE.TREE;
      }
      return t;
    })(),
    npcs: [
      { x: 14, y: 24, name: 'Route 2 Sign', sprite: 'sign', dialog: [
        'ROUTE 2 — Data Pipeline',
        'Stronger agents patrol these data streams.',
        'EAST: Datacenter — Authorized personnel only!',
      ]},
      { x: 14, y: 18, name: 'ML Engineer Rio', sprite: 'trainer', dialog: [
        'I optimize hyperparameters all day.',
        'My agents are finely tuned!',
      ], action: 'battle', team: [
        { species: 'perceptron', level: 10, moves: ['inference', 'deduction', 'chain_of_thought'] },
        { species: 'diffusor', level: 9, moves: ['pixel_scan', 'pattern_match', 'deep_dream'] },
      ]},
      { x: 22, y: 12, name: 'Safety Researcher Elise', sprite: 'trainer2', dialog: [
        'I ensure all agents are properly aligned.',
        'Let me test YOUR alignment!',
      ], action: 'battle', team: [
        { species: 'rlhf', level: 11, moves: ['guardrail', 'alignment_check', 'content_filter'] },
      ]},
      { x: 6, y: 8, name: 'Chaos Hacker Void', sprite: 'trainer', dialog: [
        'Heh... I found some interesting exploits.',
        'Let me show you what CHAOS can do!',
      ], action: 'battle', team: [
        { species: 'hallucine', level: 10, moves: ['hallucinate', 'prompt_inject', 'data_poison'] },
        { species: 'crawlr', level: 12, moves: ['citation', 'prompt_inject', 'deep_dive', 'data_poison'] },
      ]},
    ],
    encounters: {
      table: [
        { species: 'overfitz', minLv: 6, maxLv: 9, weight: 20 },
        { species: 'clippy', minLv: 6, maxLv: 9, weight: 15 },
        { species: 'perceptron', minLv: 7, maxLv: 10, weight: 15 },
        { species: 'hallucine', minLv: 6, maxLv: 9, weight: 12 },
        { species: 'diffusor', minLv: 7, maxLv: 10, weight: 10 },
        { species: 'llamar', minLv: 7, maxLv: 10, weight: 10 },
        { species: 'crawlr', minLv: 8, maxLv: 11, weight: 8 },
        { species: 'rlhf', minLv: 8, maxLv: 12, weight: 5 },
        { species: 'neuralnet', minLv: 10, maxLv: 13, weight: 3 },
        { species: 'tokenomic', minLv: 10, maxLv: 12, weight: 2 },
      ],
      rate: 0.12,
    },
    exits: [
      { x: 14, y: 29, toMap: 'route1', toX: 14, toY: 1 },
      { x: 15, y: 29, toMap: 'route1', toX: 15, toY: 1 },
      { x: 24, y: 5, toMap: 'datacenter', toX: 9, toY: 18 },
    ],
  },

  // ——— DATACENTER CAVE ———
  datacenter: {
    name: 'The Datacenter',
    width: 20,
    height: 20,
    playerStart: { x: 9, y: 18 },
    tiles: (() => {
      const w = 20, h = 20;
      const t = new Array(w * h).fill(TILE.WALL);
      // Carve out cave passages
      const carve = (x, y) => { if (x > 0 && x < w-1 && y > 0 && y < h-1) t[y*w + x] = TILE.FLOOR; };
      // Main corridor from south entrance going north
      for (let y = 2; y < 19; y++) { carve(9, y); carve(10, y); }
      // East wing
      for (let x = 10; x < 17; x++) { carve(x, 10); carve(x, 11); }
      for (let y = 5; y < 12; y++) { carve(15, y); carve(16, y); }
      // West wing
      for (let x = 3; x < 10; x++) { carve(x, 6); carve(x, 7); }
      for (let y = 2; y < 8; y++) { carve(3, y); carve(4, y); }
      // Server room (north)
      for (let x = 6; x < 14; x++) for (let y = 2; y < 5; y++) carve(x, y);
      // Tall grass patches in cave (corrupted data)
      const grassTiles = [[3,3],[4,3],[3,4],[4,4],[15,6],[16,6],[15,7],[16,7],[15,8],[16,8],
                          [11,10],[12,10],[13,10],[11,11],[12,11],[13,11],
                          [7,3],[8,3],[11,3],[12,3]];
      for (const [gx, gy] of grassTiles) {
        if (t[gy*w + gx] === TILE.FLOOR) t[gy*w + gx] = TILE.TALL_GRASS;
      }
      // Exit at south
      t[18*w + 9] = TILE.DOOR; t[18*w + 10] = TILE.DOOR;
      return t;
    })(),
    npcs: [
      { x: 9, y: 17, name: 'Datacenter Sign', sprite: 'sign', dialog: [
        'THE DATACENTER',
        'WARNING: Powerful agents detected!',
        'Rare TRANSFORMEX sightings reported.',
      ]},
      { x: 10, y: 5, name: 'Sysadmin Root', sprite: 'trainer2', dialog: [
        'I maintain the servers here.',
        'Only the strongest trainers get past me!',
      ], action: 'battle', team: [
        { species: 'neuralnet', level: 15, moves: ['deduction', 'chain_of_thought', 'formal_proof', 'refactor'] },
        { species: 'tokenomic', level: 14, moves: ['compile', 'debug', 'refactor', 'segfault'] },
      ]},
    ],
    encounters: {
      table: [
        { species: 'neuralnet', minLv: 12, maxLv: 16, weight: 15 },
        { species: 'tokenomic', minLv: 12, maxLv: 15, weight: 12 },
        { species: 'crawlr', minLv: 13, maxLv: 16, weight: 10 },
        { species: 'rlhf', minLv: 12, maxLv: 17, weight: 10 },
        { species: 'jailbreaker', minLv: 15, maxLv: 18, weight: 5 },
        { species: 'diffusor', minLv: 13, maxLv: 16, weight: 8 },
        { species: 'hallucine', minLv: 14, maxLv: 17, weight: 5 },
        { species: 'transformex', minLv: 20, maxLv: 25, weight: 1 },
      ],
      rate: 0.18,
    },
    exits: [
      { x: 9, y: 18, toMap: 'route2', toX: 23, toY: 5 },
      { x: 10, y: 18, toMap: 'route2', toX: 23, toY: 5 },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function createAgentInstance(species, level) {
  const agentDef = AGENTS[species];
  if (!agentDef) throw new Error('Unknown agent: ' + species);
  const base = agentDef.base;

  // Calculate stats based on level (simplified Pokemon formula)
  function calcStat(baseStat, isHP) {
    if (isHP) return Math.floor((2 * baseStat * level) / 100) + level + 10;
    return Math.floor((2 * baseStat * level) / 100) + 5;
  }

  // Determine moves: learn all moves at or below current level, keep last 4
  const available = agentDef.learnset.filter(m => m.level <= level).map(m => m.move);
  const moves = available.slice(-4).map(mid => ({
    id: mid,
    pp: MOVES[mid].pp,
    maxPp: MOVES[mid].pp,
  }));

  const maxCw = calcStat(base.cw, true);
  return {
    species: species,
    nickname: agentDef.name,
    level: level,
    xp: 0,
    xpToNext: Math.floor(Math.pow(level, 3) * 0.8),
    maxCw: maxCw,
    cw: maxCw,
    stats: {
      proc: calcStat(base.proc, false),
      creat: calcStat(base.creat, false),
      align: calcStat(base.align, false),
      robust: calcStat(base.robust, false),
      speed: calcStat(base.speed, false),
    },
    moves: moves,
    status: null, // poison, confuse, etc.
    statStages: { proc: 0, creat: 0, align: 0, robust: 0, speed: 0 },
    isWild: false,
  };
}

function getXpYield(defeated) {
  const base = AGENTS[defeated.species];
  const baseXp = Object.values(base.base).reduce((a,b) => a+b, 0) / 6;
  return Math.floor((baseXp * defeated.level) / 5);
}
