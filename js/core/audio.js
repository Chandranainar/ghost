// js/core/audio.js — Procedural Web Audio Engine

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this._ambient = null;
    this._heartbeatTimer = 0;
    this._footstepTimer  = 0;
    this._breathTimer    = 0;
    this.roomMood = 'entrance';
  }

  init() {
    if (this.ready) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.ctx.destination);
      this.ready = true;
      this._startAmbient();
    } catch(e) {
      console.warn('Web Audio not available', e);
    }
  }

  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  // ---- Master volume ----
  setVolume(v) { if (this.masterGain) this.masterGain.gain.value = v; }

  setRoomMood(roomId = 'entrance') {
    this.roomMood = roomId;
    if (!this._ambient) return;
    const roomTones = {
      entrance: 105,
      library: 82,
      dining: 96,
      kitchen: 145,
      childroom: 132,
      garden: 170,
      attic: 68,
      basement: 58,
      bedroom: 74,
    };
    const target = roomTones[roomId] || 100;
    const t = this.ctx.currentTime;
    this._ambient.filter.frequency.cancelScheduledValues(t);
    this._ambient.filter.frequency.linearRampToValueAtTime(target, t + 1.2);
  }

  // ---- Ambient drone ----
  _startAmbient() {
    if (!this.ready || this._ambient) return;
    const ctx = this.ctx;

    // Low drone oscillators
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = 55;
    o2.type = 'triangle'; o2.frequency.value = 55.6;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 120;

    const gainNode = ctx.createGain(); gainNode.gain.value = 0.06;
    o1.connect(filter); o2.connect(filter);
    filter.connect(gainNode); gainNode.connect(this.masterGain);
    o1.start(); o2.start();

    // Wind noise loop
    const bufSize = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 300; wf.Q.value = 3;
    const wg = ctx.createGain(); wg.gain.value = 0.018;
    noise.connect(wf); wf.connect(wg); wg.connect(this.masterGain);
    noise.start();

    // Slowly sweep wind
    const sweep = () => {
      if (!this.ready) return;
      const t = ctx.currentTime;
      const f = 150 + Math.random() * 500;
      const g = 0.008 + Math.random() * 0.02;
      const dur = 3 + Math.random() * 5;
      wf.frequency.linearRampToValueAtTime(f, t + dur);
      wg.gain.linearRampToValueAtTime(g, t + dur);
      setTimeout(sweep, dur * 1000);
    };
    sweep();

    this._ambient = { o1, o2, filter, gainNode, noise, wf, wg };
  }

  setAmbientFear(fearLevel) {
    if (!this._ambient) return;
    // Increase drone intensity with fear
    const intensity = fearLevel / 100;
    this._ambient.gainNode.gain.value = 0.04 + intensity * 0.12;
    this._ambient.filter.frequency.value = 100 + intensity * 200;
  }

  // ---- Footsteps ----
  playFootstep(surface = 'wood', running = false) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const vol = running ? 0.35 : 0.18;
    const now = ctx.currentTime;

    if (surface === 'wood') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(80, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      o.connect(g); g.connect(this.masterGain);
      o.start(now); o.stop(now + 0.13);
      // occasional creak
      if (Math.random() < 0.3) {
        const cr = ctx.createOscillator();
        const cg = ctx.createGain();
        const cf = ctx.createBiquadFilter();
        cr.type = 'sawtooth'; cr.frequency.setValueAtTime(400, now);
        cr.frequency.linearRampToValueAtTime(580, now + 0.2);
        cf.type = 'bandpass'; cf.frequency.value = 1200; cf.Q.value = 3;
        cg.gain.setValueAtTime(0.02, now); cg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        cr.connect(cf); cf.connect(cg); cg.connect(this.masterGain);
        cr.start(now); cr.stop(now + 0.2);
      }
    } else if (surface === 'stone' || surface === 'metal') {
      const bufSize = Math.floor(ctx.sampleRate * 0.08);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random()*2-1) * (1 - i/bufSize);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 400;
      const g = ctx.createGain(); g.gain.value = vol * 1.2;
      src.connect(f); f.connect(g); g.connect(this.masterGain);
      src.start(now);
    } else if (surface === 'grass') {
      const bufSize = Math.floor(ctx.sampleRate * 0.12);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random()*2-1) * (1 - i/bufSize);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = 1.4;
      const g = ctx.createGain(); g.gain.value = vol * 0.75;
      src.connect(f); f.connect(g); g.connect(this.masterGain);
      src.start(now);
    }
  }

  // ---- Heartbeat ----
  playHeartbeat(fearLevel) {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const intens = fearLevel / 100;
    const vol = 0.15 + intens * 0.45;

    const beat = (t, freq) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(this.masterGain);
      o.start(t); o.stop(t + 0.2);
    };
    beat(now, 58); beat(now + 0.2, 50);
  }

  // ---- Ghost sounds ----
  playGhostWhisper() {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 20;
    f.frequency.setValueAtTime(300, now);
    f.frequency.exponentialRampToValueAtTime(3000, now + 0.8);
    f.frequency.exponentialRampToValueAtTime(200, now + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now); g.gain.linearRampToValueAtTime(0.14, now + 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
    // Panning
    const panner = ctx.createStereoPanner();
    panner.pan.value = (Math.random() * 2 - 1) * 0.8;
    src.connect(f); f.connect(g); g.connect(panner); panner.connect(this.masterGain);
    src.start(now); src.stop(now + 1.9);
  }

  playGhostShriek() {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const d = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i*2/255-1; curve[i] = (Math.PI+300)*x/(Math.PI+300*Math.abs(x)); }
    d.curve = curve;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, now);
    o.frequency.exponentialRampToValueAtTime(900, now + 0.3);
    o.frequency.exponentialRampToValueAtTime(120, now + 1.2);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.3, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    o.connect(d); d.connect(g); g.connect(this.masterGain);
    o.start(now); o.stop(now + 1.2);
  }

  playGhostChase() {
    // Repeated heavy thudding + distortion ambience
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 60;
    g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    o.connect(g); g.connect(this.masterGain);
    o.start(now); o.stop(now + 0.4);
  }

  playRoomStinger(roomId = this.roomMood) {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const profiles = {
      entrance:  [82, 0.06, 0.8],
      library:   [180, 0.035, 0.7],
      dining:    [110, 0.05, 0.9],
      kitchen:   [520, 0.035, 0.35],
      childroom: [660, 0.035, 1.1],
      garden:    [260, 0.04, 0.65],
      attic:     [70, 0.075, 1.4],
      basement:  [54, 0.075, 1.1],
      bedroom:   [92, 0.055, 0.85],
    };
    const [freq, vol, dur] = profiles[roomId] || profiles.entrance;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = roomId === 'kitchen' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(24, freq * 0.62), now + dur);
    f.type = 'bandpass';
    f.frequency.value = freq * 2.2;
    f.Q.value = 2.4;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(f); f.connect(g); g.connect(this.masterGain);
    o.start(now); o.stop(now + dur + 0.05);
  }

  playUISound(kind = 'select') {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const map = {
      select: [420, 0.025, 0.08],
      confirm: [620, 0.04, 0.16],
      deny: [120, 0.04, 0.18],
      relief: [220, 0.03, 0.35],
      journal: [520, 0.03, 0.22],
    };
    const [freq, vol, dur] = map[kind] || map.select;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(freq * 0.75, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g); g.connect(this.masterGain);
    o.start(now); o.stop(now + dur);
  }

  // ---- Door creak ----
  playDoorCreak() {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(130, now); o.frequency.linearRampToValueAtTime(320, now+0.6); o.frequency.linearRampToValueAtTime(110, now+1.4);
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
    g.gain.setValueAtTime(0.05, now); g.gain.linearRampToValueAtTime(0.09, now+0.5); g.gain.exponentialRampToValueAtTime(0.001, now+1.5);
    o.connect(f); f.connect(g); g.connect(this.masterGain);
    o.start(now); o.stop(now+1.5);
  }

  // ---- Item pickup ----
  playPickup() {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.08, now + i*0.07); g.gain.exponentialRampToValueAtTime(0.001, now + i*0.07 + 0.25);
      o.connect(g); g.connect(this.masterGain);
      o.start(now + i*0.07); o.stop(now + i*0.07 + 0.28);
    });
  }

  // ---- Puzzle solve ----
  playPuzzleSolve() {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.1, now + i*0.1); g.gain.exponentialRampToValueAtTime(0.001, now + i*0.1 + 0.5);
      o.connect(g); g.connect(this.masterGain);
      o.start(now + i*0.1); o.stop(now + i*0.1 + 0.6);
    });
  }

  // ---- Lantern freeze ----
  playFreeze() {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1200, now); o.frequency.linearRampToValueAtTime(400, now + 0.6);
    g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.6);
    o.connect(g); g.connect(this.masterGain);
    o.start(now); o.stop(now+0.6);
  }

  // ---- Breathing ----
  playBreath(type = 'normal') {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    let vol = 0.035;
    let duration = 0.5;
    let pitch = 300;
    let qValue = 1.5;

    if (type === 'heavy' || type === true) {
      vol = 0.12;
      duration = 0.7;
      pitch = 220;
      qValue = 1.0;
    } else if (type === 'moderate') {
      vol = 0.065;
      duration = 0.6;
      pitch = 260;
      qValue = 1.2;
    }

    const bufSize = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random()*2-1) * Math.sin(Math.PI * i/bufSize);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = pitch; f.Q.value = qValue;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.masterGain);
    src.start(now);
  }

  // ---- Ritual / victory ----
  playRitual() {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    [110, 165, 220, 330, 440, 660].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, now + i*0.3);
      g.gain.linearRampToValueAtTime(0.12, now + i*0.3 + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, now + i*0.3 + 2.5);
      o.connect(g); g.connect(this.masterGain);
      o.start(now + i*0.3); o.stop(now + i*0.3 + 2.8);
    });
  }

  playDeath() {
    if (!this.ready) return;
    const ctx = this.ctx; const now = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(120, now);
    o.frequency.exponentialRampToValueAtTime(30, now + 2);
    g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now+2);
    o.connect(g); g.connect(this.masterGain);
    o.start(now); o.stop(now+2);
  }
}

export const Audio = new AudioEngine();
