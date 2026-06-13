// js/entities/player.js — Player Update Logic

import { State, emitNoise } from '../core/state.js';
import { Keys, consumeMouseDx, isRunning, isFreeze } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { pulseDamage, pulseFocus } from '../core/feedback.js';
import { TILE, MAP_W, MAP_H, getRoomAtPos, getSurfaceAtPos } from '../maps/manor.js';

const MOUSE_SENS   = 0.0022;
const STAMINA_DRAIN = 18;  // per sec while running
const STAMINA_REGEN = 10;
const LANTERN_DRAIN = 2;   // per sec when freeze active
const LANTERN_PASSIVE = 0.3;
const REGEN_DELAY   = 4000;  // ms after damage before health regen
const WALK_ACCEL = 12 * TILE;
const RUN_ACCEL = 16 * TILE;
const FRICTION = 18 * TILE;
const STOP_EPSILON = 2;

export function updatePlayer(dt) {
  const p = State.player;
  if (p.isHiding) {
    p.vx = 0;
    p.vy = 0;
    p.currentSpeed = 0;
    p.moveIntensity = 0;
    p.isMoving = false;
    p.isRunning = false;
    return;
  }

  // --- Mouse turn ---
  const mdx = consumeMouseDx();
  p.angle += mdx * MOUSE_SENS;

  // --- Camera Tilt / Lean ---
  let strafeDir = 0;
  if (Keys['KeyA'] || Keys['ArrowLeft'])  strafeDir -= 1;
  if (Keys['KeyD'] || Keys['ArrowRight']) strafeDir += 1;
  
  const turnLean = -mdx * 0.0035;
  const strafeLean = strafeDir * 0.035;
  p.targetTilt = turnLean + strafeLean;
  p.tiltAngle = approach(p.tiltAngle || 0, p.targetTilt, 3.5 * dt);

  let moveX = 0, moveY = 0;
  if (Keys['KeyW'] || Keys['ArrowUp'])    { moveX += Math.cos(p.angle); moveY += Math.sin(p.angle); }
  if (Keys['KeyS'] || Keys['ArrowDown'])  { moveX -= Math.cos(p.angle); moveY -= Math.sin(p.angle); }
  if (Keys['KeyA'] || Keys['ArrowLeft'])  { moveX += Math.cos(p.angle - Math.PI/2); moveY += Math.sin(p.angle - Math.PI/2); }
  if (Keys['KeyD'] || Keys['ArrowRight']) { moveX += Math.cos(p.angle + Math.PI/2); moveY += Math.sin(p.angle + Math.PI/2); }

  const len = Math.sqrt(moveX*moveX + moveY*moveY);
  const movingInput = len > 0;
  const wantsRun = isRunning() && p.stamina > 0 && !p.exhausted && movingInput;
  const targetSpeed = wantsRun ? p.runSpeed : p.speed;

  if (len > 0) {
    moveX /= len; moveY /= len;
  }

  const targetVx = movingInput ? moveX * targetSpeed * TILE : 0;
  const targetVy = movingInput ? moveY * targetSpeed * TILE : 0;
  const accel = movingInput ? (wantsRun ? RUN_ACCEL : WALK_ACCEL) : FRICTION;

  p.vx = approach(p.vx || 0, targetVx, accel * dt);
  p.vy = approach(p.vy || 0, targetVy, accel * dt);

  if (!movingInput && Math.hypot(p.vx, p.vy) < STOP_EPSILON) {
    p.vx = 0;
    p.vy = 0;
  }

  p.currentSpeed = Math.hypot(p.vx, p.vy) / TILE;
  p.moveIntensity = Math.min(1, p.currentSpeed / p.runSpeed);
  p.isMoving = p.currentSpeed > 0.05;
  p.isRunning = wantsRun && p.currentSpeed > p.speed * 0.75;

  // --- Dynamic FOV Stretching ---
  const BASE_FOV = Math.PI / 2.8;
  let targetFov = BASE_FOV;
  if (p.isRunning) {
    const runFactor = (p.currentSpeed - p.speed) / (p.runSpeed - p.speed || 1);
    const speedRatio = Math.max(0, Math.min(1, runFactor));
    targetFov = BASE_FOV + (Math.PI / 16) * speedRatio;
  }
  p.fov = approach(p.fov || BASE_FOV, targetFov, 1.2 * dt);

  if (p.isMoving) {
    const dx = p.vx * dt;
    const dy = p.vy * dt;

    // Slide collision
    if (canMove(p.x + dx, p.y)) p.x += dx;
    else p.vx = 0;
    if (canMove(p.x, p.y + dy)) p.y += dy;
    else p.vy = 0;

    // Footsteps
    p.footstepTimer -= dt;
    if (p.footstepTimer <= 0) {
      const stride = p.isRunning ? 0.24 : 0.38;
      p.footstepTimer = stride / Math.max(0.7, p.moveIntensity);
      Audio.playFootstep(getSurfaceAtPos(p.x, p.y), p.isRunning);
      // Emit noise event
      const noiseR = p.isRunning ? (5 * TILE) : (2 * TILE);
      emitNoise(p.x, p.y, noiseR);
    }

    p.walkCycle += dt * (p.isRunning ? 12 : 8) * Math.max(0.55, p.moveIntensity);
  } else {
    p.footstepTimer = 0;
  }

  // --- Stamina ---
  if (p.isRunning) {
    p.stamina = Math.max(0, p.stamina - STAMINA_DRAIN * dt);
    if (p.stamina <= 0) {
      p.exhausted = true;
    }
  } else {
    p.stamina = Math.min(p.maxStamina, p.stamina + STAMINA_REGEN * dt);
    if (p.stamina > 20) p.exhausted = false;
  }

  // --- Realistic Stamina-Based Breathing Audio ---
  if (p.isMoving) {
    p.breathTimer = (p.breathTimer || 0) - dt;
    if (p.breathTimer <= 0) {
      const stamFrac = p.stamina / p.maxStamina;
      if (p.exhausted || stamFrac < 0.3) {
        p.breathTimer = 1.3;
        Audio.playBreath('heavy');
      } else if (stamFrac < 0.6) {
        p.breathTimer = 2.0;
        Audio.playBreath('moderate');
      } else {
        p.breathTimer = 0;
      }
    }
  } else {
    p.breathTimer = 0;
  }

  // --- Lantern (passive drain) ---
  if (State.freezeActive) {
    p.lantern = Math.max(0, p.lantern - LANTERN_DRAIN * dt);
  } else {
    p.lantern = Math.max(0, p.lantern - LANTERN_PASSIVE * dt);
  }

  // --- Freeze beam ---
  const wantsFreeze = isFreeze() && p.lantern > 0;
  State.freezeActive = wantsFreeze;
  if (wantsFreeze) {
    const ghost = State.ghost;
    if (ghost.state === 'chase' && isGhostInCrosshair()) {
      State.freezeCharge = Math.min(1, State.freezeCharge + dt / 4.0);
      if (State.freezeCharge >= 1) {
        // Freeze!
        ghost.state   = 'stunned';
        ghost.stunTimer = 5;
        State.freezeCharge = 0;
        Audio.playFreeze();
        pulseFocus();
      }
    } else {
      State.freezeCharge = Math.max(0, State.freezeCharge - dt);
    }
  } else {
    State.freezeCharge = Math.max(0, State.freezeCharge - dt * 0.5);
  }

  // --- Health regen in safe zone ---
  const now = performance.now();
  if (now - p.lastDamageTime > REGEN_DELAY && p.health < p.maxHealth) {
    const g = State.ghost;
    const dist = Math.sqrt((p.x - g.x)**2 + (p.y - g.y)**2);
    if (g.state !== 'chase' && dist > 6 * TILE) {
      p.health = Math.min(p.maxHealth, p.health + 5 * dt);
    }
  }

  // --- Update room ---
  const room = getRoomAtPos(p.x, p.y);
  if (room && room !== State.currentRoom) {
    State.previousRoom = State.currentRoom;
    State.currentRoom = room;
    State.discoveredRooms.add(room);
  }
}

function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return target;
}

function canMove(wx, wy) {
  const map = State.map;
  if (!map) return false;
  const r = 10;  // collision radius in world units
  const checks = [
    [wx - r, wy - r], [wx + r, wy - r],
    [wx - r, wy + r], [wx + r, wy + r],
  ];
  for (const [cx, cy] of checks) {
    const tx = Math.floor(cx / TILE);
    const ty = Math.floor(cy / TILE);
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false;
    if (map[ty][tx] > 0) return false;
  }
  return true;
}

function isGhostInCrosshair() {
  const p = State.player;
  const g = State.ghost;
  const dx = g.x - p.x, dy = g.y - p.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist > 8 * TILE) return false;
  const angleToGhost = Math.atan2(dy, dx);
  let diff = angleToGhost - p.angle;
  while (diff >  Math.PI) diff -= Math.PI*2;
  while (diff < -Math.PI) diff += Math.PI*2;
  return Math.abs(diff) < 0.15;
}

export function damagePlayer(amount) {
  const p = State.player;
  if (p.invincible) return;
  p.health = Math.max(0, p.health - amount);
  p.lastDamageTime = performance.now();
  p.invincible = true;
  pulseDamage();
  setTimeout(() => { p.invincible = false; }, 1500);
  if (p.health <= 0) {
    import('../core/engine.js').then(e => e.triggerDeath());
  }
}
