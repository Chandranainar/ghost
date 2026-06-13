// js/core/sprite-animator.js — Sprite Animation System

export class SpriteAnimator {
  constructor() {
    this.sprites = {};
    this.animationFrames = {};
  }

  /**
   * Register animation sequence
   */
  registerAnimation(spriteId, frames, fps = 12) {
    this.animationFrames[spriteId] = {
      frames,
      fps,
      duration: frames.length / fps,
      currentFrame: 0,
      elapsed: 0,
      playing: true,
      loop: true
    };
  }

  /**
   * Update animation state
   */
  update(spriteId, dt) {
    if (!this.animationFrames[spriteId]) return null;
    
    const anim = this.animationFrames[spriteId];
    if (!anim.playing) return anim.frames[anim.currentFrame];
    
    anim.elapsed += dt;
    const frameTime = 1 / anim.fps;
    
    if (anim.elapsed >= frameTime) {
      anim.currentFrame++;
      anim.elapsed = 0;
      
      if (anim.currentFrame >= anim.frames.length) {
        if (anim.loop) {
          anim.currentFrame = 0;
        } else {
          anim.playing = false;
          anim.currentFrame = anim.frames.length - 1;
        }
      }
    }
    
    return anim.frames[anim.currentFrame];
  }

  /**
   * Get current frame for rendering
   */
  getFrame(spriteId) {
    const anim = this.animationFrames[spriteId];
    if (!anim) return null;
    return anim.frames[anim.currentFrame];
  }

  /**
   * Play animation
   */
  play(spriteId, loop = true) {
    if (this.animationFrames[spriteId]) {
      this.animationFrames[spriteId].playing = true;
      this.animationFrames[spriteId].loop = loop;
      this.animationFrames[spriteId].currentFrame = 0;
      this.animationFrames[spriteId].elapsed = 0;
    }
  }

  /**
   * Stop animation
   */
  stop(spriteId) {
    if (this.animationFrames[spriteId]) {
      this.animationFrames[spriteId].playing = false;
    }
  }

  /**
   * Restart animation
   */
  restart(spriteId) {
    if (this.animationFrames[spriteId]) {
      this.animationFrames[spriteId].currentFrame = 0;
      this.animationFrames[spriteId].elapsed = 0;
      this.animationFrames[spriteId].playing = true;
    }
  }
}

/**
 * Ghost sprite renderer with animation
 */
export class GhostSprite {
  constructor(animator, ghostType = 'cyrus') {
    this.animator = animator;
    this.type = ghostType;
    this.x = 0;
    this.y = 0;
    this.width = 64;
    this.height = 96;
    this.alpha = 0.8;
    this.scale = 1;
    
    this.setupAnimations();
  }

  setupAnimations() {
    // Setup different animations based on ghost type
    if (this.type === 'cyrus') {
      // Cyrus Blackwood - main ghost
      this.animator.registerAnimation('cyrus_idle', [
        { x: 0, y: 0, w: 64, h: 96 },
        { x: 64, y: 0, w: 64, h: 96 },
        { x: 128, y: 0, w: 64, h: 96 },
        { x: 64, y: 0, w: 64, h: 96 }
      ], 8);
      
      this.animator.registerAnimation('cyrus_chase', [
        { x: 0, y: 96, w: 64, h: 96 },
        { x: 64, y: 96, w: 64, h: 96 },
        { x: 128, y: 96, w: 64, h: 96 },
        { x: 64, y: 96, w: 64, h: 96 }
      ], 16);
    } else if (this.type === 'specter') {
      // Invisible specter
      this.animator.registerAnimation('specter_idle', [
        { x: 0, y: 192, w: 48, h: 96 },
        { x: 48, y: 192, w: 48, h: 96 },
        { x: 96, y: 192, w: 48, h: 96 }
      ], 6);
    } else if (this.type === 'poltergeist') {
      // Poltergeist/furniture ghost
      this.animator.registerAnimation('poltergeist_active', [
        { x: 0, y: 288, w: 64, h: 64 },
        { x: 64, y: 288, w: 64, h: 64 },
        { x: 128, y: 288, w: 64, h: 64 }
      ], 12);
    }
  }

  render(ctx, x, y, animationState = 'idle') {
    const frame = this.animator.getFrame(`${this.type}_${animationState}`);
    if (!frame) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Ghost glow/distortion effect
    ctx.shadowColor = `rgba(128, 0, 200, 0.8)`;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = Math.sin(Date.now() * 0.003) * 3;
    ctx.shadowOffsetY = Math.cos(Date.now() * 0.003) * 3;
    
    ctx.drawImage(
      this.getGhostSpriteSheet(),
      frame.x, frame.y, frame.w, frame.h,
      x - (frame.w * this.scale) / 2,
      y - frame.h * this.scale,
      frame.w * this.scale,
      frame.h * this.scale
    );
    
    ctx.restore();
  }

  getGhostSpriteSheet() {
    // In production, this would be a loaded image
    // For now, we generate procedural sprites
    return this.generateProceduralSprite();
  }

  generateProceduralSprite() {
    const canvas = new OffscreenCanvas(256, 384);
    const ctx = canvas.getContext('2d');
    
    // Fill with transparency
    ctx.clearRect(0, 0, 256, 384);
    
    if (this.type === 'cyrus') {
      this.drawCyrusSprite(ctx);
    } else if (this.type === 'specter') {
      this.drawSpecterSprite(ctx);
    } else if (this.type === 'poltergeist') {
      this.drawPoltergeistSprite(ctx);
    }
    
    return canvas;
  }

  drawCyrusSprite(ctx) {
    // Draw idle frames (columns 0, 64, 128 at y=0)
    this.drawGhostFrame(ctx, 0, 0, 64, 96, 'solid');     // Frame 1
    this.drawGhostFrame(ctx, 64, 0, 64, 96, 'semi');     // Frame 2
    this.drawGhostFrame(ctx, 128, 0, 64, 96, 'solid');   // Frame 3
    
    // Draw chase frames (columns 0, 64, 128 at y=96)
    this.drawGhostFrame(ctx, 0, 96, 64, 96, 'aggressive');
    this.drawGhostFrame(ctx, 64, 96, 64, 96, 'aggressive');
    this.drawGhostFrame(ctx, 128, 96, 64, 96, 'aggressive');
  }

  drawSpecterSprite(ctx) {
    // Semi-transparent ghostly form
    this.drawGhostFrame(ctx, 0, 192, 48, 96, 'fading');
    this.drawGhostFrame(ctx, 48, 192, 48, 96, 'semi');
    this.drawGhostFrame(ctx, 96, 192, 48, 96, 'fading');
  }

  drawPoltergeistSprite(ctx) {
    // Chaotic, energy-filled form
    this.drawGhostFrame(ctx, 0, 288, 64, 64, 'chaotic');
    this.drawGhostFrame(ctx, 64, 288, 64, 64, 'chaotic');
    this.drawGhostFrame(ctx, 128, 288, 64, 64, 'chaotic');
  }

  drawGhostFrame(ctx, x, y, w, h, style) {
    if (style === 'solid') {
      // Opaque menacing ghost
      ctx.fillStyle = 'rgba(200, 150, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(x + w/2, y);
      ctx.lineTo(x + w, y + h * 0.6);
      ctx.quadraticCurveTo(x + w, y + h, x + w/2, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h * 0.6);
      ctx.lineTo(x + w/2, y);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = 'rgba(255, 0, 0, 1)';
      ctx.beginPath();
      ctx.arc(x + w/3, y + h * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + (2*w)/3, y + h * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
      
    } else if (style === 'semi') {
      // Semi-transparent wavering form
      ctx.fillStyle = 'rgba(150, 100, 200, 0.6)';
      ctx.beginPath();
      ctx.moveTo(x + w/2, y);
      ctx.lineTo(x + w, y + h * 0.6);
      ctx.quadraticCurveTo(x + w, y + h, x + w/2, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h * 0.6);
      ctx.lineTo(x + w/2, y);
      ctx.fill();
      
    } else if (style === 'aggressive') {
      // Twisted, aggressive form
      ctx.fillStyle = 'rgba(255, 100, 100, 0.95)';
      ctx.beginPath();
      ctx.moveTo(x + w/2, y);
      ctx.lineTo(x + w, y + h * 0.5);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + h * 0.5);
      ctx.closePath();
      ctx.fill();
      
      // Angry eyes
      ctx.fillStyle = 'rgba(255, 200, 0, 1)';
      ctx.fillRect(x + w/3 - 3, y + h * 0.35 - 2, 6, 8);
      ctx.fillRect(x + (2*w)/3 - 3, y + h * 0.35 - 2, 6, 8);
      
    } else if (style === 'fading') {
      // Barely visible specter
      ctx.fillStyle = 'rgba(100, 150, 200, 0.3)';
      ctx.beginPath();
      ctx.moveTo(x + w/2, y);
      ctx.lineTo(x + w, y + h * 0.6);
      ctx.quadraticCurveTo(x + w, y + h, x + w/2, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h * 0.6);
      ctx.lineTo(x + w/2, y);
      ctx.fill();
      
    } else if (style === 'chaotic') {
      // Chaotic poltergeist energy
      ctx.fillStyle = 'rgba(200, 100, 255, 0.7)';
      // Draw irregular/chaotic shape
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 20 + Math.sin(angle * 3) * 5;
        const px = x + w/2 + Math.cos(angle) * radius;
        const py = y + h/2 + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}
