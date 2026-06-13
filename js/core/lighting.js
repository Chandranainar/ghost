// js/core/lighting.js — Dynamic Lighting & Atmospheric Effects System

export class LightingEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.lightSources = [];
    this.globalBrightness = 0.6;
    this.timeOfNight = 0; // 0-1, used for day/night cycle
  }

  /**
   * Add a dynamic light source to the scene
   */
  addLightSource(x, y, intensity, color = '#fff8dc', radius = 250) {
    this.lightSources.push({
      x, y, intensity, color, radius,
      flicker: 0,
      flickerSpeed: Math.random() * 0.05 + 0.02
    });
  }

  /**
   * Remove light source at index
   */
  removeLightSource(index) {
    this.lightSources.splice(index, 1);
  }

  /**
   * Update flicker animation for candles/torches
   */
  updateLighting() {
    for (let light of this.lightSources) {
      light.flicker += light.flickerSpeed;
      if (light.flicker > 1) light.flicker = 0;
    }
  }

  /**
   * Render lantern light on canvas
   * Called after main scene render
   */
  renderLanternLight(playerX, playerY, lanternBrightness) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    // Lantern position is center-bottom of screen
    const lanternScreenX = canvas.width / 2;
    const lanternScreenY = canvas.height * 0.75;
    const lightRadius = 200 * lanternBrightness;
    
    // Create radial gradient for light falloff
    const gradient = ctx.createRadialGradient(
      lanternScreenX, lanternScreenY, 0,
      lanternScreenX, lanternScreenY, lightRadius
    );
    
    const intensity = lanternBrightness * 0.5;
    gradient.addColorStop(0, `rgba(255, 200, 100, ${intensity * 0.8})`);
    gradient.addColorStop(0.4, `rgba(255, 180, 80, ${intensity * 0.4})`);
    gradient.addColorStop(0.7, `rgba(255, 140, 60, ${intensity * 0.1})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(
      lanternScreenX - lightRadius,
      lanternScreenY - lightRadius,
      lightRadius * 2,
      lightRadius * 2
    );
    ctx.restore();
  }

  /**
   * Apply atmosphere overlay based on fear level
   */
  renderAtmosphereOverlay(fearLevel) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    ctx.save();
    
    // Vignette effect (darkened edges when scared)
    const vignetteOpacity = (fearLevel / 100) * 0.6;
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, 
      Math.hypot(canvas.width, canvas.height) * 0.7
    );
    gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteOpacity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Color shift towards red/purple when scared
    if (fearLevel > 30) {
      const tint = (fearLevel - 30) / 70;
      ctx.fillStyle = `rgba(180, 50, 100, ${tint * 0.15})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.restore();
  }

  /**
   * Apply motion blur effect
   */
  renderMotionBlur(blurIntensity) {
    if (blurIntensity < 0.01) return;
    
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    // Create motion trails by drawing semi-transparent rectangles
    ctx.save();
    ctx.globalAlpha = blurIntensity * 0.15;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  /**
   * Apply chromatic aberration effect (color separation)
   * Used for heightened fear/tension
   */
  renderChromaticAberration(intensity) {
    if (intensity < 0.01) return;
    
    const ctx = this.ctx;
    const canvas = this.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const shift = Math.floor(intensity * 4);
    
    // This would require pixel manipulation - simplified for performance
    // In production, use GPU shaders for this
    ctx.save();
    ctx.globalAlpha = intensity * 0.3;
    ctx.fillStyle = `rgba(255, 0, 100, 0.2)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  /**
   * Create breathing effect - subtle zoom for immersion
   */
  getBreathingScale(breathingIntensity) {
    const breathCycle = Math.sin(Date.now() * 0.003 * breathingIntensity) * 0.02;
    return 1.0 + breathCycle;
  }

  /**
   * Screen flash effect for jump scares
   */
  renderFlash(flashIntensity) {
    if (flashIntensity < 0.01) return;
    
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    ctx.save();
    ctx.globalAlpha = flashIntensity * 0.6;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  /**
   * Film grain effect for retro horror feel
   */
  renderFilmGrain(intensity) {
    if (intensity < 0.01) return;
    
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    ctx.save();
    ctx.globalAlpha = intensity * 0.3;
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2;
      const gray = Math.random() * 100;
      
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(x, y, size, size);
    }
    
    ctx.restore();
  }

  /**
   * Time-based atmospheric changes
   */
  setTimeOfNight(time) {
    this.timeOfNight = time; // 0-1 range
    
    // Gradually shift colors towards dawn (warmer)
    if (time > 0.8) {
      const warmth = (time - 0.8) / 0.2;
      this.globalBrightness = 0.4 + warmth * 0.4;
    }
  }
}
