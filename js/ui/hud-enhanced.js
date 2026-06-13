// js/ui/hud-enhanced.js — Enhanced HUD with Glass Morphism Effects

export class EnhancedHUD {
  constructor() {
    this.glassEffect = true;
    this.animationPhase = 0;
  }

  /**
   * Render enhanced bar with glass effect
   */
  renderGlassBar(ctx, x, y, width, height, fillPercent, color, label) {
    ctx.save();
    
    // Background panel with blur effect
    ctx.fillStyle = 'rgba(20, 20, 30, 0.6)';
    ctx.fillRect(x, y, width, height);
    
    // Border with glow
    ctx.strokeStyle = `rgba(100, 100, 150, 0.8)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Fill bar
    const fillWidth = (width - 4) * (fillPercent / 100);
    const gradient = ctx.createLinearGradient(x + 2, y, x + width - 2, y);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, this.brightenColor(color, 1.3));
    gradient.addColorStop(1, color);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x + 2, y + 2, fillWidth, height - 4);
    
    // Inner glow line
    ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2);
    ctx.lineTo(x + fillWidth, y + 2);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#ddd';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 6, y + 14);
    
    ctx.restore();
  }

  /**
   * Render inventory slot with enhancement
   */
  renderInventorySlot(ctx, x, y, size, item, isSelected) {
    ctx.save();
    
    // Background
    ctx.fillStyle = isSelected ? 'rgba(100, 150, 255, 0.3)' : 'rgba(20, 20, 30, 0.5)';
    ctx.fillRect(x, y, size, size);
    
    // Border
    ctx.strokeStyle = isSelected ? 'rgba(100, 200, 255, 1)' : 'rgba(80, 100, 150, 0.8)';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.strokeRect(x, y, size, size);
    
    // Glow if selected
    if (isSelected) {
      ctx.shadowColor = 'rgba(100, 200, 255, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    // Item icon (represented as emoji or symbol)
    if (item) {
      ctx.fillStyle = '#fff';
      ctx.font = `${size * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon || '?', x + size / 2, y + size / 2);
    }
    
    ctx.restore();
  }

  /**
   * Render objective panel with glass effect
   */
  renderObjectivePanel(ctx, x, y, width, height, objectives, progress) {
    ctx.save();
    
    // Semi-transparent dark background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
    ctx.fillRect(x, y, width, height);
    
    // Colored border
    const borderColors = ['#8b0000', '#dc143c', '#6a0dad'];
    ctx.strokeStyle = borderColors[progress % borderColors.length];
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('OBJECTIVES', x + 8, y + 18);
    
    // Progress indicator
    const progressWidth = 100;
    const fillWidth = progressWidth * (progress / objectives.length);
    ctx.fillStyle = 'rgba(50, 50, 70, 0.8)';
    ctx.fillRect(x + 8, y + 24, progressWidth, 6);
    ctx.fillStyle = `hsl(${progress * 120 / objectives.length}, 80%, 50%)`;
    ctx.fillRect(x + 8, y + 24, fillWidth, 6);
    
    // Objectives text
    let textY = y + 45;
    for (let i = 0; i < objectives.length && i < 3; i++) {
      const obj = objectives[i];
      const isDone = i < progress;
      ctx.fillStyle = isDone ? 'rgba(100, 200, 100, 1)' : 'rgba(150, 150, 150, 0.7)';
      ctx.font = '11px monospace';
      ctx.fillText((isDone ? '✓ ' : '○ ') + obj, x + 12, textY);
      textY += 18;
    }
    
    ctx.restore();
  }

  /**
   * Render threat indicator (ghost proximity)
   */
  renderThreatIndicator(ctx, x, y, threatLevel, ghostDistance) {
    ctx.save();
    
    // Arc background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.stroke();
    
    // Threat arc
    const threatColor = this.getThreatColor(threatLevel);
    ctx.strokeStyle = threatColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 48, -Math.PI / 2, -Math.PI / 2 + (threatLevel / 100 * Math.PI * 2));
    ctx.stroke();
    
    // Center text
    ctx.fillStyle = threatColor;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠', x, y);
    
    // Distance label
    ctx.fillStyle = '#aaa';
    ctx.font = '9px monospace';
    ctx.fillText(`${Math.round(ghostDistance / 64)}m`, x, y + 62);
    
    ctx.restore();
  }

  /**
   * Get threat color based on level
   */
  getThreatColor(level) {
    if (level < 20) return 'rgba(100, 200, 100, 1)';
    if (level < 50) return 'rgba(255, 200, 0, 1)';
    if (level < 80) return 'rgba(255, 100, 0, 1)';
    return 'rgba(255, 0, 0, 1)';
  }

  /**
   * Brighten color (for highlights)
   */
  brightenColor(color, factor = 1.2) {
    // Parse rgb values and multiply
    const match = color.match(/\d+/g);
    if (!match || match.length < 3) return color;
    
    const r = Math.min(255, Math.floor(match[0] * factor));
    const g = Math.min(255, Math.floor(match[1] * factor));
    const b = Math.min(255, Math.floor(match[2] * factor));
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Render scanlines effect
   */
  renderScanlines(ctx, W, H, opacity = 0.1) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 3) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Render CRT shader effect
   */
  renderCRTEffect(ctx, W, H, intensity = 0.2) {
    ctx.save();
    ctx.globalAlpha = intensity;
    
    // Vertical scanlines
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    
    // Horizontal vignette
    const gradient = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.hypot(W, H) / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    
    ctx.restore();
  }
}

export const enhancedHUD = new EnhancedHUD();
