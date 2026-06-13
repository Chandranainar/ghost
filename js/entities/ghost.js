// js/entities/ghost.js — Ghost AI (State Machine)
// States: patrol | investigate | chase | stunned | retreat

import { State, emitNoise } from '../core/state.js';
import { Audio } from '../core/audio.js';
import { TILE, MAP_W, MAP_H, getGhostPatrol } from '../maps/manor.js';
import { damagePlayer } from './player.js';

const PATROL_SPEED     = 1.2;
const INVESTIGATE_SPEED= 2.0;
const CHASE_SPEED      = 3.2;
const RETREAT_SPEED    = 1.8;

const LOS_RANGE      = 7 * TILE;   // line-of-sight range
const HEAR_RANGE_MAX = 6 * TILE;   // max noise detection
const ATTACK_RANGE   =  TILE * 0.6;// touch distance
const CHASE_TIMEOUT  = 8;          // secs before giving up chase
const LOSE_TIMEOUT   = 3;

const patrol = getGhostPatrol();
let _animTimer = 0;

export function updateGhost(dt) {
  const g = State.ghost;
  if (!g.active) return;

  _animTimer += dt;
  g.anim = _animTimer;

  const p = State.player;

  // Hiding: ghost won't find player in wardrobe
  if (p.isHiding) {
    if (g.state === 'chase') {
      g.state = 'investigate';
      g.lastHeardX = p.x;
      g.lastHeardY = p.y;
    }
  }

  switch (g.state) {
    case 'patrol':     _patrol(dt, g, p);     break;
    case 'investigate':_investigate(dt, g, p); break;
    case 'chase':      _chase(dt, g, p);      break;
    case 'stunned':    _stunned(dt, g, p);    break;
    case 'retreat':    _retreat(dt, g, p);    break;
  }

  // Process noise events
  for (const ev of State.noiseEvents) {
    const dx = ev.x - g.x, dy = ev.y - g.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < ev.radius && dist < HEAR_RANGE_MAX) {
      if (g.state === 'patrol' || g.state === 'retreat') {
        g.state = 'investigate';
        g.lastHeardX = ev.x;
        g.lastHeardY = ev.y;
      }
    }
  }
  State.noiseEvents = [];

  // Heartbeat scaling with ghost proximity
  const distToPlayer = Math.sqrt((g.x - p.x)**2 + (g.y - p.y)**2);
  updateFear(dt, g, p, distToPlayer);
}

function _patrol(dt, g, p) {
  const target = patrol[g.patrolIndex];
  if (!target) { g.patrolIndex = 0; return; }

  moveToward(g, target.x, target.y, PATROL_SPEED, dt);

  const dx = target.x - g.x, dy = target.y - g.y;
  if (Math.sqrt(dx*dx + dy*dy) < 32) {
    g.patrolWait -= dt;
    if (g.patrolWait <= 0) {
      g.patrolIndex = (g.patrolIndex + 1) % patrol.length;
      g.patrolWait  = 0.5 + Math.random() * 1.5;
    }
  }

  // Check line-of-sight to player
  if (hasLOS(g, p)) {
    g.state = 'chase';
    g.chaseTimer = CHASE_TIMEOUT;
  }

  // Occasional whisper
  if (Math.random() < 0.002) Audio.playGhostWhisper();
}

function _investigate(dt, g, p) {
  moveToward(g, g.lastHeardX, g.lastHeardY, INVESTIGATE_SPEED, dt);

  const dx = g.lastHeardX - g.x, dy = g.lastHeardY - g.y;
  if (Math.sqrt(dx*dx + dy*dy) < 48) {
    // Arrived at noise source — look around then retreat to patrol
    g.state = 'patrol';
    Audio.playGhostWhisper();
  }

  // Check LOS while investigating
  if (hasLOS(g, p)) {
    g.state = 'chase';
    g.chaseTimer = CHASE_TIMEOUT;
  }
}

function _chase(dt, g, p) {
  g.chaseTimer -= dt;
  moveToward(g, p.x, p.y, CHASE_SPEED + Math.min(2, (CHASE_TIMEOUT - g.chaseTimer) * 0.1), dt);

  // Re-check LOS
  if (hasLOS(g, p)) {
    g.chaseTimer = CHASE_TIMEOUT; // keep chasing
    g.lostPlayerTimer = 0;
  } else {
    g.lostPlayerTimer = (g.lostPlayerTimer || 0) + dt;
    if (g.lostPlayerTimer > LOSE_TIMEOUT || g.chaseTimer <= 0) {
      g.state = 'retreat';
      g.retreatTimer = 4;
      g.lostPlayerTimer = 0;
    }
  }

  // Attack player on touch
  const pdx = p.x - g.x, pdy = p.y - g.y;
  const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
  if (pdist < ATTACK_RANGE && !p.isHiding) {
    damagePlayer(35);
    Audio.playGhostShriek();
    // Push ghost back slightly
    g.x -= Math.cos(g.angle) * TILE;
    g.y -= Math.sin(g.angle) * TILE;
  }

  // Chase sound
  if (Math.random() < 0.03) Audio.playGhostChase();
}

function _stunned(dt, g, p) {
  g.stunTimer -= dt;
  if (g.stunTimer <= 0) {
    g.state = 'retreat';
    g.retreatTimer = 5;
  }
}

function _retreat(dt, g, p) {
  g.retreatTimer -= dt;
  // Retreat to a patrol point far from player
  const farPoint = patrol.reduce((best, pt) => {
    const d = (pt.x - p.x)**2 + (pt.y - p.y)**2;
    return d > best.d ? { d, pt } : best;
  }, { d: -Infinity, pt: patrol[0] }).pt;

  moveToward(g, farPoint.x, farPoint.y, RETREAT_SPEED, dt);

  if (g.retreatTimer <= 0) {
    g.state = 'patrol';
    g.patrolIndex = patrol.findIndex(pt =>
      Math.sqrt((pt.x - g.x)**2 + (pt.y - g.y)**2) < TILE * 3
    );
    if (g.patrolIndex < 0) g.patrolIndex = 0;
  }
}

// -- Helpers --

function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x, dy = ty - g.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < 1) return;
  const nx = dx/dist, ny = dy/dist;

  const map = State.map;
  const newX = g.x + nx * speed * dt * TILE;
  const newY = g.y + ny * speed * dt * TILE;

  // Simple collision for ghost (it can pass through some obstacles, just not outer walls)
  if (map) {
    const tx2 = Math.floor(newX / TILE);
    const ty2 = Math.floor(newY / TILE);
    if (tx2 >= 0 && tx2 < MAP_W && ty2 >= 0 && ty2 < MAP_H && (map[ty2][tx2] === 0 || map[ty2][tx2] === 3)) {
      g.x = newX; g.y = newY;
    } else {
      // Try sliding
      const nx2 = g.x + nx * speed * dt * TILE;
      const ny2 = g.y;
      const tnx = Math.floor(nx2/TILE), tny = Math.floor(ny2/TILE);
      if (tnx >= 0 && tnx < MAP_W && tny >= 0 && tny < MAP_H && map[tny][tnx] === 0) g.x = nx2;
      const nx3 = g.x;
      const ny3 = g.y + ny * speed * dt * TILE;
      const tnx3 = Math.floor(nx3/TILE), tny3 = Math.floor(ny3/TILE);
      if (tnx3 >= 0 && tnx3 < MAP_W && tny3 >= 0 && tny3 < MAP_H && map[tny3][tnx3] === 0) g.y = ny3;
    }
  }
  g.angle = Math.atan2(dy, dx);
}

function hasLOS(g, p) {
  const dx = p.x - g.x, dy = p.y - g.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist > LOS_RANGE) return false;
  if (p.isHiding) return false;

  // Raycast from ghost to player
  const steps = Math.ceil(dist / (TILE * 0.25));
  const map = State.map;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const rx = g.x + dx * t;
    const ry = g.y + dy * t;
    const tx = Math.floor(rx / TILE);
    const ty = Math.floor(ry / TILE);
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false;
    const cell = map[ty][tx];
    if (cell === 1 || cell === 2 || cell === 4) return false; // wall blocks LOS
  }
  return true;
}

function updateFear(dt, g, p, distToPlayer) {
  let targetFear = State.fear;
  const inRange = distToPlayer < 5 * TILE;

  if (g.state === 'chase') {
    targetFear = Math.min(100, State.fear + 40 * dt);
  } else if (inRange && g.state !== 'stunned') {
    targetFear = Math.min(100, State.fear + 15 * dt);
  } else {
    targetFear = Math.max(0, State.fear - 8 * dt);
  }
  State.fear = targetFear;

  // Heartbeat
  const now = performance.now();
  const hbInterval = Math.max(0.4, 1.0 - State.fear / 100 * 0.6);
  if ((now / 1000) - (Audio._heartbeatTimer || 0) > hbInterval && State.fear > 20) {
    Audio.playHeartbeat(State.fear);
    Audio._heartbeatTimer = now / 1000;
  }

  // Hallucination whispers at high fear
  if (State.fear > 70 && Math.random() < 0.005) {
    Audio.playGhostWhisper();
  }
}
