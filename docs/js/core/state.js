// js/core/state.js — Global Game State

export const State = {
  // --- Game flow ---
  phase: 'story',   // story | menu | playing | puzzle | hiding | dialogue | paused | dead | victory
  running: false,
  paused: false,

  // --- World ---
  map: null,        // Uint8Array 2D grid (set by engine on start)
  currentRoom: 'entrance',
  previousRoom: null,
  discoveredRooms: new Set(),
  lightsOn: false,

  // --- Player ---
  player: {
    x: 17.5 * 64, y: 17.5 * 64,
    angle: Math.PI,    // facing left (into room)
    radius: 12,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    lantern: 100,
    maxLantern: 100,
    speed: 2.35,        // tiles per second
    runSpeed: 4.0,      // tiles per second
    vx: 0,
    vy: 0,
    currentSpeed: 0,    // tiles per second
    moveIntensity: 0,
    isRunning: false,
    isMoving: false,
    isHiding: false,
    hidingAt: null,
    inventory: [],        // array of item IDs
    maxInventory: 6,
    walkCycle: 0,
    footstepTimer: 0,
    lastDamageTime: 0,
    invincible: false,
    tiltAngle: 0,
    targetTilt: 0,
    fov: Math.PI / 2.8,
  },

  // --- Ghost ---
  ghost: {
    x: 5.5 * 64, y: 5.5 * 64,
    angle: 0,
    speed: 1.4,
    state: 'patrol',     // patrol | investigate | chase | stunned | retreat
    patrolIndex: 0,
    patrolWait: 0,
    lastHeardX: 0,
    lastHeardY: 0,
    visible: false,
    stunTimer: 0,
    chaseTimer: 0,
    lostPlayerTimer: 0,
    retreatTimer: 0,
    lastShriekTime: 0,
    active: false,       // activates after story completes
  },

  // --- Fear system ---
  fear: 0,           // 0-100
  fearEffects: {
    vignetteAlpha: 0,
    chromaOffset: 0,
    shakeX: 0,
    shakeY: 0,
    hallucination: false,
    hallucinationTimer: 0,
  },

  // --- Items ---
  items: {},         // itemId -> { collected: bool, ...definition }
  hidingSpots: [],

  // --- Puzzles ---
  puzzles: {
    symbols: { solved: false, active: false },
    candles: { solved: false, active: false },
    combo:   { solved: false, active: false, code: '0' },
  },
  puzzlesSolved: 0,   // 0-3 required for ritual

  // --- Progress ---
  shardsCollected: 0,
  shardsTotal: 4,
  canDoRitual: false,

  // --- Director / feedback ---
  director: {
    enabled: true,
    timeAlive: 0,
    tension: 0,
    lastRoom: 'entrance',
    ghostAwakened: false,
    ghostRevealDone: false,
    cooldowns: {},
    recentChaseTime: 0,
    lastGhostState: 'patrol',
  },

  feedback: {
    roomTitle: { text: '', timer: 0, duration: 0 },
    pickupPulse: 0,
    damagePulse: 0,
    ritualPulse: 0,
    focusPulse: 0,
  },

  journal: {
    memories: [],
    clues: [],
    lastEntry: '',
  },

  storyFlags: {
    seenBeats: [],
  },

  cinematic: {
    active: false,
    id: null,
    title: '',
    subtitle: '',
    timer: 0,
    duration: 0,
  },

  settings: {
    reducedMotion: false,
    filmGrain: true,
  },

  // --- Screen effects ---
  screenShake: 0,
  screenFlash: { alpha: 0, r: 0, g: 0, b: 0 },
  vignetteExtra: 0,

  // --- Freeze beam (flashlight) ---
  freezeCharge: 0,    // 0-1
  freezeActive: false,

  // --- Timestamps ---
  startTime: 0,
  elapsed: 0,

  // --- Noise events (for ghost AI) ---
  noiseEvents: [],    // { x, y, radius, age }
};

export function emitNoise(x, y, radius) {
  State.noiseEvents.push({ x, y, radius, age: 0 });
}

export function resetState() {
  State.phase = 'story';
  State.running = false;
  State.paused = false;
  State.currentRoom = 'entrance';
  State.previousRoom = null;
  State.discoveredRooms = new Set(['entrance']);
  State.lightsOn = false;

  const p = State.player;
  p.x = 17.5 * 64; p.y = 17.5 * 64;
  p.angle = Math.PI;
  p.health = 100; p.stamina = 100; p.lantern = 100;
  p.vx = 0; p.vy = 0; p.currentSpeed = 0; p.moveIntensity = 0;
  p.isRunning = false; p.isMoving = false; p.isHiding = false; p.hidingAt = null;
  p.inventory = []; p.walkCycle = 0; p.footstepTimer = 0;
  p.lastDamageTime = 0; p.invincible = false;
  p.tiltAngle = 0; p.targetTilt = 0; p.fov = Math.PI / 2.8;

  const g = State.ghost;
  g.x = 5.5*64; g.y = 5.5*64; g.angle = 0;
  g.state = 'patrol'; g.patrolIndex = 0; g.patrolWait = 0;
  g.visible = false; g.stunTimer = 0; g.active = false;
  g.chaseTimer = 0; g.lostPlayerTimer = 0; g.lastShriekTime = 0;

  State.fear = 0;
  Object.assign(State.fearEffects, { vignetteAlpha:0, chromaOffset:0, shakeX:0, shakeY:0, hallucination:false, hallucinationTimer:0 });

  State.puzzles.symbols.solved = false;
  State.puzzles.candles.solved = false;
  State.puzzles.combo.solved = false;
  State.puzzlesSolved = 0;
  State.shardsCollected = 0;
  State.canDoRitual = false;

  Object.assign(State.director, {
    enabled: true,
    timeAlive: 0,
    tension: 0,
    lastRoom: 'entrance',
    ghostAwakened: false,
    ghostRevealDone: false,
    cooldowns: {},
    recentChaseTime: 0,
    lastGhostState: 'patrol',
  });

  Object.assign(State.feedback, {
    roomTitle: { text: '', timer: 0, duration: 0 },
    pickupPulse: 0,
    damagePulse: 0,
    ritualPulse: 0,
    focusPulse: 0,
  });

  State.journal = { memories: [], clues: [], lastEntry: '' };
  State.storyFlags = { seenBeats: [] };
  Object.assign(State.cinematic, {
    active: false,
    id: null,
    title: '',
    subtitle: '',
    timer: 0,
    duration: 0,
  });

  State.screenShake = 0;
  State.screenFlash = { alpha: 0, r: 0, g: 0, b: 0 };
  State.vignetteExtra = 0;
  State.freezeCharge = 0;
  State.freezeActive = false;
  State.noiseEvents = [];
  State.elapsed = 0;
}
