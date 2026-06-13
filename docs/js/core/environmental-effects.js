// js/core/environmental-effects.js — Weather & Environmental Effects System

export class EnvironmentalEffects {
  constructor() {
    this.currentWeather = 'clear'; // clear | rain | fog | storm
    this.weatherIntensity = 0;
    this.transitionTimer = 0;
    this.windStrength = 0;
    this.lightningFlash = 0;
  }

  /**
   * Update environmental effects
   */
  update(dt) {
    this.transitionTimer += dt;
    
    // Weather transition
    if (this.transitionTimer > 60) {
      this.changeWeather();
      this.transitionTimer = 0;
    }
    
    // Update intensity
    if (this.currentWeather !== 'clear') {
      this.weatherIntensity = Math.min(1, this.weatherIntensity + dt * 0.3);
    } else {
      this.weatherIntensity = Math.max(0, this.weatherIntensity - dt * 0.2);
    }
    
    // Wind simulation
    const time = Date.now() * 0.0003;
    this.windStrength = Math.sin(time) * 0.5 + Math.sin(time * 0.3) * 0.5;
    
    // Lightning effects
    if (this.currentWeather === 'storm') {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 5);
      
      // Random lightning strikes
      if (Math.random() < dt * 0.1) {
        this.lightningFlash = 1;
      }
    }
  }

  /**
   * Change weather randomly
   */
  changeWeather() {
    const weathers = ['clear', 'rain', 'fog', 'storm'];
    this.currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
    this.weatherIntensity = 0;
  }

  /**
   * Render rain effect
   */
  renderRain(ctx, W, H, intensity) {
    const rainDensity = intensity * 200;
    
    ctx.save();
    ctx.strokeStyle = `rgba(200, 200, 220, ${intensity * 0.5})`;
    ctx.lineWidth = 1;
    
    const time = Date.now() * 0.001;
    for (let i = 0; i < rainDensity; i++) {
      const x = (Math.sin(i * 0.1 + time) * W) % W;
      const y = (i + time * 100) % H;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 5);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Render fog effect
   */
  renderFog(ctx, W, H, intensity) {
    ctx.save();
    
    // Multiple fog layers
    for (let layer = 0; layer < 3; layer++) {
      const time = Date.now() * 0.0001 * (layer + 1);
      const offset = Math.sin(time) * 50;
      
      const gradient = ctx.createLinearGradient(offset, 0, offset + W, 0);
      gradient.addColorStop(0, 'rgba(150, 150, 170, 0)');
      gradient.addColorStop(0.5, `rgba(150, 150, 170, ${intensity * (0.1 + layer * 0.05)})`);
      gradient.addColorStop(1, 'rgba(150, 150, 170, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(offset - 50, layer * H / 3, W + 100, H / 3);
    }
    
    ctx.restore();
  }

  /**
   * Render storm effect (dark clouds, lightning)
   */
  renderStorm(ctx, W, H, intensity) {
    ctx.save();
    
    // Dark overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${intensity * 0.3})`;
    ctx.fillRect(0, 0, W, H);
    
    // Lightning flash
    if (this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
    
    // Rain
    this.renderRain(ctx, W, H, intensity);
    
    ctx.restore();
  }

  /**
   * Render all environmental effects
   */
  render(ctx, W, H) {
    if (this.weatherIntensity <= 0) return;
    
    switch (this.currentWeather) {
      case 'rain':
        this.renderRain(ctx, W, H, this.weatherIntensity);
        break;
      case 'fog':
        this.renderFog(ctx, W, H, this.weatherIntensity);
        break;
      case 'storm':
        this.renderStorm(ctx, W, H, this.weatherIntensity);
        break;
    }
  }

  /**
   * Get wind audio modulation
   */
  getWindModulation() {
    return {
      volume: Math.abs(this.windStrength),
      frequency: 200 + Math.abs(this.windStrength) * 200
    };
  }

  /**
   * Get audio effect parameters based on weather
   */
  getAudioEffects(baseFrequency = 200) {
    const mod = this.getWindModulation();
    
    return {
      reverberation: this.currentWeather === 'fog' ? 0.8 : 0.3,
      frequency: baseFrequency + mod.frequency * this.weatherIntensity,
      volume: 1 + mod.volume * this.weatherIntensity * 0.3,
      pitch: 1 + Math.sin(Date.now() * 0.0005) * 0.1 * this.weatherIntensity
    };
  }

  /**
   * Get visual distortion based on weather
   */
  getVisualDistortion() {
    if (this.currentWeather === 'storm') {
      return {
        distortion: this.weatherIntensity * 0.05,
        brightness: 1 - this.weatherIntensity * 0.2,
        chromatic: this.weatherIntensity * 0.3
      };
    } else if (this.currentWeather === 'fog') {
      return {
        distortion: this.weatherIntensity * 0.02,
        brightness: 1 - this.weatherIntensity * 0.1,
        chromatic: 0
      };
    } else if (this.currentWeather === 'rain') {
      return {
        distortion: this.weatherIntensity * 0.03,
        brightness: 1 - this.weatherIntensity * 0.15,
        chromatic: this.weatherIntensity * 0.1
      };
    }
    
    return { distortion: 0, brightness: 1, chromatic: 0 };
  }

  /**
   * Force specific weather
   */
  setWeather(weather) {
    this.currentWeather = weather;
    this.weatherIntensity = 0;
    this.transitionTimer = 0;
  }
}

export const environmentalEffects = new EnvironmentalEffects();
