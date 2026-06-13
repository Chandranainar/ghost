// js/core/atmosphere.js — Layered Atmospheric Audio System

export class AtmosphereEngine {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.layers = [];
    this.ambientTracks = [];
    this.currentRoom = 'entrance';
    this.fearLevel = 0;
    this.timeOfNight = 0;
    this.activeElements = [];
    this.activeTimers = [];
  }

  /**
   * Register ambient audio layer
   */
  addAmbientLayer(name, frequency, volume, type = 'drone') {
    this.layers.push({
      name,
      frequency,
      volume,
      type,
      oscillator: null,
      gain: null
    });
  }

  /**
   * Start ambient audio layers
   */
  startAmbient() {
    if (!this.audioEngine.ready) return;
    
    // Add room-specific layers
    this.stopAllAtmosphericElements();
    this.addAtmosphericLayers();
  }

  /**
   * Add room-specific atmospheric layers
   */
  addAtmosphericLayers() {
    if (!this.audioEngine.ready) return;
    
    const ctx = this.audioEngine.ctx;
    
    switch(this.currentRoom) {
      case 'library':
        // Dusty library: low frequency hum, subtle creak
        this.createDustyLibraryAtmosphere(ctx);
        break;
      case 'basement':
        // Damp basement: dripping water, echoes
        this.createDampBasementAtmosphere(ctx);
        break;
      case 'attic':
        // Creaky attic: wind howl, settling sounds
        this.createCreakingAtticAtmosphere(ctx);
        break;
      case 'kitchen':
        // Cold kitchen: subtle metallic sounds, wind
        this.createColdKitchenAtmosphere(ctx);
        break;
      case 'garden':
        this.createWindGardenAtmosphere(ctx);
        break;
      case 'childroom':
        this.createChildRoomAtmosphere(ctx);
        break;
      case 'bedroom':
        this.createBedroomAtmosphere(ctx);
        break;
      default:
        // General atmosphere
        this.createGeneralAtmosphere(ctx);
    }
  }

  createDustyLibraryAtmosphere(ctx) {
    const now = ctx.currentTime;
    
    // Low frequency hum
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.frequency.value = 40;
    hum.type = 'sine';
    humGain.gain.value = 0.04;
    
    hum.connect(humGain);
    humGain.connect(this.audioEngine.masterGain);
    hum.start();
    
    this.activeElements.push({ node: hum, gain: humGain });
    
    // Occasional creak
    this.schedulePeriodicCreak(ctx, 3, 0.02);
  }

  createDampBasementAtmosphere(ctx) {
    const now = ctx.currentTime;
    
    // Water drip sound loop
    this.scheduleDripSounds(ctx, 5, 0.1);
  }

  createCreakingAtticAtmosphere(ctx) {
    // Wind sound base
    const bufSize = ctx.sampleRate * 5;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioEngine.masterGain);
    noise.start();
    
    this.activeElements.push({ node: noise, gain });
  }

  createColdKitchenAtmosphere(ctx) {
    // Subtle metallic buzzing
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.frequency.value = 120;
    osc2.frequency.value = 187; // Metallic ratio
    gain.gain.value = 0.015;
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.audioEngine.masterGain);
    
    osc1.start();
    osc2.start();
    
    this.activeElements.push({ node: osc1, gain });
    this.activeElements.push({ node: osc2, gain });
  }

  createWindGardenAtmosphere(ctx) {
    const bufSize = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    noise.buffer = buf;
    noise.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 220;
    filter.Q.value = 1.2;
    gain.gain.value = 0.035;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioEngine.masterGain);
    noise.start();
    this.activeElements.push({ node: noise, gain, baseGain: gain.gain.value });
  }

  createChildRoomAtmosphere(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 523.25;
    gain.gain.value = 0.012;
    osc.connect(gain);
    gain.connect(this.audioEngine.masterGain);
    osc.start();
    this.activeElements.push({ node: osc, gain, baseGain: gain.gain.value });
  }

  createBedroomAtmosphere(ctx) {
    this.createGeneralAtmosphere(ctx);
    this.schedulePeriodicCreak(ctx, 6, 0.018);
  }

  createGeneralAtmosphere(ctx) {
    // Generic haunted house ambience
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.frequency.value = 55;
    osc.type = 'sine';
    
    filter.type = 'lowpass';
    filter.frequency.value = 80;
    
    gain.gain.value = 0.03;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioEngine.masterGain);
    
    osc.start();
    
    this.activeElements.push({ node: osc, gain });
  }

  /**
   * Update atmosphere based on game state
   */
  updateAtmosphere(fearLevel, timeOfNight, currentRoom) {
    this.fearLevel = fearLevel;
    this.timeOfNight = timeOfNight;
    
    if (currentRoom !== this.currentRoom) {
      this.currentRoom = currentRoom;
      this.stopAllAtmosphericElements();
      this.addAtmosphericLayers();
    }
    
    // Modulate volume based on fear
    this.modulateFearResponse();
  }

  /**
   * Make atmosphere respond to fear
   */
  modulateFearResponse() {
    // Increase overall volume intensity with fear
    const fearIntensity = this.fearLevel / 100;
    
    for (let elem of this.activeElements) {
      if (elem.gain) {
        const base = elem.baseGain ?? elem.gain.gain.value;
        elem.baseGain = base;
        elem.gain.gain.value = base * (1 + fearIntensity * 0.55);
      }
    }
  }

  /**
   * Schedule periodic creak sounds
   */
  schedulePeriodicCreak(ctx, interval, volume) {
    const scheduleCreak = () => {
      if (!this.audioEngine.ready) return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.8);
      
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc.connect(gain);
      gain.connect(this.audioEngine.masterGain);
      
      osc.start(now);
      osc.stop(now + 0.8);
      
      const timer = setTimeout(scheduleCreak, interval * 1000 + Math.random() * 2000);
      this.activeTimers.push(timer);
    };
    
    scheduleCreak();
  }

  /**
   * Schedule periodic drip sounds
   */
  scheduleDripSounds(ctx, interval, volume) {
    const scheduleDrip = () => {
      if (!this.audioEngine.ready) return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      // High frequency initial click
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      
      filter.type = 'highpass';
      filter.frequency.value = 400;
      
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioEngine.masterGain);
      
      osc.start(now);
      osc.stop(now + 0.3);
      
      const timer = setTimeout(scheduleDrip, interval * 1000 + Math.random() * 3000);
      this.activeTimers.push(timer);
    };
    
    scheduleDrip();
  }

  /**
   * Stop all atmospheric elements
   */
  stopAllAtmosphericElements() {
    for (const timer of this.activeTimers) clearTimeout(timer);
    this.activeTimers = [];
    for (let elem of this.activeElements) {
      try {
        if (elem.node?.stop) elem.node.stop();
        if (elem.gain?.disconnect) elem.gain.disconnect();
      } catch (e) {
        // Already stopped
      }
    }
    this.activeElements = [];
  }

  /**
   * Stop atmosphere completely
   */
  stop() {
    this.stopAllAtmosphericElements();
  }
}
