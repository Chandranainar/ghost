// js/core/particles.js — Particle Effects System

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 500;
  }

  /**
   * Add particle to system
   */
  addParticle(x, y, vx = 0, vy = 0, type = 'dust', lifetime = 2) {
    if (this.particles.length >= this.maxParticles) return;
    
    this.particles.push({
      x, y, vx, vy, type, lifetime,
      age: 0,
      size: type === 'dust' ? 2 + Math.random() * 3 : 1,
      color: this.getParticleColor(type),
      alpha: 1
    });
  }

  /**
   * Add burst of particles
   */
  burstParticles(x, y, count, type = 'dust', spread = 2) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * spread;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      this.addParticle(x, y, vx, vy, type, 1.5 + Math.random());
    }
  }

  /**
   * Update all particles
   */
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.age += dt;
      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Apply physics
      p.vy += 0.5 * dt; // Gravity
      p.vx *= 0.98; // Air resistance
      
      // Update alpha based on age
      p.alpha = 1 - (p.age / p.lifetime);
      
      // Optional: fade at end
      if (p.age > p.lifetime * 0.7) {
        p.alpha *= (p.lifetime - p.age) / (p.lifetime * 0.3);
      }
    }
  }

  /**
   * Render all particles
   */
  render(ctx, cameraX, cameraY, screenW, screenH) {
    for (let p of this.particles) {
      // Screen coordinates
      const screenX = screenW / 2 + (p.x - cameraX);
      const screenY = screenH / 2 + (p.y - cameraY);
      
      // Cull off-screen particles
      if (screenX < -100 || screenX > screenW + 100 ||
          screenY < -100 || screenY > screenH + 100) continue;
      
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Get color for particle type
   */
  getParticleColor(type) {
    switch(type) {
      case 'dust':
        return `rgb(${180 + Math.random() * 30}, ${180 + Math.random() * 30}, ${180 + Math.random() * 30})`;
      case 'mist':
        return `rgba(200, 200, 220, 0.5)`;
      case 'blood':
        return `rgb(${100 + Math.random() * 55}, 0, 0)`;
      case 'ghost':
        return `rgb(${150 + Math.random() * 100}, ${120 + Math.random() * 80}, ${200 + Math.random() * 55})`;
      case 'fire':
        return `rgb(${200 + Math.random() * 55}, ${100 + Math.random() * 100}, 0)`;
      default:
        return `rgb(255, 255, 255)`;
    }
  }

  /**
   * Create dust swirl effect
   */
  createDustSwirl(x, y, intensity = 1) {
    this.burstParticles(x, y, Math.floor(20 * intensity), 'dust', 3);
  }

  /**
   * Create mist effect (atmospheric)
   */
  createMistEffect(x, y, intensity = 1) {
    for (let i = 0; i < Math.floor(15 * intensity); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.addParticle(
        x + Math.cos(angle) * 20,
        y + Math.sin(angle) * 20,
        Math.cos(angle) * speed * 0.5,
        Math.sin(angle) * speed * 0.5,
        'mist',
        2 + Math.random() * 2
      );
    }
  }

  /**
   * Create explosion effect
   */
  createExplosion(x, y, type = 'fire') {
    this.burstParticles(x, y, Math.floor(40), type, 4);
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
  }
}

/**
 * Ambient fog layer
 */
export class FogEffect {
  constructor() {
    this.fogOffsets = [];
    this.initialization();
  }

  initialization() {
    for (let i = 0; i < 5; i++) {
      this.fogOffsets.push({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        speed: 0.1 + Math.random() * 0.2,
        opacity: 0.1 + Math.random() * 0.2
      });
    }
  }

  update(dt) {
    for (let fog of this.fogOffsets) {
      fog.x += fog.speed * dt * 10;
      if (fog.x > 2000) fog.x = 0;
    }
  }

  render(ctx, W, H, fearLevel) {
    const opacity = 0.1 + (fearLevel / 100) * 0.2;
    
    for (let fog of this.fogOffsets) {
      ctx.save();
      ctx.globalAlpha = opacity * fog.opacity;
      
      // Create gradient fog
      const gradient = ctx.createLinearGradient(fog.x - 500, 0, fog.x + 500, 0);
      gradient.addColorStop(0, 'rgba(100, 100, 120, 0)');
      gradient.addColorStop(0.5, 'rgba(100, 100, 120, 1)');
      gradient.addColorStop(1, 'rgba(100, 100, 120, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(fog.x - 500, 0, 1000, H);
      
      ctx.restore();
    }
  }
}
