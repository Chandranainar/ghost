// js/ui/minimap.js — Minimap Renderer

import { State } from '../core/state.js';
import { TILE, MAP_W, MAP_H, ROOM_DEFS } from '../maps/manor.js';

const MM_SIZE  = 160;
const MM_SCALE = MM_SIZE / MAP_W;  // pixels per map tile

let mmCanvas, mmCtx;

export function initMinimap() {
  mmCanvas = document.getElementById('minimapCanvas');
  mmCtx    = mmCanvas?.getContext('2d');
}

export function renderMinimap() {
  if (!mmCtx || !State.map) return;
  const ctx = mmCtx;
  const s   = MM_SCALE;
  ctx.clearRect(0, 0, MM_SIZE, MM_SIZE);
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, MM_SIZE, MM_SIZE);

  const map = State.map;

  // Draw map tiles
  for (let row = 0; row < MAP_H; row++) {
    for (let col = 0; col < MAP_W; col++) {
      const cell = map[row][col];
      if (cell === 0) {
        // Floor — show only discovered rooms
        const inDiscovered = isInDiscoveredRoom(col, row);
        if (inDiscovered) {
          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(col * s, row * s, s, s);
        }
      } else if (cell > 0) {
        // Wall — only show walls adjacent to discovered rooms
        const inDiscovered = isAdjacentToDiscovered(col, row);
        if (inDiscovered) {
          ctx.fillStyle = cell === 3 ? '#1a0a00' : (cell === 4 ? '#100015' : '#2a2a2a');
          ctx.fillRect(col * s, row * s, s, s);
        }
      }
    }
  }

  // Draw ghost (if visible / close)
  const g = State.ghost;
  const p = State.player;
  const distToGhost = Math.sqrt((g.x - p.x)**2 + (g.y - p.y)**2);
  if (g.active && distToGhost < 8 * TILE) {
    ctx.fillStyle = g.state === 'chase' ? '#ff3333' : 'rgba(80,0,180,0.8)';
    const gx = (g.x / TILE) * s;
    const gy = (g.y / TILE) * s;
    ctx.beginPath();
    ctx.arc(gx, gy, Math.max(2, s * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw player dot + direction
  const px = (p.x / TILE) * s;
  const py = (p.y / TILE) * s;
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(px, py, Math.max(2, s * 0.7), 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator
  ctx.strokeStyle = '#ff8888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.cos(p.angle) * s * 2, py + Math.sin(p.angle) * s * 2);
  ctx.stroke();

  // Draw items
  for (const [id, item] of Object.entries(State.items)) {
    if (item.collected) continue;
    const itemRoom = item.room;
    if (!State.discoveredRooms.has(itemRoom)) continue;
    const ix = (item.wx / TILE) * s;
    const iy = (item.wy / TILE) * s;
    ctx.fillStyle = item.type === 'shard' ? '#00ffcc' : '#ffcc00';
    ctx.fillRect(ix - 1, iy - 1, 3, 3);
  }

  // Room labels for discovered rooms
  ctx.font = `${Math.max(5, s * 0.7)}px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.textAlign = 'center';
  for (const [id, r] of Object.entries(ROOM_DEFS)) {
    if (!State.discoveredRooms.has(id)) continue;
    const cx = (r.x + r.w/2) * s;
    const cy = (r.y + r.h/2) * s;
    ctx.fillText(r.name.split(' ')[0], cx, cy);
  }
}

// Full map overlay
export function renderFullMap(canvasEl) {
  if (!canvasEl || !State.map) return;
  const ctx = canvasEl.getContext('2d');
  const W = canvasEl.width, H = canvasEl.height;
  const sw = W / MAP_W, sh = H / MAP_H;

  ctx.fillStyle = '#050005';
  ctx.fillRect(0, 0, W, H);

  const map = State.map;
  for (let row = 0; row < MAP_H; row++) {
    for (let col = 0; col < MAP_W; col++) {
      const cell = map[row][col];
      const discovered = State.discoveredRooms.has(getRoomForTile(col, row));
      if (cell === 0 && discovered) {
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(col * sw, row * sh, sw, sh);
      } else if (cell > 0 && discovered) {
        ctx.fillStyle = cell === 3 ? '#2a1500' : (cell === 4 ? '#100020' : '#333');
        ctx.fillRect(col * sw, row * sh, sw, sh);
      }
    }
  }

  // Room labels
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [id, r] of Object.entries(ROOM_DEFS)) {
    const disc = State.discoveredRooms.has(id);
    const cx = (r.x + r.w/2) * sw;
    const cy = (r.y + r.h/2) * sh;

    if (disc) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = 'rgba(180,180,200,0.7)';
      ctx.fillText(r.name, cx, cy);
    } else {
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(50,50,60,0.8)';
      ctx.fillText('???', cx, cy);
    }
  }

  // Player
  const px = (State.player.x / TILE) * sw;
  const py = (State.player.y / TILE) * sh;
  ctx.fillStyle = '#ff4444';
  ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('YOU', px, py - 8);
}

function isInDiscoveredRoom(col, row) {
  const id = getRoomForTile(col, row);
  return id && State.discoveredRooms.has(id);
}

function isAdjacentToDiscovered(col, row) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  return dirs.some(([dc, dr]) => isInDiscoveredRoom(col+dc, row+dr));
}

function getRoomForTile(col, row) {
  for (const [id, r] of Object.entries(ROOM_DEFS)) {
    if (col >= r.x && col < r.x + r.w && row >= r.y && row < r.y + r.h) return id;
    // Also include corridor tiles adjacent to rooms
  }
  // Check corridors
  for (const [id, r] of Object.entries(ROOM_DEFS)) {
    const inX = col >= r.x - 2 && col < r.x + r.w + 2;
    const inY = row >= r.y - 2 && row < r.y + r.h + 2;
    if (inX && inY) return id;
  }
  return null;
}
