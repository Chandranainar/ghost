// js/core/feedback.js — Centralized screen and UX feedback cues

import { State } from './state.js';
import { ROOM_DEFS } from '../maps/manor.js';

export function flashScreen(r = 255, g = 255, b = 255, alpha = 0.25) {
  State.screenFlash = { r, g, b, alpha };
}

export function shakeScreen(amount = 4) {
  if (State.settings.reducedMotion) return;
  State.screenShake = Math.max(State.screenShake, amount);
}

export function showRoomTitle(roomId) {
  const def = ROOM_DEFS[roomId];
  if (!def) return;
  State.feedback.roomTitle = {
    text: def.name,
    timer: 3.2,
    duration: 3.2,
  };

  const roomEl = document.getElementById('roomFlash');
  const labelEl = document.getElementById('roomLabel');
  if (roomEl) {
    roomEl.textContent = def.name;
    roomEl.classList.remove('hidden');
    window.clearTimeout(roomEl._hideTimer);
    roomEl._hideTimer = window.setTimeout(() => roomEl.classList.add('hidden'), 3000);
  }
  if (labelEl) labelEl.textContent = def.name;
}

export function pulsePickup() {
  State.feedback.pickupPulse = 1;
  flashScreen(90, 220, 210, 0.12);
}

export function pulseDamage() {
  State.feedback.damagePulse = 1;
  flashScreen(200, 0, 0, 0.45);
  shakeScreen(8);
}

export function pulseFocus() {
  State.feedback.focusPulse = 1;
  flashScreen(0, 200, 255, 0.36);
  shakeScreen(5);
}

export function pulseRitual(amount = 1) {
  State.feedback.ritualPulse = Math.max(State.feedback.ritualPulse, amount);
  shakeScreen(8 * amount);
}

export function updateFeedback(dt) {
  const fb = State.feedback;
  fb.pickupPulse = Math.max(0, fb.pickupPulse - dt * 1.8);
  fb.damagePulse = Math.max(0, fb.damagePulse - dt * 1.4);
  fb.ritualPulse = Math.max(0, fb.ritualPulse - dt * 0.9);
  fb.focusPulse = Math.max(0, fb.focusPulse - dt * 2.2);
  if (fb.roomTitle.timer > 0) fb.roomTitle.timer = Math.max(0, fb.roomTitle.timer - dt);
}

export function addJournalEntry(kind, text) {
  if (!text) return;
  const target = kind === 'memory' ? State.journal.memories : State.journal.clues;
  if (!target.includes(text)) target.push(text);
  State.journal.lastEntry = text;
}
