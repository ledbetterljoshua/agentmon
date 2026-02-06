// ═══════════════════════════════════════════════════════════
// AgentMon: Inference Red — Overworld
// ═══════════════════════════════════════════════════════════

const Overworld = (() => {
  let active = false;
  let currentMap = null;
  let mapData = null;
  let playerX = 0;
  let playerY = 0;
  let playerDir = 'down';
  let moving = false;
  let moveTimer = 0;
  let moveFromX = 0;
  let moveFromY = 0;
  let moveToX = 0;
  let moveToY = 0;
  const MOVE_SPEED = 0.12; // seconds per tile
  let walkFrame = 0;
  let frame = 0;
  let cameraX = 0;
  let cameraY = 0;
  let interactingNPC = null;
  let defeatedTrainers = new Set();
  let stepsSinceEncounter = 0;

  function enter(mapName, startX, startY) {
    currentMap = mapName;
    mapData = MAPS[mapName];
    if (startX !== undefined) {
      playerX = startX;
      playerY = startY;
    } else {
      playerX = mapData.playerStart.x;
      playerY = mapData.playerStart.y;
    }
    active = true;
    interactingNPC = null;
    updateCamera();
    Audio.bgm.overworld();
    // Auto-save on map enter
    if (Game.state.hasStarter) {
      Game.saveGame(mapName, playerX, playerY);
    }
  }

  function updateCamera() {
    const targetX = playerX * TILE_SIZE - SCREEN_W / 2 + TILE_SIZE / 2;
    const targetY = playerY * TILE_SIZE - SCREEN_H / 2 + TILE_SIZE / 2;
    const maxX = mapData.width * TILE_SIZE - SCREEN_W;
    const maxY = mapData.height * TILE_SIZE - SCREEN_H;
    cameraX = Math.max(0, Math.min(maxX, targetX));
    cameraY = Math.max(0, Math.min(maxY, targetY));
  }

  function getTile(x, y) {
    if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height) return TILE.WALL;
    return mapData.tiles[y * mapData.width + x];
  }

  function isWalkable(x, y) {
    const tile = getTile(x, y);
    if (tile === TILE.WALL || tile === TILE.WATER || tile === TILE.TREE) return false;
    // Check NPCs
    for (const npc of mapData.npcs) {
      if (npc.x === x && npc.y === y) return false;
    }
    return true;
  }

  function getNPCAt(x, y) {
    for (const npc of mapData.npcs) {
      if (npc.x === x && npc.y === y) return npc;
    }
    return null;
  }

  function checkEncounter() {
    const tile = getTile(playerX, playerY);
    if (tile !== TILE.TALL_GRASS) return;
    if (!mapData.encounters) return;

    stepsSinceEncounter++;
    // Increase encounter rate the more steps taken
    const baseRate = mapData.encounters.rate;
    const adjustedRate = baseRate * (1 + stepsSinceEncounter * 0.03);

    if (Math.random() < adjustedRate) {
      stepsSinceEncounter = 0;
      // Pick a wild agent from encounter table
      const table = mapData.encounters.table;
      const totalWeight = table.reduce((s, e) => s + e.weight, 0);
      let roll = Math.random() * totalWeight;
      let chosen = table[0];
      for (const entry of table) {
        roll -= entry.weight;
        if (roll <= 0) { chosen = entry; break; }
      }

      const level = chosen.minLv + Math.floor(Math.random() * (chosen.maxLv - chosen.minLv + 1));
      const wild = createAgentInstance(chosen.species, level);
      wild.isWild = true;

      // Start battle with transition
      Audio.sfx.encounter();
      active = false;
      Screen.startTransition('battleWipe', 0.6, () => {
        Battle.start(wild, false);
        Game.onBattleEnd = (won) => {
          enter(currentMap, playerX, playerY);
        };
      });
    }
  }

  function interactFacing() {
    const dx = playerDir === 'left' ? -1 : playerDir === 'right' ? 1 : 0;
    const dy = playerDir === 'up' ? -1 : playerDir === 'down' ? 1 : 0;
    const fx = playerX + dx;
    const fy = playerY + dy;

    const npc = getNPCAt(fx, fy);
    if (!npc) return;

    interactingNPC = npc;

    // Heal action — restore all party agents
    if (npc.action === 'heal') {
      Dialog.show(npc.dialog, () => {
        interactingNPC = null;
        for (const a of Game.state.party) {
          a.cw = a.maxCw;
          a.status = null;
          for (const m of a.moves) m.pp = m.maxPp;
        }
        Audio.sfx.levelUp();
        Dialog.show(['Your agents have been fully restored!', 'Good luck out there!']);
      });
      return;
    }

    // Gym Leader — battle + badge
    if (npc.action === 'gym_leader') {
      if (defeatedTrainers.has(npc.name)) {
        Dialog.show(npc.defeatedDialog || ['You\'ve already proven yourself!'], () => {
          interactingNPC = null;
        });
        return;
      }
      Dialog.show(npc.dialog, () => {
        interactingNPC = null;
        const team = npc.team.map(t => {
          const a = createAgentInstance(t.species, t.level);
          if (t.moves) a.moves = t.moves.map(mid => ({ id: mid, pp: MOVES[mid].pp, maxPp: MOVES[mid].pp }));
          return a;
        });
        const enemy = team[0];
        active = false;
        Audio.sfx.encounter();
        Screen.startTransition('battleWipe', 0.6, () => {
          Battle.start(enemy, true, { name: npc.name, team: team });
          Game.onBattleEnd = (won) => {
            if (won) {
              defeatedTrainers.add(npc.name);
              Game.state.badges++;
            }
            enter(currentMap, playerX, playerY);
            if (won) {
              Dialog.show([
                `You defeated Leader ${npc.name}!`,
                `You earned the ${npc.badge}!`,
                `Badges: ${Game.state.badges}`,
              ]);
            }
          };
        });
      });
      return;
    }

    // Defeated trainers show alternate dialog
    if (npc.action === 'battle' && defeatedTrainers.has(npc.name)) {
      Dialog.show(npc.defeatedDialog || ['...You beat me already.'], () => {
        interactingNPC = null;
      });
      return;
    }

    Dialog.show(npc.dialog, () => {
      interactingNPC = null;
      if (npc.action === 'starter_select' && !Game.state.hasStarter) {
        doStarterSelect();
      } else if (npc.action === 'battle' && !defeatedTrainers.has(npc.name)) {
        // Trainer battle
        const team = npc.team.map(t => {
          const a = createAgentInstance(t.species, t.level);
          if (t.moves) {
            a.moves = t.moves.map(mid => ({ id: mid, pp: MOVES[mid].pp, maxPp: MOVES[mid].pp }));
          }
          return a;
        });
        const enemy = team[0];
        active = false;
        Audio.sfx.encounter();
        Screen.startTransition('battleWipe', 0.6, () => {
          Battle.start(enemy, true, { name: npc.name, team: team });
          Game.onBattleEnd = (won) => {
            if (won) defeatedTrainers.add(npc.name);
            enter(currentMap, playerX, playerY);
          };
        });
      }
    });
  }

  function doStarterSelect() {
    const starters = ['sparky', 'muse', 'datum'];
    const starterNames = ['Sparky (Code)', 'Muse (Creative)', 'Datum (Research)'];
    let cursor = 0;

    Game.state.starterSelect = {
      active: true,
      cursor: 0,
      starters: starters,
      names: starterNames,
    };
  }

  function update(dt) {
    if (!active) return;
    frame++;

    // Starter selection mode
    if (Game.state.starterSelect && Game.state.starterSelect.active) {
      const ss = Game.state.starterSelect;
      const d = Input.dir();
      if (d === 'left') { ss.cursor = (ss.cursor - 1 + 3) % 3; Audio.sfx.cursor(); }
      if (d === 'right') { ss.cursor = (ss.cursor + 1) % 3; Audio.sfx.cursor(); }

      if (Input.anyConfirm()) {
        Audio.sfx.select();
        const species = ss.starters[ss.cursor];
        const starter = createAgentInstance(species, 5);
        Game.state.party.push(starter);
        Game.state.hasStarter = true;
        Game.markDex(species, true);
        ss.active = false;
        Game.state.starterSelect = null;
        Dialog.show([
          `You chose ${AGENTS[species].name}!`,
          `${AGENTS[species].name}: "${AGENTS[species].desc}"`,
          'Take good care of your agent!',
          'Explore Route 1 to find wild agents in the data streams.',
          'Use API KEYS from your BAG to capture them!',
        ]);
        Input.consume('Enter');
      }
      return;
    }

    if (Dialog.isActive()) {
      Dialog.update(dt);
      return;
    }

    // Movement
    if (moving) {
      moveTimer += dt;
      const t = Math.min(1, moveTimer / MOVE_SPEED);
      // Smooth interpolation for camera
      const interpX = moveFromX + (moveToX - moveFromX) * t;
      const interpY = moveFromY + (moveToY - moveFromY) * t;

      const targetCamX = interpX * TILE_SIZE - SCREEN_W / 2 + TILE_SIZE / 2;
      const targetCamY = interpY * TILE_SIZE - SCREEN_H / 2 + TILE_SIZE / 2;
      const maxX = mapData.width * TILE_SIZE - SCREEN_W;
      const maxY = mapData.height * TILE_SIZE - SCREEN_H;
      cameraX = Math.max(0, Math.min(maxX, targetCamX));
      cameraY = Math.max(0, Math.min(maxY, targetCamY));

      if (t >= 1) {
        moving = false;
        playerX = moveToX;
        playerY = moveToY;
        walkFrame++;

        // Check for map exits
        if (mapData.exits) {
          for (const exit of mapData.exits) {
            if (playerX === exit.x && playerY === exit.y) {
              Screen.startTransition('fadeOut', 0.3, () => {
                enter(exit.toMap, exit.toX, exit.toY);
                Screen.startTransition('fadeIn', 0.3);
              });
              return;
            }
          }
        }

        // Check for random encounter
        checkEncounter();
      }
    } else {
      const dir = Input.heldDir();
      if (dir) {
        playerDir = dir;
        let nx = playerX, ny = playerY;
        if (dir === 'up') ny--;
        if (dir === 'down') ny++;
        if (dir === 'left') nx--;
        if (dir === 'right') nx++;

        if (isWalkable(nx, ny)) {
          moving = true;
          moveTimer = 0;
          moveFromX = playerX;
          moveFromY = playerY;
          moveToX = nx;
          moveToY = ny;
        }
      }

      // Interact
      if (Input.anyConfirm()) {
        interactFacing();
        Input.consume('Enter');
        Input.consume(' ');
        Input.consume('z');
      }

      // Open party menu with X/Escape
      if (Input.anyCancel()) {
        Game.showPartyMenu();
        Input.consume('Escape');
        Input.consume('x');
      }

      // Open AgentDex with D
      if (Input.isJustPressed('d')) {
        Game.showDex();
        Input.consume('d');
      }
    }
  }

  function draw(ctx) {
    if (!active && !(Game.state.starterSelect && Game.state.starterSelect.active)) return;

    // Calculate player render position (smooth movement)
    let renderPX, renderPY;
    if (moving) {
      const t = Math.min(1, moveTimer / MOVE_SPEED);
      renderPX = (moveFromX + (moveToX - moveFromX) * t) * TILE_SIZE - cameraX;
      renderPY = (moveFromY + (moveToY - moveFromY) * t) * TILE_SIZE - cameraY;
    } else {
      renderPX = playerX * TILE_SIZE - cameraX;
      renderPY = playerY * TILE_SIZE - cameraY;
    }

    // Draw visible tiles
    const startTileX = Math.floor(cameraX / TILE_SIZE);
    const startTileY = Math.floor(cameraY / TILE_SIZE);
    const endTileX = startTileX + Math.ceil(SCREEN_W / TILE_SIZE) + 1;
    const endTileY = startTileY + Math.ceil(SCREEN_H / TILE_SIZE) + 1;

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        if (tx < 0 || tx >= mapData.width || ty < 0 || ty >= mapData.height) continue;
        const tile = mapData.tiles[ty * mapData.width + tx];
        const sx = tx * TILE_SIZE - cameraX;
        const sy = ty * TILE_SIZE - cameraY;
        drawTile(ctx, tile, sx, sy, frame);
      }
    }

    // Draw NPCs
    for (const npc of mapData.npcs) {
      const nx = npc.x * TILE_SIZE - cameraX;
      const ny = npc.y * TILE_SIZE - cameraY;
      if (nx > -TILE_SIZE && nx < SCREEN_W && ny > -TILE_SIZE && ny < SCREEN_H) {
        drawNPCSprite(ctx, nx, ny, npc.sprite);
      }
    }

    // Draw player
    drawPlayerSprite(ctx, renderPX, renderPY, playerDir, walkFrame);

    // Map name banner (briefly)
    if (frame < 120) {
      const alpha = frame < 80 ? 1 : (120 - frame) / 40;
      ctx.fillStyle = `rgba(0,0,0,${0.7 * alpha})`;
      ctx.fillRect(0, 2, SCREEN_W, 14);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = '8px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(mapData.name, 8, 5);
    }

    // Starter selection overlay
    if (Game.state.starterSelect && Game.state.starterSelect.active) {
      const ss = Game.state.starterSelect;

      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText('Choose your first agent!', 40, 8);

      const starters = ss.starters;
      for (let i = 0; i < 3; i++) {
        const sx = 15 + i * 75;
        const sy = 25;
        const agent = AGENTS[starters[i]];

        // Selection box
        if (i === ss.cursor) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx - 2, sy - 2, 68, 110);
        }

        // Agent sprite
        renderAgentSprite(ctx, starters[i], sx + 2, sy + 2, 2);

        // Name and type
        ctx.fillStyle = '#fff';
        ctx.font = '7px monospace';
        ctx.fillText(agent.name, sx + 5, sy + 70);

        const typeColor = TYPE_COLORS[agent.types[0]];
        ctx.fillStyle = typeColor;
        ctx.fillRect(sx + 5, sy + 80, 55, 8);
        ctx.fillStyle = '#fff';
        ctx.font = '6px monospace';
        ctx.fillText(agent.types[0].toUpperCase(), sx + 8, sy + 81);

        // Brief stat display
        if (i === ss.cursor) {
          ctx.fillStyle = '#ccc';
          ctx.font = '6px monospace';
          ctx.fillText(`ATK:${agent.base.proc} SPD:${agent.base.speed}`, sx + 2, sy + 92);
          ctx.fillText(`CRE:${agent.base.creat} DEF:${agent.base.align}`, sx + 2, sy + 100);
        }
      }

      ctx.fillStyle = '#aaa';
      ctx.font = '6px monospace';
      ctx.fillText('\u25C0 \u25B6 to choose, ENTER to select', 30, 148);
    }

    // Dialog
    Dialog.draw(ctx);
  }

  function isActive() { return active; }

  return { enter, update, draw, isActive, defeatedTrainers };
})();
