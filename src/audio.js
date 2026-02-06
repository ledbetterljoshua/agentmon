// ═══════════════════════════════════════════════════════════
// AgentMon: Inference Red — Audio System (Chiptune)
// ═══════════════════════════════════════════════════════════

const Audio = (() => {
  let ctx = null;
  let masterGain = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(ctx.destination);
  }

  function playNote(freq, duration, type = 'square', vol = 0.3) {
    if (!ctx) init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function playSequence(notes, tempo = 120) {
    if (!ctx) init();
    const beatLen = 60 / tempo;
    let time = ctx.currentTime;
    for (const note of notes) {
      if (note.freq > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = note.type || 'square';
        osc.frequency.value = note.freq;
        const dur = (note.dur || 1) * beatLen;
        gain.gain.value = note.vol || 0.2;
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + dur);
      }
      time += (note.dur || 1) * beatLen;
    }
  }

  // Sound effects
  const sfx = {
    select() {
      playNote(880, 0.08, 'square', 0.2);
      setTimeout(() => playNote(1100, 0.1, 'square', 0.2), 50);
    },
    cursor() {
      playNote(660, 0.05, 'square', 0.15);
    },
    hit() {
      // White noise burst for damage
      if (!ctx) init();
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      noise.connect(gain);
      gain.connect(masterGain);
      noise.start();
    },
    superEffective() {
      playNote(523, 0.1, 'square', 0.3);
      setTimeout(() => playNote(659, 0.1, 'square', 0.3), 80);
      setTimeout(() => playNote(784, 0.15, 'square', 0.3), 160);
    },
    notEffective() {
      playNote(330, 0.15, 'triangle', 0.2);
      setTimeout(() => playNote(262, 0.2, 'triangle', 0.2), 100);
    },
    capture() {
      playNote(440, 0.1, 'square', 0.2);
      setTimeout(() => playNote(554, 0.1, 'square', 0.2), 120);
      setTimeout(() => playNote(659, 0.1, 'square', 0.2), 240);
      setTimeout(() => playNote(880, 0.3, 'square', 0.25), 360);
    },
    captureFail() {
      playNote(440, 0.1, 'square', 0.2);
      setTimeout(() => playNote(330, 0.15, 'triangle', 0.2), 100);
      setTimeout(() => playNote(262, 0.2, 'triangle', 0.2), 200);
    },
    levelUp() {
      const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
      notes.forEach((f, i) => {
        setTimeout(() => playNote(f, 0.12, 'square', 0.2), i * 60);
      });
    },
    faint() {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => playNote(400 - i * 40, 0.1, 'square', 0.2), i * 80);
      }
    },
    encounter() {
      playNote(880, 0.05, 'square', 0.3);
      setTimeout(() => playNote(660, 0.05, 'square', 0.3), 40);
      setTimeout(() => playNote(880, 0.05, 'square', 0.3), 80);
      setTimeout(() => playNote(1100, 0.1, 'square', 0.3), 120);
      setTimeout(() => playNote(880, 0.15, 'square', 0.3), 200);
    },
    evolution() {
      const scale = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784, 880, 988, 1047];
      scale.forEach((f, i) => {
        setTimeout(() => playNote(f, 0.15, 'triangle', 0.25), i * 80);
      });
    },
    battleWin() {
      const melody = [523, 659, 784, 1047, 784, 1047];
      melody.forEach((f, i) => {
        setTimeout(() => playNote(f, 0.15, 'square', 0.25), i * 100);
      });
    },
    textBlip() {
      playNote(800 + Math.random() * 200, 0.03, 'square', 0.08);
    },
  };

  // Background music loops
  let bgmInterval = null;
  let bgmPlaying = null;

  const bgm = {
    title() {
      if (bgmPlaying === 'title') return;
      bgm.stop();
      bgmPlaying = 'title';
      const play = () => {
        if (bgmPlaying !== 'title') return;
        playSequence([
          { freq: 262, dur: 0.5 }, { freq: 330, dur: 0.5 }, { freq: 392, dur: 0.5 }, { freq: 523, dur: 1 },
          { freq: 392, dur: 0.5 }, { freq: 330, dur: 0.5 }, { freq: 262, dur: 1 },
          { freq: 0, dur: 0.5 },
          { freq: 294, dur: 0.5 }, { freq: 349, dur: 0.5 }, { freq: 440, dur: 0.5 }, { freq: 587, dur: 1 },
          { freq: 440, dur: 0.5 }, { freq: 349, dur: 0.5 }, { freq: 294, dur: 1 },
        ], 160);
      };
      play();
      bgmInterval = setInterval(play, 4000);
    },
    overworld() {
      if (bgmPlaying === 'overworld') return;
      bgm.stop();
      bgmPlaying = 'overworld';
      const play = () => {
        if (bgmPlaying !== 'overworld') return;
        playSequence([
          { freq: 330, dur: 0.25 }, { freq: 392, dur: 0.25 }, { freq: 440, dur: 0.5 },
          { freq: 523, dur: 0.25 }, { freq: 440, dur: 0.25 }, { freq: 392, dur: 0.5 },
          { freq: 330, dur: 0.25 }, { freq: 294, dur: 0.25 }, { freq: 262, dur: 0.5 },
          { freq: 294, dur: 0.25 }, { freq: 330, dur: 0.25 }, { freq: 392, dur: 0.75 },
          { freq: 0, dur: 0.25 },
        ], 180);
      };
      play();
      bgmInterval = setInterval(play, 2800);
    },
    battle() {
      if (bgmPlaying === 'battle') return;
      bgm.stop();
      bgmPlaying = 'battle';
      const play = () => {
        if (bgmPlaying !== 'battle') return;
        playSequence([
          { freq: 330, dur: 0.25, type: 'sawtooth' }, { freq: 330, dur: 0.25, type: 'sawtooth' },
          { freq: 440, dur: 0.25, type: 'sawtooth' }, { freq: 330, dur: 0.25, type: 'sawtooth' },
          { freq: 523, dur: 0.5, type: 'sawtooth' },
          { freq: 494, dur: 0.25, type: 'sawtooth' }, { freq: 440, dur: 0.25, type: 'sawtooth' },
          { freq: 392, dur: 0.5, type: 'sawtooth' },
          { freq: 349, dur: 0.25, type: 'sawtooth' }, { freq: 330, dur: 0.25, type: 'sawtooth' },
          { freq: 294, dur: 0.25, type: 'sawtooth' }, { freq: 330, dur: 0.25, type: 'sawtooth' },
          { freq: 392, dur: 0.5, type: 'sawtooth' },
          { freq: 440, dur: 0.5, type: 'sawtooth' },
        ], 220);
      };
      play();
      bgmInterval = setInterval(play, 2200);
    },
    stop() {
      bgmPlaying = null;
      if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
    },
  };

  return { init, sfx, bgm };
})();
