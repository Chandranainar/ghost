// js/core/engine.js — Main Game Engine (Fixed-timestep loop + Post-processing)

import { State, resetState } from './state.js';
import { Raycaster } from './raycaster.js';
import { Audio } from './audio.js';
import { LightingEngine } from './lighting.js';
import { AtmosphereEngine } from './atmosphere.js';
import { SpatialAudioSystem } from './spatial-audio.js';
import { ParticleSystem, FogEffect } from './particles.js';
import { environmentalEffects } from './environmental-effects.js';
import { initDirector, updateDirector, nudgeTension } from './director.js';
import { updateFeedback, showRoomTitle, pulsePickup, pulseFocus, pulseRitual, addJournalEntry } from './feedback.js';
import { initInput, Keys, isHide, isPause, isMap } from './input.js';
import { updatePlayer } from '../entities/player.js';
import { updateGhost } from '../entities/ghost.js';
import { updateHUD, showInteractPrompt, hideInteractPrompt } from '../ui/hud.js';
import { initMinimap, renderMinimap, renderFullMap } from '../ui/minimap.js';
import { updateDialogue, showDialogue, isDialogueActive } from '../ui/dialogue.js';
import { buildMap, getItemSpawns, getHidingSpots, TILE, ROOM_DEFS, ROOM_MOODS } from '../maps/manor.js';
import { buildSymbolUI } from '../puzzles/symbols.js';
import { buildCandleUI } from '../puzzles/candles.js';
import { buildComboUI, generateCode } from '../puzzles/combination.js';
import { saveGame, hasSave, loadSave, applySave, clearSave } from '../systems/save.js';

const FIXED_DT  = 1 / 60;
const MAX_ACCUM = 0.1;

let canvas, ctx, raycaster;
let lightingEngine, atmosphereEngine, spatialAudioSystem;
let particleSystem, fogEffect;
let accumulator = 0;
let lastTime    = 0;
let rafId       = null;
let _interactCooldown = 0;
let _mapKeyHeld       = false;
let _pauseKeyHeld     = false;
let _hideKeyHeld      = false;
let _ritualTimer      = 0;
let _ritualActive     = false;
let _ritualPhase      = 0;

// ======================== INIT ========================
export function initEngine() {
  try {
    canvas    = document.getElementById('gameCanvas');
    if (!canvas) {
      console.warn('⚠️  gameCanvas not found, skipping Raycaster init');
      return;
    }
    ctx = canvas.getContext('2d');
    raycaster = new Raycaster(canvas);
    
    // Initialize new systems
    lightingEngine = new LightingEngine(canvas, ctx);
    atmosphereEngine = new AtmosphereEngine(Audio);
    spatialAudioSystem = new SpatialAudioSystem(Audio);
    particleSystem = new ParticleSystem();
    fogEffect = new FogEffect();
    
    initInput(canvas);
    initMinimap();
  } catch (error) {
    console.error('Engine init failed:', error);
    // Don't throw - allow story to still play even if engine init fails
  }
}

// ======================== START GAME ========================
export function startGame(useSave = false) {
  console.log('🎮 startGame called, useSave:', useSave);
  try {
    resetState();
    console.log('✓ State reset');

    // Build map
    State.map = buildMap();
    console.log('✓ Map built');

    // Populate items
    const spawns = getItemSpawns();
    State.items  = {};
    for (const [id, def] of Object.entries(spawns)) {
      State.items[id] = { ...def, id, collected: false };
    }
    console.log('✓ Items populated');

    // Generate combination lock code; save restore may replace it below.
    generateCode();

    // Hiding spots
    State.hidingSpots = getHidingSpots();

    // Apply save if requested
    if (useSave) {
      const data = loadSave();
      applySave(data, State.items);
    } else {
      clearSave();
    }
    syncComboNotes();

    // Show game container, hide menu
    document.getElementById('mainMenu')?.classList.add('hidden');
    const gc = document.getElementById('gameContainer');
    if (gc) gc.classList.remove('hidden');
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('endScreen')?.classList.add('hidden');
    // Ensure click overlay is visible and ready for pointer lock
    const clickOverlay = document.getElementById('clickOverlay');
    if (clickOverlay) {
      clickOverlay.style.display = 'flex';
      clickOverlay.classList.remove('locked');
    }
    console.log('✓ UI updated');

    // Discover starting room
    State.discoveredRooms.add('entrance');

    State.running = true;
    State.phase   = 'playing';
    lastTime      = performance.now();
    console.log('✓ Game state set, starting loop');
    
    Audio.init();
    Audio.resume();
    
    // Initialize atmosphere engine
    if (atmosphereEngine) {
      atmosphereEngine.startAmbient();
    }
    initDirector();
    
    console.log('✓ Audio initialized');

    // Opening dialogue
    setTimeout(() => {
      showDialogue([
      'I wake up on a cold stone floor...',
      'The Blackwood Manor. I came here investigating disappearances.',
      'The door is locked. I need to find a way out.',
      'Those notes I read — four Memory Shards, three puzzles. The mirror in the Attic.',
      'I must hurry before dawn...',
    ], 'MAYA');
  }, 500);

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  } catch (error) {
    console.error('❌ startGame error:', error);
    console.error('Stack:', error.stack);
    // Still try to start the loop even on error
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }
}

// ======================== GAME LOOP ========================
function loop(timestamp) {
  try {
    if (!State.running) return;
    rafId = requestAnimationFrame(loop);

    const delta = Math.min((timestamp - lastTime) / 1000, MAX_ACCUM);
    lastTime    = timestamp;

    if (State.phase === 'playing') {
      // Fixed timestep accumulator
      accumulator += delta;
      while (accumulator >= FIXED_DT) {
        fixedUpdate(FIXED_DT);
        accumulator -= FIXED_DT;
      }
    }

    render(delta);
  } catch (error) {
    console.error('❌ Game loop error:', error);
    console.error('Stack:', error.stack);
  }
}

// ======================== FIXED UPDATE ========================
function fixedUpdate(dt) {
  if (State.paused || !['playing', 'hiding'].includes(State.phase)) return;

  State.elapsed += dt;

  // Update dialogue
  updateDialogue(dt);

  // Input gating
  _interactCooldown = Math.max(0, _interactCooldown - dt);

  // Handle map toggle
  const mapDown = isMap();
  if (mapDown && !_mapKeyHeld) {
    toggleFullMap();
    _mapKeyHeld = true;
  }
  if (!mapDown) _mapKeyHeld = false;

  // Pause
  const pauseDown = isPause();
  if (pauseDown && !_pauseKeyHeld) {
    togglePause();
    _pauseKeyHeld = true;
  }
  if (!pauseDown) _pauseKeyHeld = false;

  if (State.paused) return;

  // Hide mechanic
  const hideDown = isHide();
  if (hideDown && !_hideKeyHeld) {
    toggleHide();
    _hideKeyHeld = true;
  }
  if (!hideDown) _hideKeyHeld = false;

  // Interact
  if (Keys['KeyE'] && _interactCooldown <= 0) {
    tryInteract();
    _interactCooldown = 0.5;
  }

  // Update subsystems
  updatePlayer(dt);
  updateGhost(dt);
  updateDirector(dt);
  updateFeedback(dt);
  particleSystem?.update(dt);
  fogEffect?.update(dt);
  environmentalEffects.update(dt);

  // Update atmospheric systems
  if (lightingEngine) {
    lightingEngine.updateLighting();
  }
  if (atmosphereEngine) {
    atmosphereEngine.updateAtmosphere(State.fear, (State.elapsed / 600) % 1, State.currentRoom);
  }

  if (particleSystem && Math.random() < dt * (State.fear > 50 ? 5 : 2)) {
    particleSystem.addParticle(
      State.player.x + (Math.random() - 0.5) * TILE * 5,
      State.player.y + (Math.random() - 0.5) * TILE * 5,
      (Math.random() - 0.5) * 8,
      -6 - Math.random() * 10,
      State.currentRoom === 'garden' ? 'mist' : 'dust',
      2 + Math.random() * 2
    );
  }

  // Interaction prompt
  checkInteractPrompt();

  // Screen shake decay
  State.screenShake = Math.max(0, State.screenShake - dt * 20);

  // Screen flash decay
  State.screenFlash.alpha = Math.max(0, State.screenFlash.alpha - dt * 2);

  // Ritual
  if (_ritualActive) updateRitual(dt);

  // HUD
  updateHUD();
}

// ======================== RENDER ========================
function render(dt) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  if (State.phase === 'playing' || State.phase === 'puzzle' || State.phase === 'hiding') {
    const p     = State.player;
    const g     = State.ghost;
    const anim  = performance.now() / 1000;

    // Build sprite list
    const sprites = buildSpriteList(anim);

    // Apply screen shake and dynamic Figure-8 locomotion head bob
    const shakeX = State.screenShake > 0 ? (Math.random() - 0.5) * State.screenShake : 0;
    const shakeY = State.screenShake > 0 ? (Math.random() - 0.5) * State.screenShake : 0;
    const stride = p.walkCycle || 0;
    const moveBob = p.isMoving ? p.moveIntensity : 0;
    
    // Figure-8: bobX runs at half the frequency of bobY (side-to-side vs up-down)
    const bobX = Math.sin(stride * 0.5) * (p.isRunning ? 4.5 : 2.5) * moveBob;
    const bobY = Math.abs(Math.sin(stride)) * (p.isRunning ? 7.0 : 4.0) * moveBob;

    ctx.save();

    // 3D Camera Lean / Tilt
    if (p.tiltAngle && Math.abs(p.tiltAngle) > 0.001) {
      ctx.translate(W / 2, H / 2);
      ctx.rotate(p.tiltAngle);
      // Scale slightly up to prevent showing black edges at the corners when rotated
      ctx.scale(1.05, 1.05);
      ctx.translate(-W / 2, -H / 2);
    }

    ctx.translate(shakeX + bobX, shakeY + bobY);

    // Raycaster renders the 3D scene
    if (!p.isHiding) {
      raycaster.render(State.map, p, g.visible, g.x, g.y, sprites, State.fear);
    }

    ctx.restore();

    // Lighting overlays (before post-FX)
    if (lightingEngine) {
      lightingEngine.renderLanternLight(p.x, p.y, State.player.lantern / 100);
      lightingEngine.renderAtmosphereOverlay(State.fear);
    }

    // Post-processing overlays
    drawRoomMoodOverlay(ctx, W, H);
    drawPostFX(ctx, W, H, anim);
    drawLocomotionFX(ctx, W, H, anim);
    fogEffect?.render(ctx, W, H, State.fear);
    particleSystem?.render(ctx, p.x, p.y, W, H);
    environmentalEffects.render(ctx, W, H);

    // Motion blur effect
    if (lightingEngine && (State.player.isRunning || State.fear > 60)) {
      const blurIntensity = State.player.isRunning ? 0.15 : State.fear / 100 * 0.2;
      lightingEngine.renderMotionBlur(blurIntensity);
    }

    // Minimap
    renderMinimap();
  }
}

function buildSpriteList(anim) {
  const sprites = [];
  const p = State.player;

  // Ghost
  const g = State.ghost;
  if (g.active) {
    sprites.push({ x: g.x, y: g.y, type: 'ghost', anim: anim + g.angle, state: g.state });
  }

  // Items
  for (const [id, item] of Object.entries(State.items)) {
    if (item.collected) continue;
    // Only show items if room discovered
    if (!State.discoveredRooms.has(item.room)) continue;
    const type = item.type === 'shard' ? 'shard' : 'item';
    sprites.push({ x: item.wx, y: item.wy, type, anim });
  }

  // Hiding spots
  for (const hs of State.hidingSpots) {
    if (State.discoveredRooms.has(hs.room)) {
      sprites.push({ x: hs.wx, y: hs.wy, type: 'hiding', anim });
    }
  }

  // Puzzle markers (at specific locations)
  const puzzleSprites = [
    { id: 'symbols', x: 4.5*TILE, y: 16.5*TILE, room: 'library' },
    { id: 'candles', x: 17.5*TILE, y: 27.5*TILE, room: 'dining' },
    { id: 'combo',   x: 28.5*TILE, y: 15.5*TILE, room: 'kitchen' },
  ];
  for (const ps of puzzleSprites) {
    const solved = State.puzzles[ps.id]?.solved;
    if (!solved && State.discoveredRooms.has(ps.room)) {
      sprites.push({ x: ps.x, y: ps.y, type: 'puzzle', anim });
    }
  }

  return sprites;
}

function drawPostFX(ctx, W, H, anim) {
  const p = State.player;
  const fb = State.feedback;

  // Screen flash
  const sf = State.screenFlash;
  if (sf.alpha > 0) {
    ctx.fillStyle = `rgba(${sf.r},${sf.g},${sf.b},${sf.alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Low Stamina / Heartbeat Vignette Pulse
  const stamFrac = p.stamina / p.maxStamina;
  if (p.isMoving && (p.exhausted || stamFrac < 0.3)) {
    const pulseFactor = (0.3 - stamFrac) / 0.3; // 0 to 1 scaling intensity
    // Double beat pulse formula for realistic heartbeat visual effect
    const beatCycle = (anim * 2.3) % 1; // frequency of beats
    let beatIntensity = 0;
    if (beatCycle < 0.25) {
      beatIntensity = Math.sin(beatCycle * Math.PI / 0.25);
    } else if (beatCycle >= 0.3 && beatCycle < 0.55) {
      beatIntensity = Math.sin((beatCycle - 0.3) * Math.PI / 0.25) * 0.65;
    }
    const pulseAlpha = beatIntensity * pulseFactor * 0.35;
    
    const pulseGrad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.85);
    pulseGrad.addColorStop(0, 'rgba(0,0,0,0)');
    pulseGrad.addColorStop(1, `rgba(120, 0, 0, ${pulseAlpha})`);
    ctx.fillStyle = pulseGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Vignette (always present, stronger with fear)
  const vAlpha = 0.4 + State.fear / 100 * 0.45;
  const vGrad  = ctx.createRadialGradient(W/2, H/2, H*0.25, W/2, H/2, H*0.9);
  vGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vGrad.addColorStop(1, `rgba(0,0,0,${vAlpha})`);
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, W, H);

  // Chromatic aberration (fear > 50)
  if (State.fear > 50) {
    const chromaStrength = (State.fear - 50) / 50 * 4;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255,0,0,${chromaStrength * 0.1})`;
    ctx.fillRect(-chromaStrength, 0, W, H);
    ctx.fillStyle = `rgba(0,0,255,${chromaStrength * 0.1})`;
    ctx.fillRect(chromaStrength, 0, W, H);
    ctx.restore();
  }

  // Ghost proximity pulse (red rim near death)
  if (State.player.health < 35 || fb.damagePulse > 0) {
    const pulse = Math.sin(anim * 3) * 0.5 + 0.5;
    const damageBoost = fb.damagePulse * 0.35;
    const rimGrad = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H);
    rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(1, `rgba(180,0,0,${0.3 * pulse + damageBoost})`);
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, W, H);
  }

  if (fb.pickupPulse > 0 || fb.focusPulse > 0) {
    const pulse = Math.max(fb.pickupPulse, fb.focusPulse);
    const color = fb.focusPulse > fb.pickupPulse ? '80,220,255' : '120,255,210';
    const grad = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.9);
    grad.addColorStop(0, `rgba(${color},${0.08 * pulse})`);
    grad.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Crosshair
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  const cx = W/2, cy = H/2;
  ctx.beginPath(); ctx.moveTo(cx-8, cy); ctx.lineTo(cx+8, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy-8); ctx.lineTo(cx, cy+8); ctx.stroke();

  // Ritual overlay
  if (_ritualActive) drawRitualFX(ctx, W, H, anim);

  // Scan lines (film grain)
  ctx.save();
  ctx.globalAlpha = 0.025;
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y, W, 2);
  }
  ctx.restore();

  // Film grain effect for horror aesthetic
  if (lightingEngine && State.settings.filmGrain) {
    lightingEngine.renderFilmGrain(0.3);
  }
}

function drawRoomMoodOverlay(ctx, W, H) {
  const mood = ROOM_MOODS[State.currentRoom];
  if (!mood?.tint) return;
  ctx.save();
  ctx.fillStyle = mood.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawLocomotionFX(ctx, W, H, anim) {
  const p = State.player;
  const intensity = p.isMoving ? p.moveIntensity : 0;
  const stride = p.walkCycle || anim * 2;
  
  // Figure-8 sway style for the lantern/hand
  const bobX = Math.sin(stride * 0.5) * (p.isRunning ? 14 : 9) * intensity;
  const bobY = Math.abs(Math.sin(stride)) * (p.isRunning ? 11 : 8) * intensity;

  ctx.save();
  ctx.translate(bobX, bobY);

  // A small first-person lantern/hand silhouette grounds movement without covering play space.
  const baseX = W - 170;
  const baseY = H - 84;
  
  // Inertia sway: lag behind camera tilt
  const tiltOffset = (p.tiltAngle || 0) * -120;
  const swing = Math.sin(stride) * (p.isRunning ? 14 : 7) * intensity + tiltOffset;

  ctx.globalAlpha = 0.22 + intensity * 0.16;
  const glow = ctx.createRadialGradient(baseX + 24, baseY - 4, 8, baseX + 24, baseY - 4, 120);
  glow.addColorStop(0, 'rgba(255,190,90,0.26)');
  glow.addColorStop(0.45, 'rgba(150,70,20,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(baseX - 120, baseY - 130, 250, 220);

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = 'rgba(6,4,3,0.92)';
  ctx.beginPath();
  ctx.ellipse(baseX + swing, baseY + 40, 82, 28, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.78;
  ctx.fillStyle = 'rgba(12,8,5,0.95)';
  ctx.beginPath();
  ctx.roundRect(baseX + 30 + swing, baseY - 8, 58, 76, 6);
  ctx.fill();

  ctx.strokeStyle = 'rgba(185,128,48,0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(baseX + 59 + swing, baseY - 8, 24, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  ctx.globalAlpha = 0.82;
  ctx.fillStyle = 'rgba(255,154,46,0.65)';
  ctx.beginPath();
  ctx.ellipse(baseX + 59 + swing, baseY + 18, 14, 21 + Math.sin(anim * 9) * 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRitualFX(ctx, W, H, anim) {
  const t = _ritualTimer;
  const prog = Math.min(1, t / 30);

  // Pulsing purple circle overlay
  const pulse = Math.sin(anim * (2 + prog * 4)) * 0.5 + 0.5;
  const rGrad = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, H * (0.3 + pulse * 0.1));
  rGrad.addColorStop(0, `rgba(80,0,180,${0.15 * prog})`);
  rGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rGrad;
  ctx.fillRect(0, 0, W, H);

  // Progress bar
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(W/2 - 120, H - 70, 240, 28);
  ctx.fillStyle = `hsl(${270 + prog*60},80%,60%)`;
  ctx.fillRect(W/2 - 118, H - 68, (240-4) * prog, 24);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`RITUAL PROGRESS — ${Math.floor(prog*100)}%`, W/2, H - 52);

  // Ghost phase text
  ctx.fillStyle = `rgba(255,200,200,${0.6 + pulse*0.4})`;
  ctx.font = `bold 14px monospace`;
  if (_ritualPhase === 1) ctx.fillText('CYRUS IS CIRCLING...', W/2, H/2 - 40);
  if (_ritualPhase === 2) ctx.fillText('THE MANOR TREMBLES...', W/2, H/2 - 40);
  if (_ritualPhase === 3) ctx.fillText('HOLD ON... ALMOST FREE...', W/2, H/2 - 40);
}

// ======================== INTERACTION ========================
function tryInteract() {
  const p = State.player;
  const interactRange = TILE * 1.5;

  // Check items
  for (const [id, item] of Object.entries(State.items)) {
    if (item.collected) continue;
    const dx = item.wx - p.x, dy = item.wy - p.y;
    if (Math.sqrt(dx*dx + dy*dy) < interactRange) {
      collectItem(id, item);
      return;
    }
  }

  // Check hiding spots (if not hiding)
  if (!p.isHiding) {
    for (const hs of State.hidingSpots) {
      const dx = hs.wx - p.x, dy = hs.wy - p.y;
      if (Math.sqrt(dx*dx + dy*dy) < interactRange) {
        enterHiding(hs);
        return;
      }
    }
  }

  // Check puzzle triggers
  checkPuzzleTrigger(p, interactRange);

  // Check ritual mirror (attic)
  if (State.currentRoom === 'attic') {
    const mirrorX = 5.5 * TILE, mirrorY = 4.5 * TILE;
    const dx = mirrorX - p.x, dy = mirrorY - p.y;
    if (Math.sqrt(dx*dx + dy*dy) < interactRange * 1.5) {
      tryRitual();
    }
  }

  // Check mirror for save (attic, garden mirror)
  const mirrors = [
    { x: 8*TILE, y: 3*TILE, room: 'attic' },
    { x: 16*TILE, y: 4*TILE, room: 'garden' },
  ];
  for (const m of mirrors) {
    if (State.currentRoom === m.room) {
      const dx = m.x - p.x, dy = m.y - p.y;
      if (Math.sqrt(dx*dx + dy*dy) < interactRange * 1.5) {
        if (saveGame()) {
          showDialogue(['I feel the mirror shiver... progress saved.'], 'MAYA');
          Audio.playPickup();
        }
        return;
      }
    }
  }
}

function collectItem(id, item) {
  const p = State.player;
  if (p.inventory.length >= p.maxInventory) {
    showDialogue(['My hands are full. I cannot carry more.'], 'MAYA');
    return;
  }
  item.collected = true;
  p.inventory.push(item);
  pulsePickup();
  nudgeTension(item.type === 'shard' ? 0.18 : 0.06);

  if (item.type === 'shard') {
    State.shardsCollected++;
    addJournalEntry('memory', memoryLineForShard(id));
    showDialogue([
      `Memory Shard collected (${State.shardsCollected}/${State.shardsTotal})`,
      memoryLineForShard(id),
    ], 'MAYA');
    Audio.playPickup();
    if (State.shardsCollected === State.shardsTotal) {
      setTimeout(() => showDialogue([
        'All memory shards... I remember now.',
        'Elara was murdered here. Her spirit is trapped.',
        'The ritual mirror in the Attic — it is the only way.',
      ], 'MAYA'), 3000);
    }
    return;
  }

  if (item.type === 'consumable' && id === 'oil') {
    p.lantern = Math.min(p.maxLantern, p.lantern + 60);
    showDialogue(['I refill the lantern. The darkness retreats a little.'], 'MAYA');
    Audio.playPickup();
    return;
  }

  if (item.type === 'clue') addJournalEntry('clue', `${item.name}: ${item.desc || 'A clue from the manor.'}`);
  showDialogue([item.desc || `Picked up: ${item.name}`], 'MAYA');
  Audio.playPickup();
}

function syncComboNotes() {
  const code = Array.isArray(State.comboCode) ? State.comboCode : generateCode();
  if (State.items.note1) State.items.note1.desc = `Torn note: "First digit of the lock is ${code[0]}."`;
  if (State.items.note2) State.items.note2.desc = `Child's drawing: a number "${code[1]}" scrawled in red crayon.`;
  if (State.items.note3) State.items.note3.desc = `Faded notebook: "The last number — I carved it in the stone. ${code[2]}."`;
}

function memoryLineForShard(id) {
  const memories = {
    shard1: 'A mirror room. A child crying behind a locked attic door.',
    shard2: 'Elara hiding a small drawing under the nursery floorboards.',
    shard3: 'Cyrus dragging something heavy down the basement stairs.',
    shard4: 'A bedroom candle guttering out as the manor learns to breathe.',
  };
  return memories[id] || 'A fragment of memory floods into my mind.';
}

function checkPuzzleTrigger(p, range) {
  const puzzleTriggers = [
    { id: 'symbols', x: 4.5*TILE, y: 16.5*TILE, room: 'library',  builder: buildSymbolUI },
    { id: 'candles', x: 17.5*TILE, y: 27.5*TILE, room: 'dining',  builder: buildCandleUI },
    { id: 'combo',   x: 28.5*TILE, y: 15.5*TILE, room: 'kitchen', builder: buildComboUI },
  ];

  for (const pt of puzzleTriggers) {
    if (State.puzzles[pt.id]?.solved) continue;
    if (State.currentRoom !== pt.room) continue;
    const dx = pt.x - p.x, dy = pt.y - p.y;
    if (Math.sqrt(dx*dx + dy*dy) < range * 1.5) {
      openPuzzle(pt.id, pt.builder);
      return;
    }
  }
}

function openPuzzle(id, builder) {
  State.phase = 'puzzle';
  document.getElementById('puzzleOverlay')?.classList.remove('hidden');
  // Exit pointer lock for mouse interaction
  document.exitPointerLock?.();

  builder(
    () => {
      // Solved callback
      closePuzzle();
      showDialogue(['A lock clicks somewhere in the manor...'], 'MAYA');
      checkVictoryCondition();
    },
    () => closePuzzle()
  );
}

function closePuzzle() {
  State.phase = 'playing';
  document.getElementById('puzzleOverlay')?.classList.add('hidden');
  // Re-lock pointer
  canvas?.requestPointerLock();
}

function checkInteractPrompt() {
  const p = State.player;
  const range = TILE * 1.5;

  for (const [id, item] of Object.entries(State.items)) {
    if (item.collected) continue;
    const dx = item.wx - p.x, dy = item.wy - p.y;
    if (Math.sqrt(dx*dx + dy*dy) < range) {
      showInteractPrompt(`Pick up ${item.name}`);
      return;
    }
  }

  for (const hs of State.hidingSpots) {
    const dx = hs.wx - p.x, dy = hs.wy - p.y;
    if (Math.sqrt(dx*dx + dy*dy) < range) {
      showInteractPrompt(`Hide in ${hs.name}`);
      return;
    }
  }

  const puzzleTriggers = [
    { id: 'symbols', x: 4.5*TILE, y: 16.5*TILE, room: 'library',  label: 'Examine Rune Wall' },
    { id: 'candles', x: 17.5*TILE, y: 27.5*TILE, room: 'dining',  label: 'Light Candles' },
    { id: 'combo',   x: 28.5*TILE, y: 15.5*TILE, room: 'kitchen', label: 'Combination Lock' },
  ];
  for (const pt of puzzleTriggers) {
    if (State.puzzles[pt.id]?.solved) continue;
    if (State.currentRoom !== pt.room) continue;
    const dx = pt.x - p.x, dy = pt.y - p.y;
    if (Math.sqrt(dx*dx + dy*dy) < range * 1.5) {
      showInteractPrompt(pt.label);
      return;
    }
  }

  // Mirror
  if (State.currentRoom === 'attic') {
    const dx = 5.5*TILE - p.x, dy = 4.5*TILE - p.y;
    if (Math.sqrt(dx*dx + dy*dy) < range * 1.5) {
      if (State.shardsCollected >= State.shardsTotal && State.puzzlesSolved >= 3) {
        showInteractPrompt('Perform Escape Ritual');
      } else {
        showInteractPrompt('Covered Mirror — not ready yet');
      }
      return;
    }
  }

  hideInteractPrompt();
}

// ======================== HIDE MECHANIC ========================
function toggleHide() {
  const p = State.player;
  if (p.isHiding) {
    exitHiding();
  } else {
    // Find nearest hiding spot
    const range = TILE * 1.5;
    for (const hs of State.hidingSpots) {
      const dx = hs.wx - p.x, dy = hs.wy - p.y;
      if (Math.sqrt(dx*dx + dy*dy) < range) {
        enterHiding(hs);
        return;
      }
    }
  }
}

function enterHiding(hs) {
  const p = State.player;
  p.isHiding  = true;
  p.hidingAt  = hs;
  State.phase = 'hiding';
  document.getElementById('hidingOverlay')?.classList.remove('hidden');
  document.getElementById('hidingOverlay')?.classList.add('active');
  nudgeTension(0.08);
  Audio.playBreath(false);
}

function exitHiding() {
  const p = State.player;
  p.isHiding = false;
  p.hidingAt  = null;
  State.phase = 'playing';
  document.getElementById('hidingOverlay')?.classList.add('hidden');
  document.getElementById('hidingOverlay')?.classList.remove('active');
}

// ======================== RITUAL ========================
function tryRitual() {
  if (State.shardsCollected < State.shardsTotal) {
    showDialogue([`I need all ${State.shardsTotal} Memory Shards first...`], 'MAYA');
    return;
  }
  if (State.puzzlesSolved < 3) {
    showDialogue([`${3 - State.puzzlesSolved} more puzzle(s) must be solved...`], 'MAYA');
    return;
  }

  if (_ritualActive) return;
  _ritualActive = true;
  _ritualTimer  = 0;
  _ritualPhase  = 0;

  // Boost ghost aggression
  State.ghost.state = 'chase';
  State.ghost.chaseTimer = 999;
  State.ghost.speed = 4.0;

  Audio.playRitual();
  pulseRitual(1);
  showDialogue([
    'The mirror pulses with violet light...',
    'The ritual has begun. Hold position!',
    'CYRUS IS COMING — DO NOT LET HIM REACH YOU!',
  ], 'ELARA');
}

function updateRitual(dt) {
  _ritualTimer += dt;

  if (_ritualTimer > 10  && _ritualPhase < 1) { _ritualPhase = 1; Audio.playGhostShriek(); pulseRitual(1); }
  if (_ritualTimer > 20  && _ritualPhase < 2) { _ritualPhase = 2; Audio.playGhostShriek(); pulseRitual(1.2); State.ghost.speed = 5.0; }
  if (_ritualTimer > 28  && _ritualPhase < 3) {
    _ritualPhase = 3;
    // Dramatic silence
    showDialogue(['Almost... HOLD ON!'], 'ELARA');
  }

  if (_ritualTimer >= 30) {
    // VICTORY!
    triggerVictory();
  }

  // If player dies during ritual, ritual fails
  if (State.player.health <= 0) {
    _ritualActive = false;
    _ritualTimer  = 0;
    State.ghost.speed = 3.2;
  }
}

// ======================== VICTORY / DEATH ========================
export function triggerVictory() {
  State.running = false;
  State.phase   = 'victory';
  clearSave();
  Audio.playRitual();

  const el  = document.getElementById('endScreen');
  const ttl = document.getElementById('endTitle');
  const msg = document.getElementById('endMessage');
  const ico = document.getElementById('endIcon');

  if (el && ttl && msg && ico) {
    ico.textContent = '🪞';
    ttl.textContent = 'YOU ESCAPED';
    msg.innerHTML = `
      Elara's spirit is free.<br>
      Cyrus Blackwood is banished.<br><br>
      <em style="color:#777;">The mirror shattered at dawn.<br>
      They say the manor burned to the ground that morning.</em>
    `;
    el.classList.remove('hidden');
    el.classList.add('victory');
  }
}

export function triggerDeath() {
  if (State.phase === 'dead') return;
  State.running = false;
  State.phase   = 'dead';
  Audio.playDeath();

  const el  = document.getElementById('endScreen');
  const ttl = document.getElementById('endTitle');
  const msg = document.getElementById('endMessage');
  const ico = document.getElementById('endIcon');

  if (el && ttl && msg && ico) {
    ico.textContent = '💀';
    ttl.textContent = 'YOU DIED';
    msg.innerHTML = `
      Cyrus found you in the dark.<br>
      Maya was never found.<br><br>
      <em style="color:#555;">Another soul lost to Blackwood Manor.</em>
    `;
    el.classList.remove('hidden');
    el.classList.remove('victory');
  }
}

function checkVictoryCondition() {
  if (State.shardsCollected >= State.shardsTotal && State.puzzlesSolved >= 3) {
    showDialogue([
      'Everything is ready.',
      'The ritual mirror waits in the Attic.',
      'Find it — and end this nightmare.',
    ], 'ELARA');
  }
}

// ======================== MAP TOGGLE ========================
function toggleFullMap() {
  const el = document.getElementById('fullMapOverlay');
  if (!el) return;
  const visible = !el.classList.contains('hidden');
  if (visible) {
    el.classList.add('hidden');
  } else {
    el.classList.remove('hidden');
    renderFullMap(document.getElementById('fullMapCanvas'));
    document.exitPointerLock?.();
  }
}

// ======================== PAUSE ========================
function togglePause() {
  if (State.phase === 'puzzle') return;
  State.paused = !State.paused;
  document.getElementById('pauseMenu')?.classList.toggle('hidden', !State.paused);
  if (State.paused) {
    document.exitPointerLock?.();
  } else {
    canvas?.requestPointerLock();
  }
}

export { togglePause };
