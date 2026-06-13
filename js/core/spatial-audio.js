// js/core/spatial-audio.js — 3D Spatial Audio System with Panning & Distance Attenuation

export class SpatialAudioSystem {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.panNode = null;
    this.distanceGain = null;
    this.initSpatialNodes();
  }

  initSpatialNodes() {
    if (!this.audioEngine.ready) return;
    const ctx = this.audioEngine.ctx;
    
    // Create a stereo panner for left/right positioning
    this.panNode = ctx.createStereoPanner?.() || null;
    
    // Create separate gain for distance-based volume
    this.distanceGain = ctx.createGain();
    this.distanceGain.gain.value = 1.0;
  }

  /**
   * Play a sound from a specific world position
   * Pans and attenuates based on player position
   */
  playFromPosition(soundType, sourceX, sourceY, playerX, playerY, playerAngle) {
    if (!this.audioEngine.ready) return;

    const dx = sourceX - playerX;
    const dy = sourceY - playerY;
    const distance = Math.hypot(dx, dy);
    
    // Calculate angle relative to player's view direction
    let sourceAngle = Math.atan2(dy, dx);
    let relativeAngle = sourceAngle - playerAngle;
    
    // Normalize angle to [-π, π]
    while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
    while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;
    
    // Pan: -1 (left) to 1 (right)
    const pan = Math.sin(relativeAngle);
    
    // Volume attenuation based on distance (max 500 world units)
    const maxDistance = 500;
    const volume = Math.max(0, 1 - (distance / maxDistance));
    
    // Play with spatial parameters
    this.playWithSpatialParams(soundType, pan, volume);
  }

  playWithSpatialParams(soundType, pan, volume) {
    const ctx = this.audioEngine.ctx;
    
    switch(soundType) {
      case 'ghostWhisper':
        this.playGhostWhisperSpatial(pan, volume);
        break;
      case 'ghostMoan':
        this.playGhostMoanSpatial(pan, volume);
        break;
      case 'ghostRoar':
        this.playGhostRoarSpatial(pan, volume);
        break;
      case 'footstep':
        this.playFootstepSpatial(pan, volume);
        break;
    }
  }

  playGhostWhisperSpatial(pan, volume) {
    if (!this.audioEngine.ready) return;
    const ctx = this.audioEngine.ctx;
    const now = ctx.currentTime;
    
    // High frequency whisper
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const stereoPanner = ctx.createStereoPanner?.();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000 + Math.random() * 1000, now);
    osc.frequency.linearRampToValueAtTime(1200 + Math.random() * 800, now + 0.6);
    
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    if (stereoPanner) stereoPanner.pan.value = pan;
    
    osc.connect(filter);
    filter.connect(gain);
    if (stereoPanner) {
      gain.connect(stereoPanner);
      stereoPanner.connect(this.audioEngine.masterGain);
    } else {
      gain.connect(this.audioEngine.masterGain);
    }
    
    osc.start(now);
    osc.stop(now + 0.6);
  }

  playGhostMoanSpatial(pan, volume) {
    if (!this.audioEngine.ready) return;
    const ctx = this.audioEngine.ctx;
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const stereoPanner = ctx.createStereoPanner?.();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.linearRampToValueAtTime(120, now + 1.2);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, now);
    osc2.frequency.linearRampToValueAtTime(85, now + 1.2);
    
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    
    if (stereoPanner) stereoPanner.pan.value = pan;
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    if (stereoPanner) {
      gain.connect(stereoPanner);
      stereoPanner.connect(this.audioEngine.masterGain);
    } else {
      gain.connect(this.audioEngine.masterGain);
    }
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
  }

  playGhostRoarSpatial(pan, volume) {
    if (!this.audioEngine.ready) return;
    const ctx = this.audioEngine.ctx;
    const now = ctx.currentTime;
    
    // White noise burst for roar
    const bufSize = Math.floor(ctx.sampleRate * 0.8);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    
    for (let i = 0; i < bufSize; i++) {
      const envelope = 1 - Math.pow(i / bufSize, 1.5);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    
    const src = ctx.createBufferSource();
    src.buffer = buf;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.linearRampToValueAtTime(300, now + 0.4);
    filter.Q.value = 2;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    const stereoPanner = ctx.createStereoPanner?.();
    if (stereoPanner) stereoPanner.pan.value = pan;
    
    src.connect(filter);
    filter.connect(gain);
    if (stereoPanner) {
      gain.connect(stereoPanner);
      stereoPanner.connect(this.audioEngine.masterGain);
    } else {
      gain.connect(this.audioEngine.masterGain);
    }
    
    src.start(now);
  }

  playFootstepSpatial(pan, volume) {
    if (!this.audioEngine.ready) return;
    const ctx = this.audioEngine.ctx;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const stereoPanner = ctx.createStereoPanner?.();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    
    gain.gain.setValueAtTime(volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    if (stereoPanner) stereoPanner.pan.value = pan;
    
    osc.connect(gain);
    if (stereoPanner) {
      gain.connect(stereoPanner);
      stereoPanner.connect(this.audioEngine.masterGain);
    } else {
      gain.connect(this.audioEngine.masterGain);
    }
    
    osc.start(now);
    osc.stop(now + 0.15);
  }
}
