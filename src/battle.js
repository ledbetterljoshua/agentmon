// ═══════════════════════════════════════════════════════════
// AgentMon: Inference Red — Battle System
// ═══════════════════════════════════════════════════════════

const Battle = (() => {
  let state = null; // null when not in battle

  // Battle state machine
  const PHASE = {
    INTRO: 'intro',
    MENU: 'menu',
    MOVE_SELECT: 'move_select',
    BAG: 'bag',
    SWITCH: 'switch',
    EXECUTING: 'executing',
    MESSAGE: 'message',
    FAINT: 'faint',
    XP: 'xp',
    LEVEL_UP: 'level_up',
    EVOLUTION: 'evolution',
    CATCH: 'catch',
    WIN: 'win',
    LOSE: 'lose',
    RUN: 'run',
    LEARN_MOVE: 'learn_move',
  };

  function start(wildAgent, isTrainer = false, trainerData = null) {
    Audio.bgm.battle();
    const player = Game.state.party[0];
    state = {
      phase: PHASE.INTRO,
      playerAgent: player,
      enemyAgent: wildAgent,
      isTrainer: isTrainer,
      trainerData: trainerData,
      trainerTeamIdx: 0,
      menuCursor: 0,
      moveCursor: 0,
      bagCursor: 0,
      switchCursor: 0,
      messages: [],
      messageCallback: null,
      animTimer: 0,
      introStep: 0,
      shakeTimer: 0,
      shakeTarget: null, // 'player' or 'enemy'
      flashTimer: 0,
      flashTarget: null,
      playerSlideX: -80, // Slide in from left
      enemySlideX: 80,   // Slide in from right
      catchShakes: 0,
      catchSuccess: false,
      xpToGive: 0,
      pendingLevelUps: [],
      pendingEvolution: null,
      pendingNewMoves: [],
      learnMoveCursor: 0,
      learnMoveId: null,
      learnMoveCallback: null,
    };
    // Mark enemy in AgentDex
    Game.markDex(wildAgent.species, false);
  }

  function showMessage(msg, callback) {
    state.messages = Array.isArray(msg) ? msg : [msg];
    state.messageCallback = callback;
    state.phase = PHASE.MESSAGE;
    state.msgIndex = 0;
    state.msgCharIndex = 0;
    state.msgCharTimer = 0;
  }

  function getStatMultiplier(stage) {
    if (stage >= 0) return (2 + stage) / 2;
    return 2 / (2 - stage);
  }

  function calculateDamage(attacker, defender, move) {
    const moveData = MOVES[move.id];
    if (moveData.category === 'status') return 0;

    // Random damage for hallucinate
    if (moveData.effect && moveData.effect.type === 'random_damage') {
      return Math.floor(Math.random() * (moveData.effect.max - moveData.effect.min)) + moveData.effect.min;
    }

    const level = attacker.level;
    let atk, def;
    if (moveData.category === 'physical') {
      atk = attacker.stats.proc * getStatMultiplier(attacker.statStages.proc);
      def = defender.stats.align * getStatMultiplier(defender.statStages.align);
    } else {
      atk = attacker.stats.creat * getStatMultiplier(attacker.statStages.creat);
      def = defender.stats.robust * getStatMultiplier(defender.statStages.robust);
    }

    const baseDmg = ((2 * level / 5 + 2) * moveData.power * atk / def) / 50 + 2;

    // Type effectiveness
    const defTypes = AGENTS[defender.species].types;
    const effectiveness = getTypeEffectiveness(moveData.type, defTypes);

    // STAB (Same Type Attack Bonus)
    const atkTypes = AGENTS[attacker.species].types;
    const stab = atkTypes.includes(moveData.type) ? 1.5 : 1;

    // Random factor (85-100%)
    const rand = 0.85 + Math.random() * 0.15;

    return Math.max(1, Math.floor(baseDmg * effectiveness * stab * rand));
  }

  function applyMove(attacker, defender, move, isPlayer) {
    const moveData = MOVES[move.id];
    const results = [];
    const enemyPrefix = state.isTrainer ? '' : 'Wild ';
    const attackerName = isPlayer ? attacker.nickname : enemyPrefix + attacker.nickname;
    const defenderName = isPlayer ? enemyPrefix + defender.nickname : defender.nickname;

    results.push(`${attackerName} used ${moveData.name}!`);

    // Accuracy check
    if (Math.random() * 100 > moveData.accuracy) {
      results.push(`${attackerName}'s attack missed!`);
      return { results, hit: false, effectiveness: 1, damage: 0 };
    }

    // Confused check
    if (attacker.status === 'confused') {
      if (Math.random() < 0.33) {
        const selfDmg = Math.floor(attacker.maxCw * 0.05);
        attacker.cw = Math.max(0, attacker.cw - selfDmg);
        results.push(`${attackerName} is confused!`);
        results.push(`It hurt itself in confusion!`);
        return { results, hit: false, effectiveness: 1, damage: selfDmg, selfHit: true };
      }
      if (Math.random() < 0.25) {
        attacker.status = null;
        results.push(`${attackerName} snapped out of confusion!`);
      }
    }

    // Use PP
    move.pp = Math.max(0, move.pp - 1);

    let damage = 0;
    let effectiveness = 1;

    if (moveData.category !== 'status') {
      damage = calculateDamage(attacker, defender, move);
      const defTypes = AGENTS[defender.species].types;
      effectiveness = getTypeEffectiveness(moveData.type, defTypes);

      defender.cw = Math.max(0, defender.cw - damage);

      if (effectiveness > 1) results.push("It's super effective!");
      else if (effectiveness < 1 && effectiveness > 0) results.push("It's not very effective...");
      else if (effectiveness === 0) results.push("It had no effect!");
    }

    // Apply effects
    if (moveData.effect && Math.random() * 100 < (moveData.effect.chance || 100)) {
      switch (moveData.effect.type) {
        case 'confuse':
          if (!defender.status) {
            defender.status = 'confused';
            results.push(`${defenderName} became confused!`);
          }
          break;
        case 'poison':
          if (!defender.status) {
            defender.status = 'poisoned';
            results.push(`${defenderName} was poisoned!`);
          }
          break;
        case 'stat': {
          const target = moveData.effect.target === 'self' ? attacker : defender;
          const targetName = moveData.effect.target === 'self' ? attackerName : defenderName;
          const stat = moveData.effect.stat;
          const stages = moveData.effect.stages;
          target.statStages[stat] = Math.max(-6, Math.min(6, target.statStages[stat] + stages));
          const statNames = { proc: 'Processing', creat: 'Creativity', align: 'Alignment', robust: 'Robustness', speed: 'Speed' };
          const dir = stages > 0 ? 'rose' : 'fell';
          const amount = Math.abs(stages) > 1 ? ' sharply' : '';
          results.push(`${targetName}'s ${statNames[stat]}${amount} ${dir}!`);
          break;
        }
        case 'recoil': {
          const recoilDmg = Math.floor(damage * moveData.effect.fraction);
          attacker.cw = Math.max(0, attacker.cw - recoilDmg);
          results.push(`${attackerName} took recoil damage!`);
          break;
        }
      }
    }

    return { results, hit: true, effectiveness, damage };
  }

  function tryCapture(agent) {
    const base = AGENTS[agent.species];
    const catchRate = base.catchRate || 100;
    // Modified catch rate: lower HP = easier catch
    const hpRatio = agent.cw / agent.maxCw;
    const hpMod = (3 - 2 * hpRatio);
    // Status bonus
    const statusMod = agent.status ? 1.5 : 1;
    // Ball modifier
    const bag = Game.state.bag;
    const keyItem = bag.find(i => i.type === 'apikey');
    const ballMod = keyItem ? ITEMS[keyItem.id].catchMod : 1;

    const rate = Math.floor(catchRate * hpMod * statusMod * ballMod / 3);
    const shakes = rate >= 255 ? 3 : Math.min(3, Math.floor(Math.random() * 4 * rate / 255));

    // Use the key
    if (keyItem) {
      keyItem.qty--;
      if (keyItem.qty <= 0) {
        const idx = bag.indexOf(keyItem);
        bag.splice(idx, 1);
      }
    }

    return { shakes, caught: shakes >= 3 };
  }

  // Enemy AI: pick the most effective move
  function enemyChooseMove() {
    const enemy = state.enemyAgent;
    const player = state.playerAgent;
    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < enemy.moves.length; i++) {
      const m = enemy.moves[i];
      if (m.pp <= 0) continue;
      const moveData = MOVES[m.id];
      let score = moveData.power || 30;
      const defTypes = AGENTS[player.species].types;
      score *= getTypeEffectiveness(moveData.type, defTypes);
      const atkTypes = AGENTS[enemy.species].types;
      if (atkTypes.includes(moveData.type)) score *= 1.5;
      score += Math.random() * 20; // Some randomness
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    return bestIdx;
  }

  function executeTurn(playerMoveIdx) {
    const player = state.playerAgent;
    const enemy = state.enemyAgent;
    const enemyMoveIdx = enemyChooseMove();

    const playerSpeed = player.stats.speed * getStatMultiplier(player.statStages.speed);
    const enemySpeed = enemy.stats.speed * getStatMultiplier(enemy.statStages.speed);
    const playerFirst = playerSpeed >= enemySpeed;

    const first = playerFirst ? { agent: player, move: player.moves[playerMoveIdx], isPlayer: true } : { agent: enemy, move: enemy.moves[enemyMoveIdx], isPlayer: false };
    const second = playerFirst ? { agent: enemy, move: enemy.moves[enemyMoveIdx], isPlayer: false } : { agent: player, move: player.moves[playerMoveIdx], isPlayer: true };

    state.phase = PHASE.EXECUTING;
    const allMessages = [];

    // First attacker
    const r1 = applyMove(first.agent, first.isPlayer ? enemy : player, first.move, first.isPlayer);
    allMessages.push(...r1.results);

    // Check if target fainted
    const target1 = first.isPlayer ? enemy : player;
    if (target1.cw <= 0) {
      executeMoveResults(allMessages, r1, first.isPlayer, () => {
        handleFaint(first.isPlayer);
      });
      return;
    }

    // Poison damage after first move
    if (target1.status === 'poisoned') {
      const poisonDmg = Math.floor(target1.maxCw * 0.0625);
      target1.cw = Math.max(0, target1.cw - poisonDmg);
      allMessages.push(`${target1.nickname} took poison damage!`);
      if (target1.cw <= 0) {
        executeMoveResults(allMessages, r1, first.isPlayer, () => {
          handleFaint(first.isPlayer);
        });
        return;
      }
    }

    // Second attacker
    const r2 = applyMove(second.agent, second.isPlayer ? enemy : player, second.move, second.isPlayer);
    allMessages.push(...r2.results);

    const target2 = second.isPlayer ? enemy : player;
    if (target2.cw <= 0) {
      executeMoveResults(allMessages, r2, second.isPlayer, () => {
        handleFaint(second.isPlayer);
      });
      return;
    }

    // Poison damage after second move
    if (target2.status === 'poisoned') {
      const poisonDmg = Math.floor(target2.maxCw * 0.0625);
      target2.cw = Math.max(0, target2.cw - poisonDmg);
      allMessages.push(`${target2.nickname} took poison damage!`);
      if (target2.cw <= 0) {
        executeMoveResults(allMessages, r2, second.isPlayer, () => {
          handleFaint(second.isPlayer);
        });
        return;
      }
    }

    // Both alive — back to menu
    executeMoveResults(allMessages, r2, second.isPlayer, () => {
      state.phase = PHASE.MENU;
      state.menuCursor = 0;
    });
  }

  function executeMoveResults(messages, lastResult, wasPlayer, callback) {
    // Set shake animation
    if (lastResult.hit && lastResult.damage > 0) {
      state.shakeTimer = 0.3;
      state.shakeTarget = wasPlayer ? 'enemy' : 'player';
      if (lastResult.effectiveness > 1) {
        state.flashTimer = 0.4;
        state.flashTarget = wasPlayer ? 'enemy' : 'player';
      }
    }
    showMessage(messages, callback);
  }

  function handleFaint(playerCausedFaint) {
    if (playerCausedFaint) {
      // Enemy fainted
      const enemyName = state.enemyAgent.nickname;
      const isWild = !state.isTrainer;
      Audio.sfx.faint();
      showMessage(`${isWild ? 'Wild ' : ''}${enemyName} hallucinated into oblivion!`, () => {
        // Award XP
        const xp = getXpYield(state.enemyAgent);
        state.xpToGive = xp;
        showMessage(`${state.playerAgent.nickname} gained ${xp} XP!`, () => {
          const afterXP = () => {
            // Check if trainer has more agents
            if (state && state.isTrainer && state.trainerData &&
                state.trainerTeamIdx + 1 < state.trainerData.team.length) {
              state.trainerTeamIdx++;
              const nextAgent = state.trainerData.team[state.trainerTeamIdx];
              state.enemyAgent = nextAgent;
              Game.markDex(nextAgent.species, false);
              showMessage(`${state.trainerData.name} sent out ${nextAgent.nickname}!`, () => {
                state.phase = PHASE.MENU;
                state.menuCursor = 0;
              });
            } else {
              endBattle(true);
            }
          };
          awardXP(xp, afterXP);
        });
      });
    } else {
      // Player's agent fainted
      Audio.sfx.faint();
      showMessage(`${state.playerAgent.nickname} hallucinated into oblivion!`, () => {
        // Check if we have more agents
        const aliveAgents = Game.state.party.filter(a => a.cw > 0);
        if (aliveAgents.length > 0) {
          state.phase = PHASE.SWITCH;
          state.switchCursor = 0;
          showMessage('Send out another agent?', () => {
            state.phase = PHASE.SWITCH;
          });
        } else {
          state.phase = PHASE.LOSE;
          showMessage('All your agents have hallucinated! You blacked out...', () => {
            endBattle(false);
          });
        }
      });
    }
  }

  function awardXP(xp, onComplete) {
    const agent = state.playerAgent;
    agent.xp += xp;
    const finalize = onComplete || (() => endBattle(true));

    // Check level up
    while (agent.xp >= agent.xpToNext && agent.level < 100) {
      agent.xp -= agent.xpToNext;
      agent.level++;
      agent.xpToNext = Math.floor(Math.pow(agent.level, 3) * 0.8);

      // Recalculate stats
      const base = AGENTS[agent.species].base;
      const oldMaxCw = agent.maxCw;
      agent.maxCw = Math.floor((2 * base.cw * agent.level) / 100) + agent.level + 10;
      agent.cw += agent.maxCw - oldMaxCw; // Gain HP proportionally
      agent.stats.proc = Math.floor((2 * base.proc * agent.level) / 100) + 5;
      agent.stats.creat = Math.floor((2 * base.creat * agent.level) / 100) + 5;
      agent.stats.align = Math.floor((2 * base.align * agent.level) / 100) + 5;
      agent.stats.robust = Math.floor((2 * base.robust * agent.level) / 100) + 5;
      agent.stats.speed = Math.floor((2 * base.speed * agent.level) / 100) + 5;

      // Learn new moves
      const learnset = AGENTS[agent.species].learnset;
      for (const entry of learnset) {
        if (entry.level === agent.level) {
          if (agent.moves.length < 4) {
            agent.moves.push({ id: entry.move, pp: MOVES[entry.move].pp, maxPp: MOVES[entry.move].pp });
            state.pendingLevelUps.push(`${agent.nickname} learned ${MOVES[entry.move].name}!`);
          } else {
            // Queue for move replacement UI
            state.pendingNewMoves.push(entry.move);
          }
        }
      }

      state.pendingLevelUps.unshift(`${agent.nickname} grew to Lv. ${agent.level}!`);

      // Check evolution
      const evo = AGENTS[agent.species].evolution;
      if (evo && agent.level >= evo.level) {
        state.pendingEvolution = evo.into;
      }
    }

    const afterLevelMessages = () => {
      state.pendingLevelUps = [];
      processNextLearnMove(() => {
        if (state.pendingEvolution) {
          doEvolution(finalize);
        } else {
          finalize();
        }
      });
    };

    if (state.pendingLevelUps.length > 0) {
      Audio.sfx.levelUp();
      showMessage(state.pendingLevelUps, afterLevelMessages);
    } else {
      afterLevelMessages();
    }
  }

  function processNextLearnMove(onComplete) {
    if (!state.pendingNewMoves || state.pendingNewMoves.length === 0) {
      onComplete();
      return;
    }
    const moveId = state.pendingNewMoves.shift();
    const moveData = MOVES[moveId];
    const agent = state.playerAgent;

    state.learnMoveId = moveId;
    state.learnMoveCursor = 0;
    state.learnMoveCallback = onComplete;

    showMessage([
      `${agent.nickname} wants to learn ${moveData.name}!`,
      `But ${agent.nickname} already knows 4 moves.`,
      `Forget a move to learn ${moveData.name}?`,
    ], () => {
      state.phase = PHASE.LEARN_MOVE;
    });
  }

  function doEvolution(onComplete) {
    const agent = state.playerAgent;
    const oldName = agent.nickname;
    const newSpecies = state.pendingEvolution;
    const newData = AGENTS[newSpecies];
    const finalize = onComplete || (() => endBattle(true));

    Audio.sfx.evolution();
    state.phase = PHASE.EVOLUTION;

    showMessage([
      `What? ${oldName} is evolving!`,
      `${oldName} evolved into ${newData.name}!`
    ], () => {
      // Actually evolve
      agent.species = newSpecies;
      agent.nickname = newData.name;

      // Recalculate stats with new base
      const base = newData.base;
      agent.maxCw = Math.floor((2 * base.cw * agent.level) / 100) + agent.level + 10;
      agent.cw = agent.maxCw; // Full heal on evolution
      agent.stats.proc = Math.floor((2 * base.proc * agent.level) / 100) + 5;
      agent.stats.creat = Math.floor((2 * base.creat * agent.level) / 100) + 5;
      agent.stats.align = Math.floor((2 * base.align * agent.level) / 100) + 5;
      agent.stats.robust = Math.floor((2 * base.robust * agent.level) / 100) + 5;
      agent.stats.speed = Math.floor((2 * base.speed * agent.level) / 100) + 5;

      state.pendingEvolution = null;
      finalize();
    });
  }

  function endBattle(won) {
    state = null;
    Audio.bgm.overworld();
    if (Game.onBattleEnd) Game.onBattleEnd(won);
  }

  function update(dt) {
    if (!state) return;

    // Animation timers
    if (state.shakeTimer > 0) state.shakeTimer = Math.max(0, state.shakeTimer - dt);
    if (state.flashTimer > 0) state.flashTimer = Math.max(0, state.flashTimer - dt);

    // Intro animation
    if (state.phase === PHASE.INTRO) {
      state.animTimer += dt;
      state.playerSlideX += (0 - state.playerSlideX) * 0.1;
      state.enemySlideX += (0 - state.enemySlideX) * 0.1;
      if (state.animTimer > 1.0) {
        const name = state.enemyAgent.isWild
          ? `Wild ${state.enemyAgent.nickname} appeared!`
          : `${state.trainerData?.name || 'Trainer'} sent out ${state.enemyAgent.nickname}!`;
        showMessage(name, () => {
          showMessage(`Go! ${state.playerAgent.nickname}!`, () => {
            state.phase = PHASE.MENU;
            state.menuCursor = 0;
          });
        });
      }
      return;
    }

    // Message display
    if (state.phase === PHASE.MESSAGE) {
      state.msgCharTimer += dt;
      const msg = state.messages[state.msgIndex];
      if (state.msgCharIndex < msg.length) {
        while (state.msgCharTimer >= 0.02 && state.msgCharIndex < msg.length) {
          state.msgCharTimer -= 0.02;
          state.msgCharIndex++;
        }
      }

      if (Input.anyConfirm()) {
        if (state.msgCharIndex < msg.length) {
          state.msgCharIndex = msg.length;
        } else {
          state.msgIndex++;
          if (state.msgIndex >= state.messages.length) {
            if (state.messageCallback) state.messageCallback();
          } else {
            state.msgCharIndex = 0;
            state.msgCharTimer = 0;
          }
        }
        Input.consume('Enter');
        Input.consume(' ');
        Input.consume('z');
      }
      return;
    }

    // Main menu
    if (state.phase === PHASE.MENU) {
      const d = Input.dir();
      if (d === 'up') { state.menuCursor = (state.menuCursor + 2) % 4; Audio.sfx.cursor(); }
      if (d === 'down') { state.menuCursor = (state.menuCursor + 2) % 4; Audio.sfx.cursor(); }
      if (d === 'left') { state.menuCursor = state.menuCursor % 2 === 0 ? state.menuCursor : state.menuCursor - 1; Audio.sfx.cursor(); }
      if (d === 'right') { state.menuCursor = state.menuCursor % 2 === 1 ? state.menuCursor : state.menuCursor + 1; Audio.sfx.cursor(); }

      if (Input.anyConfirm()) {
        Audio.sfx.select();
        switch(state.menuCursor) {
          case 0: // FIGHT
            state.phase = PHASE.MOVE_SELECT;
            state.moveCursor = 0;
            break;
          case 1: // BAG
            state.phase = PHASE.BAG;
            state.bagCursor = 0;
            break;
          case 2: // AGENTS
            state.phase = PHASE.SWITCH;
            state.switchCursor = 0;
            break;
          case 3: // RUN
            if (state.isTrainer) {
              showMessage("Can't run from a trainer battle!", () => {
                state.phase = PHASE.MENU;
              });
            } else {
              const mySpeed = state.playerAgent.stats.speed;
              const theirSpeed = state.enemyAgent.stats.speed;
              if (Math.random() < (mySpeed / theirSpeed) * 0.7 + 0.3) {
                showMessage('Got away safely!', () => {
                  endBattle(false);
                });
              } else {
                showMessage("Can't escape!", () => {
                  // Enemy gets a free turn
                  const enemyMoveIdx = enemyChooseMove();
                  const r = applyMove(state.enemyAgent, state.playerAgent, state.enemyAgent.moves[enemyMoveIdx], false);
                  showMessage(r.results, () => {
                    if (state.playerAgent.cw <= 0) {
                      handleFaint(false);
                    } else {
                      state.phase = PHASE.MENU;
                      state.menuCursor = 0;
                    }
                  });
                });
              }
            }
            break;
        }
        Input.consume('Enter');
        Input.consume(' ');
        Input.consume('z');
      }
      return;
    }

    // Move selection
    if (state.phase === PHASE.MOVE_SELECT) {
      const d = Input.dir();
      const numMoves = state.playerAgent.moves.length;
      if (d === 'up') { state.moveCursor = (state.moveCursor - 1 + numMoves) % numMoves; Audio.sfx.cursor(); }
      if (d === 'down') { state.moveCursor = (state.moveCursor + 1) % numMoves; Audio.sfx.cursor(); }

      if (Input.anyConfirm()) {
        const move = state.playerAgent.moves[state.moveCursor];
        if (move.pp <= 0) {
          showMessage('No tokens left for this move!', () => {
            state.phase = PHASE.MOVE_SELECT;
          });
        } else {
          Audio.sfx.select();
          Audio.sfx.hit();
          executeTurn(state.moveCursor);
        }
        Input.consume('Enter');
        Input.consume(' ');
        Input.consume('z');
      }
      if (Input.anyCancel()) {
        state.phase = PHASE.MENU;
        Input.consume('Escape');
        Input.consume('x');
      }
      return;
    }

    // Bag
    if (state.phase === PHASE.BAG) {
      const bag = Game.state.bag;
      if (bag.length === 0) {
        showMessage('Your bag is empty!', () => {
          state.phase = PHASE.MENU;
        });
        return;
      }

      const d = Input.dir();
      if (d === 'up') { state.bagCursor = (state.bagCursor - 1 + bag.length) % bag.length; Audio.sfx.cursor(); }
      if (d === 'down') { state.bagCursor = (state.bagCursor + 1) % bag.length; Audio.sfx.cursor(); }

      if (Input.anyConfirm()) {
        const item = bag[state.bagCursor];
        const itemData = ITEMS[item.id];
        Audio.sfx.select();

        if (itemData.type === 'apikey') {
          if (state.isTrainer) {
            showMessage("Can't capture a trainer's agent!", () => {
              state.phase = PHASE.BAG;
            });
          } else {
            // Attempt capture
            const result = tryCapture(state.enemyAgent);
            state.phase = PHASE.CATCH;
            state.catchShakes = 0;
            state.catchSuccess = result.caught;
            state.catchMaxShakes = result.shakes;
            state.animTimer = 0;
            showMessage(`You threw a ${itemData.name}!`, () => {
              doCatchAnimation();
            });
          }
        } else if (itemData.type === 'heal') {
          state.playerAgent.cw = Math.min(state.playerAgent.maxCw, state.playerAgent.cw + itemData.healAmt);
          item.qty--;
          if (item.qty <= 0) bag.splice(state.bagCursor, 1);
          showMessage(`Used ${itemData.name}! Restored context window.`, () => {
            // Enemy gets a free turn
            const enemyMoveIdx = enemyChooseMove();
            const r = applyMove(state.enemyAgent, state.playerAgent, state.enemyAgent.moves[enemyMoveIdx], false);
            showMessage(r.results, () => {
              if (state.playerAgent.cw <= 0) handleFaint(false);
              else { state.phase = PHASE.MENU; state.menuCursor = 0; }
            });
          });
        }
        Input.consume('Enter');
      }
      if (Input.anyCancel()) {
        state.phase = PHASE.MENU;
        Input.consume('Escape');
        Input.consume('x');
      }
      return;
    }

    // Switch agent
    if (state.phase === PHASE.SWITCH) {
      const party = Game.state.party;
      const d = Input.dir();
      if (d === 'up') { state.switchCursor = (state.switchCursor - 1 + party.length) % party.length; Audio.sfx.cursor(); }
      if (d === 'down') { state.switchCursor = (state.switchCursor + 1) % party.length; Audio.sfx.cursor(); }

      if (Input.anyConfirm()) {
        const chosen = party[state.switchCursor];
        if (chosen.cw <= 0) {
          showMessage(`${chosen.nickname} has no context left!`, () => {
            state.phase = PHASE.SWITCH;
          });
        } else if (chosen === state.playerAgent) {
          showMessage(`${chosen.nickname} is already out!`, () => {
            state.phase = PHASE.SWITCH;
          });
        } else {
          Audio.sfx.select();
          state.playerAgent = chosen;
          // Reset stat stages
          state.playerAgent.statStages = { proc: 0, creat: 0, align: 0, robust: 0, speed: 0 };
          showMessage(`Go! ${chosen.nickname}!`, () => {
            // Enemy gets a free turn
            const enemyMoveIdx = enemyChooseMove();
            const r = applyMove(state.enemyAgent, state.playerAgent, state.enemyAgent.moves[enemyMoveIdx], false);
            showMessage(r.results, () => {
              if (state.playerAgent.cw <= 0) handleFaint(false);
              else { state.phase = PHASE.MENU; state.menuCursor = 0; }
            });
          });
        }
        Input.consume('Enter');
      }
      if (Input.anyCancel() && state.playerAgent.cw > 0) {
        state.phase = PHASE.MENU;
        Input.consume('Escape');
      }
      return;
    }

    // Catch animation
    if (state.phase === PHASE.CATCH) {
      // Handled via message callbacks
      return;
    }

    // Learn move selection
    if (state.phase === PHASE.LEARN_MOVE) {
      const d = Input.dir();
      const numOpts = 5; // 4 moves + "Don't learn"
      if (d === 'up') { state.learnMoveCursor = (state.learnMoveCursor - 1 + numOpts) % numOpts; Audio.sfx.cursor(); }
      if (d === 'down') { state.learnMoveCursor = (state.learnMoveCursor + 1) % numOpts; Audio.sfx.cursor(); }

      if (Input.anyConfirm()) {
        Audio.sfx.select();
        const agent = state.playerAgent;
        const moveId = state.learnMoveId;
        const moveData = MOVES[moveId];

        if (state.learnMoveCursor < 4) {
          const oldMove = MOVES[agent.moves[state.learnMoveCursor].id];
          agent.moves[state.learnMoveCursor] = { id: moveId, pp: moveData.pp, maxPp: moveData.pp };
          showMessage([
            `1... 2... 3... Poof!`,
            `${agent.nickname} forgot ${oldMove.name}.`,
            `And learned ${moveData.name}!`,
          ], () => {
            processNextLearnMove(state.learnMoveCallback);
          });
        } else {
          showMessage([`${agent.nickname} did not learn ${moveData.name}.`], () => {
            processNextLearnMove(state.learnMoveCallback);
          });
        }
        Input.consume('Enter');
        Input.consume(' ');
        Input.consume('z');
      }
      if (Input.anyCancel()) {
        const moveData = MOVES[state.learnMoveId];
        showMessage([`${state.playerAgent.nickname} did not learn ${moveData.name}.`], () => {
          processNextLearnMove(state.learnMoveCallback);
        });
        Input.consume('Escape');
        Input.consume('x');
      }
      return;
    }
  }

  function doCatchAnimation() {
    state.animTimer = 0;
    const doShake = (shakeNum) => {
      if (shakeNum > state.catchMaxShakes) {
        if (state.catchSuccess) {
          Audio.sfx.capture();
          const enemyName = state.enemyAgent.nickname;
          showMessage([`Gotcha! ${enemyName} was captured!`], () => {
            // Add to party or box
            const caught = state.enemyAgent;
            caught.isWild = false;
            Game.markDex(caught.species, true);
            caught.status = null;
            caught.statStages = { proc: 0, creat: 0, align: 0, robust: 0, speed: 0 };
            if (Game.state.party.length < 6) {
              Game.state.party.push(caught);
              showMessage(`${enemyName} was added to your team!`, () => {
                // Also award XP for catching
                const xp = Math.floor(getXpYield(caught) * 0.5);
                state.xpToGive = xp;
                showMessage(`${state.playerAgent.nickname} gained ${xp} XP!`, () => {
                  awardXP(xp);
                });
              });
            } else {
              Game.state.box.push(caught);
              showMessage(`${enemyName} was sent to the Server!`, () => {
                endBattle(true);
              });
            }
          });
        } else {
          Audio.sfx.captureFail();
          showMessage(`Oh no! ${state.enemyAgent.nickname} broke free!`, () => {
            // Enemy gets a free turn
            const enemyMoveIdx = enemyChooseMove();
            const r = applyMove(state.enemyAgent, state.playerAgent, state.enemyAgent.moves[enemyMoveIdx], false);
            showMessage(r.results, () => {
              if (state.playerAgent.cw <= 0) handleFaint(false);
              else { state.phase = PHASE.MENU; state.menuCursor = 0; }
            });
          });
        }
        return;
      }
      state.shakeTimer = 0.3;
      state.shakeTarget = 'enemy';
      setTimeout(() => doShake(shakeNum + 1), 600);
    };
    doShake(0);
  }

  function draw(ctx) {
    if (!state) return;

    // Battle background
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Ground platform
    ctx.fillStyle = '#c8c8a0';
    ctx.beginPath();
    ctx.ellipse(180 + state.enemySlideX, 55, 50, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a8a878';
    ctx.beginPath();
    ctx.ellipse(60 + state.playerSlideX, 95, 50, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw enemy agent
    let ex = 152 + state.enemySlideX;
    let ey = 8;
    if (state.shakeTarget === 'enemy' && state.shakeTimer > 0) {
      ex += Math.sin(state.shakeTimer * 40) * 3;
    }
    if (!(state.flashTarget === 'enemy' && state.flashTimer > 0 && Math.sin(state.flashTimer * 30) > 0)) {
      if (state.enemyAgent.cw > 0) {
        renderAgentSprite(ctx, state.enemyAgent.species, ex, ey, 2);
      }
    }

    // Draw player agent
    let px = 20 + state.playerSlideX;
    let py = 50;
    if (state.shakeTarget === 'player' && state.shakeTimer > 0) {
      px += Math.sin(state.shakeTimer * 40) * 3;
    }
    if (!(state.flashTarget === 'player' && state.flashTimer > 0 && Math.sin(state.flashTimer * 30) > 0)) {
      if (state.playerAgent.cw > 0) {
        renderAgentSprite(ctx, state.playerAgent.species, px, py, 2, true);
      }
    }

    // Enemy info box (top left)
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(4, 4, 108, 30);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(4.5, 4.5, 107, 29);

    ctx.fillStyle = '#333';
    ctx.font = '7px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(state.enemyAgent.nickname, 8, 7);
    ctx.fillText('Lv' + state.enemyAgent.level, 90, 7);

    // Enemy CW bar
    ctx.fillStyle = '#555';
    ctx.font = '6px monospace';
    ctx.fillText('CW', 8, 18);
    Screen.drawBar(22, 19, 80, 5, state.enemyAgent.cw / state.enemyAgent.maxCw, 'auto');

    // Status indicator
    if (state.enemyAgent.status) {
      ctx.fillStyle = state.enemyAgent.status === 'poisoned' ? '#a855f7' : '#f59e0b';
      ctx.font = '6px monospace';
      ctx.fillText(state.enemyAgent.status === 'poisoned' ? 'PSN' : 'CNF', 8, 26);
    }

    // Player info box (bottom right)
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(128, 78, 108, 36);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(128.5, 78.5, 107, 35);

    ctx.fillStyle = '#333';
    ctx.font = '7px monospace';
    ctx.fillText(state.playerAgent.nickname, 132, 81);
    ctx.fillText('Lv' + state.playerAgent.level, 212, 81);

    // Player CW bar
    ctx.fillText('CW', 132, 91);
    Screen.drawBar(148, 92, 80, 5, state.playerAgent.cw / state.playerAgent.maxCw, 'auto');

    // CW numbers
    ctx.font = '6px monospace';
    ctx.fillText(`${state.playerAgent.cw}/${state.playerAgent.maxCw}`, 180, 100);

    // XP bar
    Screen.drawBar(132, 108, 100, 3, state.playerAgent.xp / Math.max(1, state.playerAgent.xpToNext), '#6cb4ee');

    // Status indicator
    if (state.playerAgent.status) {
      ctx.fillStyle = state.playerAgent.status === 'poisoned' ? '#a855f7' : '#f59e0b';
      ctx.font = '6px monospace';
      ctx.fillText(state.playerAgent.status === 'poisoned' ? 'PSN' : 'CNF', 132, 100);
    }

    // ═══ PHASE-SPECIFIC UI ═══

    if (state.phase === PHASE.MENU) {
      // Action menu (bottom)
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(0, 120, SCREEN_W, 40);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(0.5, 120.5, SCREEN_W - 1, 39);

      // "What will you do?" text
      ctx.fillStyle = '#333';
      ctx.font = '7px monospace';
      ctx.fillText('What will', 8, 127);
      ctx.fillText(`${state.playerAgent.nickname} do?`, 8, 138);

      // Menu options in 2x2 grid
      const opts = ['FIGHT', 'BAG', 'AGENTS', 'RUN'];
      const menuX = 120;
      for (let i = 0; i < 4; i++) {
        const ox = menuX + (i % 2) * 55;
        const oy = 125 + Math.floor(i / 2) * 14;
        ctx.fillStyle = i === state.menuCursor ? '#333' : '#666';
        if (i === state.menuCursor) ctx.fillText('\u25B6', ox - 8, oy);
        ctx.fillText(opts[i], ox, oy);
      }
    }

    if (state.phase === PHASE.MOVE_SELECT) {
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(0, 120, SCREEN_W, 40);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(0.5, 120.5, SCREEN_W - 1, 39);

      const moves = state.playerAgent.moves;
      for (let i = 0; i < moves.length; i++) {
        const m = MOVES[moves[i].id];
        const ox = 8 + (i % 2) * 110;
        const oy = 125 + Math.floor(i / 2) * 14;

        ctx.fillStyle = i === state.moveCursor ? '#333' : '#888';
        if (i === state.moveCursor) ctx.fillText('\u25B6', ox - 7, oy);
        ctx.font = '7px monospace';
        ctx.fillText(m.name, ox, oy);

        // PP display for selected move
        if (i === state.moveCursor) {
          const typeColor = TYPE_COLORS[m.type] || '#888';
          ctx.fillStyle = typeColor;
          ctx.fillRect(SCREEN_W - 45, 122, 40, 8);
          ctx.fillStyle = '#fff';
          ctx.font = '6px monospace';
          ctx.fillText(m.type.toUpperCase(), SCREEN_W - 43, 123);
          ctx.fillStyle = '#333';
          ctx.fillText(`PP ${moves[i].pp}/${moves[i].maxPp}`, SCREEN_W - 45, 133);
          ctx.fillText(`PWR ${m.power || '--'}`, SCREEN_W - 45, 143);
        }
      }
    }

    if (state.phase === PHASE.BAG) {
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(0, 120, SCREEN_W, 40);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(0.5, 120.5, SCREEN_W - 1, 39);

      const bag = Game.state.bag;
      ctx.fillStyle = '#333';
      ctx.font = '7px monospace';
      for (let i = 0; i < Math.min(3, bag.length); i++) {
        const item = bag[i];
        const itemData = ITEMS[item.id];
        const oy = 125 + i * 11;
        if (i === state.bagCursor) ctx.fillText('\u25B6', 4, oy);
        ctx.fillText(`${itemData.name} x${item.qty}`, 14, oy);
      }
      if (bag.length === 0) {
        ctx.fillText('Bag is empty!', 14, 128);
      }
    }

    if (state.phase === PHASE.SWITCH) {
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(0, 80, SCREEN_W, 80);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(0.5, 80.5, SCREEN_W - 1, 79);

      ctx.fillStyle = '#333';
      ctx.font = '7px monospace';
      ctx.fillText('Choose an agent:', 8, 84);

      const party = Game.state.party;
      for (let i = 0; i < party.length; i++) {
        const a = party[i];
        const oy = 95 + i * 12;
        ctx.fillStyle = a.cw <= 0 ? '#c00' : i === state.switchCursor ? '#333' : '#666';
        if (i === state.switchCursor) ctx.fillText('\u25B6', 4, oy);
        ctx.fillText(`${a.nickname} Lv${a.level}`, 14, oy);
        ctx.fillText(`${a.cw}/${a.maxCw}`, 130, oy);
        Screen.drawBar(175, oy + 1, 50, 4, a.cw / a.maxCw, 'auto');
      }
    }

    // Learn move selection
    if (state.phase === PHASE.LEARN_MOVE) {
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(0, 68, SCREEN_W, 92);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(0.5, 68.5, SCREEN_W - 1, 91);

      const moveData = MOVES[state.learnMoveId];
      ctx.fillStyle = '#333';
      ctx.font = '7px monospace';
      ctx.fillText('Forget which move?', 8, 72);

      const agent = state.playerAgent;
      for (let i = 0; i < 4; i++) {
        const m = MOVES[agent.moves[i].id];
        const oy = 84 + i * 13;
        ctx.fillStyle = i === state.learnMoveCursor ? '#333' : '#888';
        if (i === state.learnMoveCursor) ctx.fillText('\u25B6', 4, oy);
        ctx.font = '7px monospace';
        ctx.fillText(m.name, 14, oy);
        const typeColor = TYPE_COLORS[m.type] || '#888';
        ctx.fillStyle = typeColor;
        ctx.fillRect(120, oy + 1, 30, 6);
        ctx.fillStyle = '#fff';
        ctx.font = '5px monospace';
        ctx.fillText(m.type.toUpperCase(), 122, oy + 1);
        ctx.font = '6px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`PP${agent.moves[i].pp}/${agent.moves[i].maxPp}`, 155, oy);
        ctx.fillText(`PWR${m.power || '--'}`, 200, oy);
      }

      const dontY = 84 + 4 * 13;
      ctx.fillStyle = state.learnMoveCursor === 4 ? '#c00' : '#888';
      ctx.font = '7px monospace';
      if (state.learnMoveCursor === 4) ctx.fillText('\u25B6', 4, dontY);
      ctx.fillText("Don't learn", 14, dontY);

      // New move info bar
      ctx.fillStyle = TYPE_COLORS[moveData.type] || '#888';
      ctx.fillRect(8, 148, SCREEN_W - 16, 9);
      ctx.fillStyle = '#fff';
      ctx.font = '6px monospace';
      ctx.fillText(`NEW: ${moveData.name} | ${moveData.type.toUpperCase()} | PWR:${moveData.power || '--'} | PP:${moveData.pp}`, 12, 149);
    }

    // Message display
    if (state.phase === PHASE.MESSAGE) {
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(0, 120, SCREEN_W, 40);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(0.5, 120.5, SCREEN_W - 1, 39);

      const msg = state.messages[state.msgIndex] || '';
      const displayed = msg.substring(0, state.msgCharIndex);
      ctx.fillStyle = '#333';
      ctx.font = '7px monospace';

      // Word wrap
      const maxW = SCREEN_W - 16;
      const words = displayed.split(' ');
      let line = '';
      let lineY = 127;
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, 8, lineY);
          lineY += 11;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, 8, lineY);

      // Continue indicator
      if (state.msgCharIndex >= msg.length) {
        const blink = Math.sin(Date.now() * 0.008) > 0;
        if (blink) {
          ctx.fillStyle = '#333';
          ctx.fillText('\u25BC', SCREEN_W - 16, 148);
        }
      }
    }
  }

  function isActive() { return state !== null; }

  return { start, update, draw, isActive };
})();
