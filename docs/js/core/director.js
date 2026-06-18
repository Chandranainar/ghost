// js/core/director.js — Lightweight pacing layer for authored horror beats

import { State } from './state.js';
import { Audio } from './audio.js';
import { ROOM_MOODS } from '../maps/manor.js';
import { flashScreen, shakeScreen, showRoomTitle } from './feedback.js';
import { playBeat } from './cinematics.js';

const COOLDOWN_DEFAULTS = {
  whisper: 10,
  stinger: 14,
  reveal: 22,
  chaseHint: 8,
};

export function initDirector() {
  Object.assign(State.director, {
    enabled: true,
    timeAlive: 0,
    tension: 0,
    lastRoom: State.currentRoom,
    ghostAwakened: false,
    ghostRevealDone: false,
    cooldowns: {},
    recentChaseTime: 0,
    lastGhostState: State.ghost.state,
  });
  Audio.setRoomMood(State.currentRoom);
}

export function updateDirector(dt) {
  const d = State.director;
  if (!d.enabled) return;

  d.timeAlive += dt;
  for (const key of Object.keys(d.cooldowns)) {
    d.cooldowns[key] = Math.max(0, d.cooldowns[key] - dt);
  }

  const g = State.ghost;
  const p = State.player;
  const mood = ROOM_MOODS[State.currentRoom] || ROOM_MOODS.entrance;
  const progress = (State.shardsCollected / State.shardsTotal) * 0.45 + (State.puzzlesSolved / 3) * 0.35;
  const ghostPressure = g.state === 'chase' ? 0.45 : g.state === 'investigate' ? 0.22 : 0;
  const lowLantern = p.lantern < 28 ? 0.12 : 0;
  const targetTension = Math.min(1, mood.tension + progress + State.fear / 240 + ghostPressure + lowLantern);
  d.tension += (targetTension - d.tension) * Math.min(1, dt * 0.7);

  if (State.currentRoom !== d.lastRoom) {
    onRoomChanged(State.currentRoom, d.lastRoom);
    d.lastRoom = State.currentRoom;
  }

  if (!d.ghostAwakened && shouldAwakenGhost(d)) {
    awakenGhost();
  }

  if (g.state === 'chase') d.recentChaseTime = 4;
  else d.recentChaseTime = Math.max(0, d.recentChaseTime - dt);

  if (g.state !== d.lastGhostState) {
    onGhostStateChanged(d.lastGhostState, g.state);
    d.lastGhostState = g.state;
  }

  if (g.active && d.tension > 0.52 && isReady('whisper')) {
    Audio.playGhostWhisper();
    setCooldown('whisper', COOLDOWN_DEFAULTS.whisper + Math.random() * 8);
  }

  if (g.active && !d.ghostRevealDone && d.tension > 0.7 && isReady('reveal')) {
    d.ghostRevealDone = true;
    Audio.playRoomStinger(State.currentRoom);
    flashScreen(180, 0, 80, 0.18);
    shakeScreen(4);
    setCooldown('reveal', COOLDOWN_DEFAULTS.reveal);
  }
}

export function onRoomChanged(roomId) {
  Audio.setRoomMood(roomId);
  showRoomTitle(roomId);
  playBeat(`room_${roomId}`);
  if (isReady('stinger')) {
    Audio.playRoomStinger(roomId);
    setCooldown('stinger', COOLDOWN_DEFAULTS.stinger + Math.random() * 8);
  }
}

export function nudgeTension(amount = 0.1) {
  State.director.tension = Math.max(0, Math.min(1, State.director.tension + amount));
}

function shouldAwakenGhost(d) {
  if (d.timeAlive > 28) return true;
  if (State.shardsCollected > 0 || State.puzzlesSolved > 0) return true;
  return d.timeAlive > 12 && State.currentRoom !== 'entrance';
}

function awakenGhost() {
  const d = State.director;
  d.ghostAwakened = true;
  State.ghost.active = true;
  Audio.playGhostWhisper();
  flashScreen(120, 0, 80, 0.2);
  shakeScreen(3);
  playBeat('ghost_awakened');
}

function onGhostStateChanged(from, to) {
  if (to === 'chase') {
    Audio.playGhostShriek();
    flashScreen(170, 0, 0, 0.28);
    shakeScreen(7);
    playBeat('first_chase');
  } else if (to === 'stunned') {
    flashScreen(0, 210, 255, 0.26);
    shakeScreen(4);
  } else if (from === 'chase' && (to === 'retreat' || to === 'investigate')) {
    Audio.playUISound('relief');
  }
}

function isReady(name) {
  return !State.director.cooldowns[name];
}

function setCooldown(name, value) {
  State.director.cooldowns[name] = value;
}
