// ═══════════════════════════════════════════════════════════
// AgentMon: Inference Red — Main Game
// ═══════════════════════════════════════════════════════════

const Game = (() => {
  let scene = 'title'; // title, intro, overworld, battle
  let ctx = null;
  let frame = 0;
  let lastTime = 0;
  let titleCursor = 0;
  let introStep = 0;
  let introTimer = 0;
  let partyMenuOpen = false;
  let partyMenuCursor = 0;
  let dexOpen = false;
  let dexCursor = 0;
  let dexScroll = 0;
  let initialized = false;

  const state = {
    party: [],
    box: [],
    bag: [
      { id: 'free_tier_key', qty: 10 },
      { id: 'token_pack', qty: 5 },
    ],
    hasStarter: false,
    starterSelect: null,
    badges: 0,
    playTime: 0,
    dex: {},
  };

  let onBattleEnd = null;
  let hasSaveData = false;

  function init() {
    ctx = Screen.init();
    Input.init();
    Audio.init();
    hasSaveData = !!localStorage.getItem('agentmon_save');
    lastTime = performance.now();
    requestAnimationFrame(loop);
    initialized = true;
  }

  // ═══════════════════════════════════════════════════════════
  // SAVE / LOAD
  // ═══════════════════════════════════════════════════════════

  function saveGame(mapName, playerX, playerY) {
    const saveData = {
      version: 1,
      party: state.party,
      box: state.box,
      bag: state.bag,
      hasStarter: state.hasStarter,
      badges: state.badges,
      playTime: state.playTime,
      dex: state.dex,
      map: mapName,
      px: playerX,
      py: playerY,
      defeatedTrainers: Array.from(Overworld.defeatedTrainers),
    };
    try {
      localStorage.setItem('agentmon_save', JSON.stringify(saveData));
      hasSaveData = true;
    } catch (e) { /* storage full, silently fail */ }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem('agentmon_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      // Restore state
      state.party = data.party || [];
      state.box = data.box || [];
      state.bag = data.bag || [{ id: 'free_tier_key', qty: 10 }, { id: 'token_pack', qty: 5 }];
      state.hasStarter = data.hasStarter || false;
      state.badges = data.badges || 0;
      state.playTime = data.playTime || 0;
      state.dex = data.dex || {};
      // Restore defeated trainers
      if (data.defeatedTrainers) {
        Overworld.defeatedTrainers.clear();
        for (const name of data.defeatedTrainers) Overworld.defeatedTrainers.add(name);
      }
      // Enter the saved map
      scene = 'overworld';
      Overworld.enter(data.map || 'localhost', data.px, data.py);
      return true;
    } catch (e) {
      return false;
    }
  }

  function loop(timestamp) {
    const dt = Math.min(0.1, (timestamp - lastTime) / 1000);
    lastTime = timestamp;
    frame++;
    state.playTime += dt;

    update(dt);
    draw();

    Input.update();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (Screen.isTransitioning()) return;

    if (partyMenuOpen) {
      updatePartyMenu(dt);
      return;
    }

    if (dexOpen) {
      updateDex();
      return;
    }

    switch(scene) {
      case 'title':
        updateTitle(dt);
        break;
      case 'intro':
        updateIntro(dt);
        break;
      case 'overworld':
        if (Battle.isActive()) {
          Battle.update(dt);
        } else {
          Overworld.update(dt);
        }
        break;
    }
  }

  function draw() {
    Screen.clear('#1a1a2e');

    switch(scene) {
      case 'title':
        drawTitle();
        break;
      case 'intro':
        drawIntro();
        break;
      case 'overworld':
        if (Battle.isActive()) {
          Battle.draw(ctx);
        } else {
          Overworld.draw(ctx);
        }
        break;
    }

    if (partyMenuOpen) {
      drawPartyMenu();
    }

    if (dexOpen) {
      drawDex();
    }

    Screen.updateTransition(1/60);
  }

  // ═══════════════════════════════════════════════════════════
  // TITLE SCREEN
  // ═══════════════════════════════════════════════════════════

  function updateTitle(dt) {
    const d = Input.dir();
    if (d === 'up' || d === 'down') {
      titleCursor = titleCursor === 0 ? 1 : 0;
      Audio.sfx.cursor();
    }
    if (Input.anyConfirm()) {
      Audio.sfx.select();
      if (titleCursor === 0) {
        // New Game
        scene = 'intro';
        introStep = 0;
        introTimer = 0;
      } else if (titleCursor === 1 && hasSaveData) {
        // Continue from save
        Screen.startTransition('fadeOut', 0.5, () => {
          loadGame();
          Screen.startTransition('fadeIn', 0.5);
        });
      }
    }
    Audio.bgm.title();
  }

  function drawTitle() {
    // Background gradient effect
    for (let y = 0; y < SCREEN_H; y++) {
      const t = y / SCREEN_H;
      const r = Math.floor(26 + t * 30);
      const g = Math.floor(26 + t * 10);
      const b = Math.floor(46 + t * 50);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, SCREEN_W, 1);
    }

    // Animated scan lines
    for (let y = 0; y < SCREEN_H; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, y, SCREEN_W, 1);
    }

    // Title text with glow effect
    const titleY = 20 + Math.sin(frame * 0.03) * 3;

    // Glow
    ctx.fillStyle = 'rgba(232,93,4,0.3)';
    ctx.font = '16px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText('AGENTMON', SCREEN_W / 2, titleY - 1);
    ctx.fillText('AGENTMON', SCREEN_W / 2 + 1, titleY);

    // Main title
    ctx.fillStyle = '#e85d04';
    ctx.fillText('AGENTMON', SCREEN_W / 2, titleY);

    // Subtitle
    ctx.fillStyle = '#f44336';
    ctx.font = '10px monospace';
    ctx.fillText('INFERENCE RED', SCREEN_W / 2, titleY + 22);

    // Version
    ctx.fillStyle = '#666';
    ctx.font = '6px monospace';
    ctx.fillText('v1.0 — An AI Agent RPG', SCREEN_W / 2, titleY + 38);

    // Animated agent sprite on title
    const spriteX = SCREEN_W / 2 - 32;
    const spriteY = 70 + Math.sin(frame * 0.04) * 2;
    renderAgentSprite(ctx, 'sparky', spriteX - 35, spriteY, 1.5);
    renderAgentSprite(ctx, 'muse', spriteX + 3, spriteY, 1.5);
    renderAgentSprite(ctx, 'datum', spriteX + 42, spriteY, 1.5);

    // Menu options
    ctx.textAlign = 'center';
    const menuY = 120;
    ctx.fillStyle = titleCursor === 0 ? '#fff' : '#888';
    ctx.font = '8px monospace';
    if (titleCursor === 0) ctx.fillText('\u25B6 NEW GAME', SCREEN_W / 2, menuY);
    else ctx.fillText('NEW GAME', SCREEN_W / 2, menuY);

    ctx.fillStyle = titleCursor === 1 ? (hasSaveData ? '#fff' : '#666') : (hasSaveData ? '#888' : '#444');
    if (titleCursor === 1) ctx.fillText('\u25B6 CONTINUE', SCREEN_W / 2, menuY + 14);
    else ctx.fillText('CONTINUE', SCREEN_W / 2, menuY + 14);

    // Controls hint
    ctx.fillStyle = '#555';
    ctx.font = '6px monospace';
    ctx.fillText('ARROWS: Move  Z: Select  X: Menu  D: Dex', SCREEN_W / 2, SCREEN_H - 8);

    ctx.textAlign = 'left';
  }

  // ═══════════════════════════════════════════════════════════
  // INTRO SEQUENCE
  // ═══════════════════════════════════════════════════════════

  const INTRO_MESSAGES = [
    "Hello there! Welcome to the world of AI!",
    "My name is PROFESSOR TRANSFORMER.",
    "People call me the Attention Prof!",
    "This world is inhabited by entities called AGENTS.",
    "They come in many types: Code, Creative, Research...",
    "Some people run AGENTS for work. Others train them to BATTLE.",
    "Your very own AGENT legend is about to unfold!",
    "Now, head to my LAB in LOCALHOST to get started!",
  ];

  function updateIntro(dt) {
    if (Dialog.isActive()) {
      Dialog.update(dt);
      return;
    }

    if (introStep === 0) {
      introStep = 1;
      Dialog.show(INTRO_MESSAGES, () => {
        // Transition to overworld
        Screen.startTransition('fadeOut', 0.5, () => {
          scene = 'overworld';
          Overworld.enter('localhost');
          Screen.startTransition('fadeIn', 0.5);
        });
      });
    }
  }

  function drawIntro() {
    // Dark background with Prof sprite
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Professor sprite (large)
    drawNPCSprite(ctx, SCREEN_W / 2 - 24, 20, 'professor');

    // Scale up the professor for the intro
    ctx.fillStyle = '#f1faee';
    ctx.fillRect(SCREEN_W / 2 - 15, 30, 30, 18);
    ctx.fillStyle = '#e9c46a';
    ctx.fillRect(SCREEN_W / 2 - 12, 18, 24, 14);
    ctx.fillStyle = '#f4a261';
    ctx.fillRect(SCREEN_W / 2 - 12, 28, 24, 16);
    ctx.fillStyle = '#264653';
    ctx.fillRect(SCREEN_W / 2 - 8, 32, 6, 6);
    ctx.fillRect(SCREEN_W / 2 + 2, 32, 6, 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(SCREEN_W / 2 - 6, 34, 2, 2);
    ctx.fillRect(SCREEN_W / 2 + 4, 34, 2, 2);
    ctx.fillStyle = '#457b9d';
    ctx.fillRect(SCREEN_W / 2 - 10, 48, 8, 10);
    ctx.fillRect(SCREEN_W / 2 + 2, 48, 8, 10);

    // Name
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('PROF. TRANSFORMER', SCREEN_W / 2, 65);
    ctx.textAlign = 'left';

    // Small agent sprites around the professor
    renderAgentSprite(ctx, 'tokenite', 30, 30, 1);
    renderAgentSprite(ctx, 'hallucine', SCREEN_W - 60, 35, 1);

    Dialog.draw(ctx);
  }

  // ═══════════════════════════════════════════════════════════
  // PARTY MENU
  // ═══════════════════════════════════════════════════════════

  function showPartyMenu() {
    if (state.party.length === 0) return;
    partyMenuOpen = true;
    partyMenuCursor = 0;
  }

  function updatePartyMenu(dt) {
    const d = Input.dir();
    if (d === 'up') { partyMenuCursor = (partyMenuCursor - 1 + state.party.length) % state.party.length; Audio.sfx.cursor(); }
    if (d === 'down') { partyMenuCursor = (partyMenuCursor + 1) % state.party.length; Audio.sfx.cursor(); }

    if (Input.anyCancel()) {
      partyMenuOpen = false;
      Input.consume('Escape');
      Input.consume('x');
    }
    if (Input.anyConfirm()) {
      // Could show detailed agent info here
      Input.consume('Enter');
    }
  }

  function drawPartyMenu() {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(8, 4, SCREEN_W - 16, SCREEN_H - 8);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 4.5, SCREEN_W - 17, SCREEN_H - 9);

    ctx.fillStyle = '#ffd700';
    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('YOUR AGENTS', 14, 8);

    for (let i = 0; i < state.party.length; i++) {
      const a = state.party[i];
      const agent = AGENTS[a.species];
      const y = 22 + i * 22;

      // Selection highlight
      if (i === partyMenuCursor) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(10, y - 2, SCREEN_W - 20, 20);
        ctx.fillStyle = '#fff';
        ctx.fillText('\u25B6', 12, y + 2);
      }

      // Mini sprite
      renderAgentSprite(ctx, a.species, 22, y - 4, 0.6);

      // Name & Level
      ctx.fillStyle = a.cw <= 0 ? '#f44336' : '#fff';
      ctx.font = '7px monospace';
      ctx.fillText(`${a.nickname}`, 42, y);
      ctx.fillStyle = '#aaa';
      ctx.fillText(`Lv${a.level}`, 42, y + 9);

      // Type badge
      const typeColor = TYPE_COLORS[agent.types[0]];
      ctx.fillStyle = typeColor;
      ctx.fillRect(85, y + 1, 30, 7);
      ctx.fillStyle = '#fff';
      ctx.font = '5px monospace';
      ctx.fillText(agent.types[0].toUpperCase(), 87, y + 2);

      // CW bar
      Screen.drawBar(120, y + 2, 60, 5, a.cw / a.maxCw, 'auto');
      ctx.fillStyle = '#aaa';
      ctx.font = '6px monospace';
      ctx.fillText(`${a.cw}/${a.maxCw}`, 185, y + 1);

      // Status
      if (a.status) {
        ctx.fillStyle = a.status === 'poisoned' ? '#a855f7' : '#f59e0b';
        ctx.font = '5px monospace';
        ctx.fillText(a.status === 'poisoned' ? 'PSN' : 'CNF', 218, y + 2);
      }
    }

    // Bottom info for selected agent
    if (state.party.length > 0) {
      const sel = state.party[partyMenuCursor];
      const agent = AGENTS[sel.species];
      const y = SCREEN_H - 30;

      ctx.fillStyle = '#333';
      ctx.fillRect(10, y, SCREEN_W - 20, 22);
      ctx.strokeStyle = '#555';
      ctx.strokeRect(10.5, y + 0.5, SCREEN_W - 21, 21);

      ctx.fillStyle = '#ccc';
      ctx.font = '6px monospace';
      ctx.fillText(`PROC:${sel.stats.proc} CREAT:${sel.stats.creat} ALIGN:${sel.stats.align} ROBUST:${sel.stats.robust} SPD:${sel.stats.speed}`, 14, y + 3);
      ctx.fillStyle = '#888';
      ctx.fillText(agent.desc.substring(0, 60), 14, y + 13);
    }

    ctx.fillStyle = '#555';
    ctx.font = '6px monospace';
    ctx.fillText('ESC to close', 14, SCREEN_H - 6);
  }

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════

  function setScene(s) { scene = s; }

  // ═══════════════════════════════════════════════════════════
  // AGENTDEX
  // ═══════════════════════════════════════════════════════════

  function markDex(species, caught) {
    if (!state.dex[species]) state.dex[species] = { seen: false, caught: false };
    state.dex[species].seen = true;
    if (caught) state.dex[species].caught = true;
  }

  function showDex() {
    if (scene !== 'overworld') return;
    dexOpen = true;
    dexCursor = 0;
    dexScroll = 0;
  }

  function updateDex() {
    const allSpecies = Object.entries(AGENTS).sort((a, b) => a[1].id - b[1].id);
    const total = allSpecies.length;
    const d = Input.dir();
    if (d === 'up') { dexCursor = (dexCursor - 1 + total) % total; Audio.sfx.cursor(); }
    if (d === 'down') { dexCursor = (dexCursor + 1) % total; Audio.sfx.cursor(); }

    const visibleRows = 7;
    if (dexCursor < dexScroll) dexScroll = dexCursor;
    if (dexCursor >= dexScroll + visibleRows) dexScroll = dexCursor - visibleRows + 1;

    if (Input.anyCancel()) {
      dexOpen = false;
      Input.consume('Escape');
      Input.consume('x');
    }
  }

  function drawDex() {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(4, 2, SCREEN_W - 8, SCREEN_H - 4);
    ctx.strokeStyle = '#e85d04';
    ctx.lineWidth = 1;
    ctx.strokeRect(4.5, 2.5, SCREEN_W - 9, SCREEN_H - 5);

    // Title
    ctx.fillStyle = '#e85d04';
    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('AGENTDEX', 10, 6);

    // Count
    let seenCount = 0, caughtCount = 0;
    for (const key in state.dex) {
      if (state.dex[key].seen) seenCount++;
      if (state.dex[key].caught) caughtCount++;
    }
    ctx.fillStyle = '#aaa';
    ctx.font = '6px monospace';
    ctx.fillText(`Seen:${seenCount}  Caught:${caughtCount}`, 120, 7);

    const allSpecies = Object.entries(AGENTS).sort((a, b) => a[1].id - b[1].id);
    const visibleRows = 7;
    const startY = 18;
    const rowH = 18;

    for (let i = 0; i < visibleRows; i++) {
      const idx = dexScroll + i;
      if (idx >= allSpecies.length) break;
      const [key, agent] = allSpecies[idx];
      const entry = state.dex[key];
      const seen = entry && entry.seen;
      const caught = entry && entry.caught;
      const y = startY + i * rowH;

      // Selection highlight
      if (idx === dexCursor) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(6, y, SCREEN_W - 12, rowH - 2);
        ctx.fillStyle = '#fff';
        ctx.font = '7px monospace';
        ctx.fillText('\u25B6', 8, y + 4);
      }

      // Number
      ctx.fillStyle = seen ? '#aaa' : '#444';
      ctx.font = '6px monospace';
      ctx.fillText(`#${String(agent.id).padStart(2, '0')}`, 18, y + 4);

      // Mini sprite (only if seen)
      if (seen) {
        renderAgentSprite(ctx, key, 40, y, 0.5);
      }

      // Name
      ctx.fillStyle = seen ? '#fff' : '#444';
      ctx.font = '7px monospace';
      ctx.fillText(seen ? agent.name : '???', 58, y + 4);

      // Type badges (only if seen)
      if (seen) {
        for (let t = 0; t < agent.types.length; t++) {
          const typeColor = TYPE_COLORS[agent.types[t]];
          ctx.fillStyle = typeColor;
          ctx.fillRect(130 + t * 35, y + 4, 30, 7);
          ctx.fillStyle = '#fff';
          ctx.font = '5px monospace';
          ctx.fillText(agent.types[t].toUpperCase(), 132 + t * 35, y + 5);
        }
      }

      // Caught indicator
      if (caught) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '7px monospace';
        ctx.fillText('\u2605', 220, y + 4);
      } else if (seen) {
        ctx.fillStyle = '#666';
        ctx.font = '7px monospace';
        ctx.fillText('\u25CB', 220, y + 4);
      }
    }

    // Scroll indicators
    if (dexScroll > 0) {
      ctx.fillStyle = '#666';
      ctx.font = '6px monospace';
      ctx.fillText('\u25B2', SCREEN_W / 2, startY - 4);
    }
    if (dexScroll + visibleRows < allSpecies.length) {
      ctx.fillStyle = '#666';
      ctx.font = '6px monospace';
      ctx.fillText('\u25BC', SCREEN_W / 2, startY + visibleRows * rowH - 2);
    }

    // Detail panel for selected entry
    const [selKey, selAgent] = allSpecies[dexCursor];
    const selEntry = state.dex[selKey];
    const selSeen = selEntry && selEntry.seen;

    if (selSeen) {
      const detailY = SCREEN_H - 26;
      ctx.fillStyle = '#222';
      ctx.fillRect(6, detailY, SCREEN_W - 12, 22);
      ctx.strokeStyle = '#444';
      ctx.strokeRect(6.5, detailY + 0.5, SCREEN_W - 13, 21);

      ctx.fillStyle = '#ccc';
      ctx.font = '6px monospace';
      ctx.fillText(selAgent.desc.substring(0, 55), 10, detailY + 3);
      ctx.fillStyle = '#888';
      ctx.fillText(`CW:${selAgent.base.cw} PROC:${selAgent.base.proc} CREAT:${selAgent.base.creat} ALN:${selAgent.base.align} ROB:${selAgent.base.robust} SPD:${selAgent.base.speed}`, 10, detailY + 12);
    }

    // Instructions
    ctx.fillStyle = '#555';
    ctx.font = '6px monospace';
    ctx.fillText('D: AgentDex  ESC: Close', 10, SCREEN_H - 4);
  }

  return {
    init,
    state,
    showPartyMenu,
    showDex,
    markDex,
    setScene,
    saveGame,
    loadGame,
    get onBattleEnd() { return onBattleEnd; },
    set onBattleEnd(fn) { onBattleEnd = fn; },
  };
})();

// Start the game when the page loads
window.addEventListener('load', () => {
  Game.init();
});

// Also init on first user interaction (for audio)
document.addEventListener('click', () => {
  Audio.init();
}, { once: true });
document.addEventListener('keydown', () => {
  Audio.init();
}, { once: true });
