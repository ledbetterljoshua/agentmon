// ═══════════════════════════════════════════════════════════
// AgentMon: Inference Red — Core Engine
// ═══════════════════════════════════════════════════════════

const SCREEN_W = 240;
const SCREEN_H = 160;
const SCALE = 3;

// ═══════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════

const Input = (() => {
  const keys = {};
  const justPressed = {};
  const prevKeys = {};

  function init() {
    window.addEventListener('keydown', e => {
      e.preventDefault();
      keys[e.key] = true;
      justPressed[e.key] = true;
    });
    window.addEventListener('keyup', e => {
      keys[e.key] = false;
    });
  }

  function update() {
    for (const k in justPressed) justPressed[k] = false;
  }

  // Mark a key press as consumed so it won't fire again until re-pressed
  function consume(key) {
    justPressed[key] = false;
    keys[key] = false;
  }

  function isDown(key) { return !!keys[key]; }
  function isJustPressed(key) { return !!justPressed[key]; }

  function anyConfirm() {
    return isJustPressed('Enter') || isJustPressed(' ') || isJustPressed('z');
  }
  function anyCancel() {
    return isJustPressed('Escape') || isJustPressed('x') || isJustPressed('Backspace');
  }
  function dir() {
    if (isJustPressed('ArrowUp') || isJustPressed('w')) return 'up';
    if (isJustPressed('ArrowDown') || isJustPressed('s')) return 'down';
    if (isJustPressed('ArrowLeft') || isJustPressed('a')) return 'left';
    if (isJustPressed('ArrowRight') || isJustPressed('d')) return 'right';
    return null;
  }
  function heldDir() {
    if (isDown('ArrowUp') || isDown('w')) return 'up';
    if (isDown('ArrowDown') || isDown('s')) return 'down';
    if (isDown('ArrowLeft') || isDown('a')) return 'left';
    if (isDown('ArrowRight') || isDown('d')) return 'right';
    return null;
  }

  return { init, update, isDown, isJustPressed, anyConfirm, anyCancel, dir, heldDir, consume };
})();

// ═══════════════════════════════════════════════════════════
// SCREEN / CANVAS
// ═══════════════════════════════════════════════════════════

const Screen = (() => {
  let canvas, ctx;

  function init() {
    canvas = document.getElementById('game');
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    canvas.style.width = (SCREEN_W * SCALE) + 'px';
    canvas.style.height = (SCREEN_H * SCALE) + 'px';
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  function clear(color = '#1a1a2e') {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  function getCtx() { return ctx; }

  // Simple pixel font (4x6 per character)
  function drawText(text, x, y, color = '#fff', size = 1) {
    ctx.fillStyle = color;
    ctx.font = `${8 * size}px monospace`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
  }

  // Draw text with a background box
  function drawTextBox(text, x, y, w, h, opts = {}) {
    const { bgColor = '#1a1a2e', borderColor = '#fff', textColor = '#fff', padding = 4 } = opts;
    // Box
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // Inner border
    ctx.strokeStyle = borderColor + '66';
    ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    // Text
    ctx.fillStyle = textColor;
    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';
    // Word wrap
    const maxW = w - padding * 2;
    const words = text.split(' ');
    let line = '';
    let lineY = y + padding;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x + padding, lineY);
        lineY += 10;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x + padding, lineY);
  }

  // Draw an HP-style bar
  function drawBar(x, y, w, h, ratio, color = '#4caf50', bgColor = '#333') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);
    const barColor = ratio > 0.5 ? '#4caf50' : ratio > 0.2 ? '#ffc107' : '#f44336';
    ctx.fillStyle = color === 'auto' ? barColor : color;
    ctx.fillRect(x, y, Math.max(0, w * ratio), h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // Screen transitions
  let transitionState = null;

  function startTransition(type, duration, callback) {
    transitionState = { type, duration, elapsed: 0, callback, done: false };
  }

  function updateTransition(dt) {
    if (!transitionState || transitionState.done) return false;
    transitionState.elapsed += dt;
    const t = Math.min(1, transitionState.elapsed / transitionState.duration);

    if (transitionState.type === 'fadeOut') {
      ctx.fillStyle = `rgba(0,0,0,${t})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    } else if (transitionState.type === 'fadeIn') {
      ctx.fillStyle = `rgba(0,0,0,${1 - t})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    } else if (transitionState.type === 'battleWipe') {
      // Horizontal wipe bars
      const numBars = 8;
      const barH = SCREEN_H / numBars;
      for (let i = 0; i < numBars; i++) {
        const barW = SCREEN_W * t;
        const bx = i % 2 === 0 ? 0 : SCREEN_W - barW;
        ctx.fillStyle = '#000';
        ctx.fillRect(bx, i * barH, barW, barH);
      }
    }

    if (t >= 1) {
      transitionState.done = true;
      if (transitionState.callback) transitionState.callback();
      return false;
    }
    return true;
  }

  function isTransitioning() {
    return transitionState && !transitionState.done;
  }

  return { init, clear, getCtx, drawText, drawTextBox, drawBar, startTransition, updateTransition, isTransitioning };
})();

// ═══════════════════════════════════════════════════════════
// DIALOG SYSTEM
// ═══════════════════════════════════════════════════════════

const Dialog = (() => {
  let active = false;
  let messages = [];
  let currentMsg = 0;
  let charIndex = 0;
  let charTimer = 0;
  const CHAR_SPEED = 0.02; // seconds per character
  let callback = null;
  let blipCounter = 0;

  function show(msgs, onComplete) {
    messages = Array.isArray(msgs) ? msgs : [msgs];
    currentMsg = 0;
    charIndex = 0;
    charTimer = 0;
    active = true;
    callback = onComplete || null;
  }

  function update(dt) {
    if (!active) return;

    charTimer += dt;
    const msg = messages[currentMsg];
    if (charIndex < msg.length) {
      while (charTimer >= CHAR_SPEED && charIndex < msg.length) {
        charTimer -= CHAR_SPEED;
        charIndex++;
        blipCounter++;
        if (blipCounter % 3 === 0) Audio.sfx.textBlip();
      }
    }

    if (Input.anyConfirm()) {
      if (charIndex < msg.length) {
        // Skip to end of message
        charIndex = msg.length;
      } else {
        // Next message
        currentMsg++;
        if (currentMsg >= messages.length) {
          active = false;
          if (callback) callback();
        } else {
          charIndex = 0;
          charTimer = 0;
        }
      }
      Input.consume('Enter');
      Input.consume(' ');
      Input.consume('z');
    }
  }

  function draw(ctx) {
    if (!active) return;
    const boxH = 40;
    const boxY = SCREEN_H - boxH - 4;
    // Dialog box background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(4, boxY, SCREEN_W - 8, boxH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(4.5, boxY + 0.5, SCREEN_W - 9, boxH - 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(6.5, boxY + 2.5, SCREEN_W - 13, boxH - 5);

    // Text
    const msg = messages[currentMsg];
    const displayed = msg.substring(0, charIndex);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';

    // Word wrap within dialog box
    const maxW = SCREEN_W - 24;
    const words = displayed.split(' ');
    let line = '';
    let lineY = boxY + 6;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, 12, lineY);
        lineY += 10;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 12, lineY);

    // Continue indicator
    if (charIndex >= msg.length) {
      const blink = Math.sin(Date.now() * 0.008) > 0;
      if (blink) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(SCREEN_W - 16, boxY + boxH - 10, 6, 3);
        ctx.fillRect(SCREEN_W - 15, boxY + boxH - 8, 4, 2);
      }
    }
  }

  function isActive() { return active; }

  return { show, update, draw, isActive };
})();

// ═══════════════════════════════════════════════════════════
// MENU SYSTEM
// ═══════════════════════════════════════════════════════════

const Menu = (() => {
  let active = false;
  let options = [];
  let cursor = 0;
  let callback = null;
  let x = 0, y = 0, w = 0;

  function show(opts, px, py, pw, onSelect) {
    options = opts;
    cursor = 0;
    x = px; y = py; w = pw;
    active = true;
    callback = onSelect;
  }

  function update() {
    if (!active) return;
    const d = Input.dir();
    if (d === 'up') { cursor = (cursor - 1 + options.length) % options.length; Audio.sfx.cursor(); }
    if (d === 'down') { cursor = (cursor + 1) % options.length; Audio.sfx.cursor(); }
    if (Input.anyConfirm()) {
      active = false;
      Audio.sfx.select();
      if (callback) callback(cursor, options[cursor]);
    }
    if (Input.anyCancel()) {
      active = false;
      if (callback) callback(-1, null);
    }
  }

  function draw(ctx) {
    if (!active) return;
    const h = options.length * 14 + 8;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';
    for (let i = 0; i < options.length; i++) {
      const oy = y + 6 + i * 14;
      if (i === cursor) {
        ctx.fillStyle = '#fff';
        ctx.fillText('\u25B6', x + 4, oy);
      }
      ctx.fillStyle = i === cursor ? '#fff' : '#aaa';
      ctx.fillText(options[i], x + 14, oy);
    }
  }

  function isActive() { return active; }
  function getCursor() { return cursor; }

  return { show, update, draw, isActive, getCursor };
})();
