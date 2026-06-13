// js/core/raycaster.js — DDA Raycasting Engine

import { TILE, MAP_W, MAP_H } from '../maps/manor.js';

const FOV       = Math.PI / 2.8;  // ~64°
const HALF_FOV  = FOV / 2;
const WALL_H_SCALE = 1.0;

// Pre-generate wall textures (32×32 pixel patterns per type)
const TEX_SIZE = 64;
const textures  = {};

function generateTextures() {
  const types = {
    1: drawStone,
    2: drawWood,
    3: drawBookshelf,
    4: drawRitual,
  };
  for (const [type, fn] of Object.entries(types)) {
    const offscreen = new OffscreenCanvas(TEX_SIZE, TEX_SIZE);
    const c = offscreen.getContext('2d');
    fn(c, TEX_SIZE);
    textures[type] = c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  }
}

function drawStone(ctx, s) {
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,s,s);
  const rng = mulberry32(0x12345678);
  for (let y = 0; y < s; y += 8) {
    const offset = (Math.floor(y/8) % 2) * 16;
    for (let x = -offset; x < s; x += 32) {
      ctx.strokeStyle = `rgba(0,0,0,${0.4 + rng()*0.3})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x+1, y+1, 30, 7);
      const brightness = 20 + rng()*15;
      ctx.fillStyle = `rgb(${brightness},${brightness-2},${brightness-2})`;
      ctx.fillRect(x+2, y+2, 28, 5);
    }
  }
  // noise overlay
  for (let i = 0; i < 80; i++) {
    const px = rng()*s; const py = rng()*s;
    const v = rng()*8-4;
    ctx.fillStyle = `rgba(${v>0?255:0},${v>0?255:0},${v>0?255:0},0.04)`;
    ctx.fillRect(px, py, 2, 2);
  }
}

function drawWood(ctx, s) {
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0,0,s,s);
  const rng = mulberry32(0xABCDEF12);
  for (let y = 0; y < s; y++) {
    const v = 30 + Math.sin(y*0.3 + rng()*0.5)*8 + rng()*4;
    ctx.strokeStyle = `rgb(${v},${v*0.6|0},${v*0.3|0})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
  }
}

function drawBookshelf(ctx, s) {
  ctx.fillStyle = '#100808'; ctx.fillRect(0,0,s,s);
  const rng = mulberry32(0xDEADBEEF);
  const bookColors = ['#8b0000','#004080','#005500','#604000','#500050','#444','#600020'];
  const bw = 8, bh = s;
  for (let x = 0; x < s; x += bw) {
    const col = bookColors[Math.floor(rng()*bookColors.length)];
    const brightness = 0.6 + rng()*0.4;
    ctx.fillStyle = col; ctx.fillRect(x+1, 2, bw-2, bh-4);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x+1, 2, 2, bh-4);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x+bw-3, 2, 2, bh-4);
    // spine highlight
    ctx.fillStyle = `rgba(255,255,255,${0.04*brightness})`;
    ctx.fillRect(x+3, 4, bw-6, bh-8);
  }
  // shelf lines
  ctx.fillStyle = '#1a0a00';
  ctx.fillRect(0, 0, s, 2);
  ctx.fillRect(0, s-2, s, 2);
}

function drawRitual(ctx, s) {
  ctx.fillStyle = '#050010'; ctx.fillRect(0,0,s,s);
  const rng = mulberry32(0x9999AAAA);
  for (let i = 0; i < 30; i++) {
    const x = rng()*s; const y = rng()*s;
    const v = 30 + rng()*20;
    ctx.fillStyle = `rgba(${v},0,${v*2},0.4)`;
    ctx.fillRect(x, y, 3, 3);
  }
  // Ritual symbols
  ctx.strokeStyle = 'rgba(128,0,200,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const cx = s/2, cy = (i+0.5)*(s/3);
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI*2/5 - Math.PI/2;
      if (j === 0) ctx.moveTo(cx + Math.cos(a)*8, cy + Math.sin(a)*8);
      else ctx.lineTo(cx + Math.cos(a)*8, cy + Math.sin(a)*8);
    }
    ctx.closePath(); ctx.stroke();
  }
}

// Simple seeded RNG
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---- Main Raycaster ----
export class Raycaster {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W      = canvas.width;
    this.H      = canvas.height;
    // Render at half resolution for performance, then scale up 2x
    this.RW     = Math.ceil(this.W / 2);
    this.RH     = Math.ceil(this.H / 2);
    this.offscreen = new OffscreenCanvas(this.RW, this.RH);
    this.offCtx    = this.offscreen.getContext('2d');
    this.zBuffer   = new Float64Array(this.RW);
    generateTextures();
  }

  // Returns pixel column color from texture
  _getTexelColor(texData, tx, ty) {
    const idx = ((ty & (TEX_SIZE-1)) * TEX_SIZE + (tx & (TEX_SIZE-1))) * 4;
    return [texData.data[idx], texData.data[idx+1], texData.data[idx+2]];
  }

  render(map, player, ghostVisible, ghostX, ghostY, sprites, fearLevel) {
    // Render at half resolution for performance
    const ctx = this.offCtx;
    const W = this.RW, H = this.RH;
    const px = player.x, py = player.y;
    const angle = player.angle;
    const imgData = ctx.createImageData(W, H);
    const buf = imgData.data;

    // Dynamic FOV
    const fov = player.fov || Math.PI / 2.8;
    const halfFov = fov / 2;

    // Lighting: darkness based on lantern
    const lanternStrength = player.lantern / player.maxLantern;
    const ambientLight = 0.04 + (lanternStrength * 0.4);  // very dark without lantern

    // ---- Ceiling & Floor (per-pixel) ----
    const halfH = H >> 1;
    const rayDirL_X = Math.cos(angle - halfFov);
    const rayDirL_Y = Math.sin(angle - halfFov);
    const rayDirR_X = Math.cos(angle + halfFov);
    const rayDirR_Y = Math.sin(angle + halfFov);

    for (let y = 0; y < H; y++) {
      if (y === halfH) continue;
      const isCeiling = y < halfH;
      const rowDir    = y - halfH;           // positive = floor side
      const absRow    = isCeiling ? halfH - y : y - halfH;
      const rowDist   = H / (2.0 * absRow);

      const floorStepX = rowDist * (rayDirR_X - rayDirL_X) / W;
      const floorStepY = rowDist * (rayDirR_Y - rayDirL_Y) / W;
      let   floorX     = px / TILE + rowDist * rayDirL_X;
      let   floorY     = py / TILE + rowDist * rayDirL_Y;

      for (let x = 0; x < W; x++) {
        const tileX = Math.floor(floorX) & (TEX_SIZE-1);
        const tileY = Math.floor(floorY) & (TEX_SIZE-1);

        // Simple distance-based shading
        const dist    = rowDist;
        const shade   = Math.min(1, ambientLight + (1 / (1 + dist * 0.08)));
        const idx     = (y * W + x) * 4;

        if (isCeiling) {
          // Dark ceiling with slight purple tint
          const v = Math.floor(14 * shade);
          buf[idx]   = v;
          buf[idx+1] = Math.floor(v * 0.6);
          buf[idx+2] = Math.floor(v * 0.9);
          buf[idx+3] = 255;
        } else {
          // Stone floor with subtle pattern
          const fp   = ((tileX ^ tileY) & 8) ? 0.9 : 1.0;
          const v    = Math.floor(22 * shade * fp);
          buf[idx]   = v;
          buf[idx+1] = Math.floor(v * 0.85);
          buf[idx+2] = Math.floor(v * 0.75);
          buf[idx+3] = 255;
        }
        floorX += floorStepX;
        floorY += floorStepY;
      }
    }

    // ---- Wall casting (DDA) ----
    for (let col = 0; col < W; col++) {
      const rayAngle = angle - halfFov + (col / W) * fov;
      const rdx = Math.cos(rayAngle);
      const rdy = Math.sin(rayAngle);

      let mapX = Math.floor(px / TILE);
      let mapY = Math.floor(py / TILE);

      const deltaX = Math.abs(1 / (rdx || 0.00001));
      const deltaY = Math.abs(1 / (rdy || 0.00001));

      let stepX, stepY, sideX, sideY;
      if (rdx < 0) { stepX = -1; sideX = (px/TILE - mapX) * deltaX; }
      else          { stepX =  1; sideX = (mapX + 1 - px/TILE) * deltaX; }
      if (rdy < 0) { stepY = -1; sideY = (py/TILE - mapY) * deltaY; }
      else          { stepY =  1; sideY = (mapY + 1 - py/TILE) * deltaY; }

      let hit = 0, side = 0, wallType = 0;
      let iter = 0;
      while (!hit && iter++ < 64) {
        if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
        else                { sideY += deltaY; mapY += stepY; side = 1; }
        if (mapX >= 0 && mapX < MAP_W && mapY >= 0 && mapY < MAP_H) {
          wallType = map[mapY][mapX];
          if (wallType > 0) hit = 1;
        } else { hit = 1; wallType = 1; }
      }

      const perpDist = side === 0
        ? (mapX - px/TILE + (1 - stepX)/2) / (rdx || 0.00001)
        : (mapY - py/TILE + (1 - stepY)/2) / (rdy || 0.00001);

      this.zBuffer[col] = perpDist;

      // Wall height
      const wallH = Math.min(H * 4, Math.floor(H / (perpDist * WALL_H_SCALE + 0.001)));
      const drawStart = Math.max(0, Math.floor((H - wallH) / 2));
      const drawEnd   = Math.min(H - 1, Math.floor((H + wallH) / 2));

      // Texture X coordinate
      let wallX;
      if (side === 0) wallX = py/TILE + perpDist * rdy;
      else            wallX = px/TILE + perpDist * rdx;
      wallX -= Math.floor(wallX);
      let texX = Math.floor(wallX * TEX_SIZE);
      if (side === 0 && rdx > 0) texX = TEX_SIZE - texX - 1;
      if (side === 1 && rdy < 0) texX = TEX_SIZE - texX - 1;

      // Lighting: lantern falloff
      const dist2 = perpDist * TILE;
      const lightFalloff = Math.min(1, (lanternStrength * 280) / (dist2 * dist2 * 0.002 + 1));
      const sideShade  = side === 1 ? 0.7 : 1.0;
      const brightness = Math.max(0.02, Math.min(1, lightFalloff * sideShade));

      const texData = textures[wallType] || textures[1];

      for (let y = drawStart; y <= drawEnd; y++) {
        const texY = Math.floor(((y - drawStart) / (drawEnd - drawStart + 1)) * TEX_SIZE);
        const [r, g, b] = this._getTexelColor(texData, texX, texY);
        const idx = (y * W + col) * 4;
        buf[idx]   = Math.floor(r * brightness);
        buf[idx+1] = Math.floor(g * brightness);
        buf[idx+2] = Math.floor(b * brightness);
        buf[idx+3] = 255;
      }
    }

    // ---- Sprites (items, ghost) ----
    const sortedSprites = sprites
      .map(s => ({ ...s, dist: ((s.x - px)**2 + (s.y - py)**2) }))
      .sort((a, b) => b.dist - a.dist);

    for (const sp of sortedSprites) {
      const spDx = sp.x - px;
      const spDy = sp.y - py;
      const spDist = Math.sqrt(spDx*spDx + spDy*spDy);
      if (spDist < 1) continue;

      const spAngle = Math.atan2(spDy, spDx) - angle;
      let normAngle = spAngle;
      while (normAngle >  Math.PI) normAngle -= Math.PI*2;
      while (normAngle < -Math.PI) normAngle += Math.PI*2;

      if (Math.abs(normAngle) > halfFov + 0.2) continue;

      const spScreenX = Math.floor((0.5 + normAngle / fov) * W);
      const spH = Math.min(H * 2, Math.floor(H / (spDist / TILE * 0.85)));
      const spW = spH;

      const startX = Math.max(0, spScreenX - spW/2);
      const endX   = Math.min(W-1, spScreenX + spW/2);
      const startY = Math.max(0, Math.floor((H - spH)/2));
      const endY   = Math.min(H-1, Math.floor((H + spH)/2));

      const spBrightness = Math.min(1, lanternStrength * 300 / (spDist + 1));

      for (let sx = Math.floor(startX); sx <= Math.floor(endX); sx++) {
        if (this.zBuffer[sx] < spDist / TILE) continue;

        for (let sy = startY; sy <= endY; sy++) {
          const texU = Math.floor(((sx - (spScreenX - spW/2)) / spW) * TEX_SIZE);
          const texV = Math.floor(((sy - startY) / spH) * TEX_SIZE);

          const pixel = this._drawSpritePixel(sp.type, texU, texV, spDist, sp.anim, sp.state);
          if (!pixel) continue;
          const idx = (sy * W + sx) * 4;
          buf[idx]   = Math.floor(pixel[0] * Math.max(0.1, spBrightness));
          buf[idx+1] = Math.floor(pixel[1] * Math.max(0.1, spBrightness));
          buf[idx+2] = Math.floor(pixel[2] * Math.max(0.1, spBrightness));
          buf[idx+3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    // Scale the half-res render up to full canvas size
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.offscreen, 0, 0, this.W, this.H);
  }

  _drawSpritePixel(type, u, v, dist, anim = 0, state = '') {
    // Returns [r,g,b] or null (transparent)
    const nh = v / TEX_SIZE;  // 0-1 normalized height
    const nw = u / TEX_SIZE;  // 0-1 normalized width

    switch (type) {
      case 'ghost': return this._ghostPixel(nw, nh, anim, state);
      case 'shard': return this._shardPixel(nw, nh, anim);
      case 'item':  return this._itemPixel(nw, nh);
      case 'hiding':return this._hidingPixel(nw, nh);
      case 'puzzle':return this._puzzlePixel(nw, nh, anim);
      default:      return null;
    }
  }

  _ghostPixel(u, v, anim, state = '') {
    // Ghost: white/blue translucent humanoid shape
    const cx = 0.5;
    // Body ellipse
    const bodyR = ((u-cx)**2 / 0.09) + ((v-0.6)**2 / 0.16);
    // Head circle
    const headR = ((u-cx)**2 / 0.04) + ((v-0.2)**2 / 0.04);
    // Wispy bottom
    const wispY = v > 0.75;
    const wispPat = wispY && Math.sin((u*8+anim*3)*Math.PI) > 0.3;

    if (headR < 1) {
      const glowEdge = headR > 0.8 ? 0.4 : 1.0;
      const flicker = 0.8 + Math.sin(anim*7 + u*4)*0.2;
      if (state === 'chase') return [Math.floor(230 * glowEdge * flicker), Math.floor(70 * glowEdge), Math.floor(90 * glowEdge)];
      if (state === 'stunned') return [Math.floor(80 * glowEdge), Math.floor(230 * glowEdge * flicker), Math.floor(255 * glowEdge * flicker)];
      if (state === 'retreat') return [Math.floor(90 * glowEdge), Math.floor(70 * glowEdge), Math.floor(140 * glowEdge * flicker)];
      return [
        Math.floor(160 * glowEdge * flicker),
        Math.floor(180 * glowEdge * flicker),
        Math.floor(220 * glowEdge * flicker)
      ];
    }
    if (bodyR < 1) {
      const edge = bodyR > 0.8 ? 0.3 : 0.85;
      const flicker = 0.7 + Math.sin(anim*5 + v*3)*0.3;
      if (state === 'chase') return [Math.floor(180*edge*flicker), Math.floor(35*edge), Math.floor(60*edge)];
      if (state === 'stunned') return [Math.floor(45*edge), Math.floor(170*edge*flicker), Math.floor(210*edge*flicker)];
      if (state === 'retreat') return [Math.floor(60*edge), Math.floor(45*edge), Math.floor(120*edge*flicker)];
      return [Math.floor(100*edge*flicker), Math.floor(120*edge*flicker), Math.floor(180*edge*flicker)];
    }
    if (wispPat) {
      const fade = (v - 0.75) / 0.25;
      const alpha = Math.max(0, 1 - fade*2);
      if (alpha < 0.1) return null;
      return [Math.floor(60*alpha), Math.floor(80*alpha), Math.floor(140*alpha)];
    }
    return null;  // transparent
  }

  _shardPixel(u, v, anim) {
    // Diamond shard — cyan/blue gem
    const cx = 0.5, cy = 0.5;
    const dx = Math.abs(u - cx), dy = Math.abs(v - cy);
    const halo = dx + dy < 0.46;
    if (halo && dx + dy >= 0.35) {
      const pulse = Math.sin(anim * 5) * 0.5 + 0.5;
      return [10, Math.floor(80 + pulse * 70), Math.floor(90 + pulse * 80)];
    }
    if (dx + dy < 0.35) {
      const rim = (dx + dy) / 0.35;
      const sparkle = Math.sin(anim * 4 + u * 10 + v * 8) * 0.5 + 0.5;
      const r = Math.floor(20  + rim * 40);
      const g = Math.floor(200 + sparkle * 55);
      const b = Math.floor(220 + sparkle * 35);
      return [r, g, b];
    }
    return null;
  }

  _itemPixel(u, v) {
    // Generic item: warm glint on a small base
    const cx = 0.5, cy = 0.5;
    const base = v > 0.62 && Math.abs(u - cx) < 0.22;
    const d = ((u-cx)**2 + (v-0.42)**2);
    if (base) return [70, 50, 28];
    if (d < 0.055) {
      const edge = d / 0.055;
      return [Math.floor(230 - edge*70), Math.floor(190 - edge*50), Math.floor(70)];
    }
    return null;
  }

  _hidingPixel(u, v) {
    // Wardrobe: dark brown rectangle with handles
    if (v < 0.05 || v > 0.95 || u < 0.05 || u > 0.95) {
      return [30, 15, 5];  // frame
    }
    const handleL = Math.abs(u-0.3) < 0.04 && Math.abs(v-0.5) < 0.08;
    const handleR = Math.abs(u-0.7) < 0.04 && Math.abs(v-0.5) < 0.08;
    if (handleL || handleR) return [180, 140, 30];
    const centerLine = Math.abs(u-0.5) < 0.015;
    if (centerLine) return [20, 10, 3];
    const plank = Math.floor(u * 5) % 2 === 0 ? 8 : 0;
    return [55 + plank, 30 + plank, 10];
  }

  _puzzlePixel(u, v, anim) {
    // Puzzle marker: pulsing rune
    const cx = 0.5, cy = 0.5;
    const d = Math.sqrt((u-cx)**2 + (v-cy)**2);
    const ring = Math.abs(d - 0.35) < 0.04;
    const inner = d < 0.15;
    const pulse = 0.5 + Math.sin(anim*3)*0.5;
    const vertical = Math.abs(u - 0.5) < 0.025 && v > 0.12 && v < 0.88;
    const horizontal = Math.abs(v - 0.5) < 0.025 && u > 0.12 && u < 0.88;
    if (ring || vertical || horizontal) return [Math.floor(120*pulse), 10, Math.floor(220*pulse)];
    if (inner) return [Math.floor(70*pulse), 0, Math.floor(140*pulse)];
    return null;
  }
}
