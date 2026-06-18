// js/ui/hud.js — HUD Update (bars, inventory, prompts)

import { State } from '../core/state.js';

export function updateHUD() {
  const p = State.player;

  // Health bar
  setBar('healthBar',  p.health / p.maxHealth);
  setBar('fearBar',    State.fear / 100);
  setBar('staminaBar', p.stamina / p.maxStamina);
  setBar('lanternBar', p.lantern / p.maxLantern);

  // Inventory slots
  const slots = document.querySelectorAll('.inv-slot');
  slots.forEach((slot, i) => {
    const item = p.inventory[i];
    const iconEl = slot.querySelector('.slot-icon');
    if (item) {
      slot.classList.add('has-item');
      if (iconEl) iconEl.textContent = item.emoji;
    } else {
      slot.classList.remove('has-item');
      if (iconEl) iconEl.textContent = '⬜';
    }
  });

  // Objective text
  const objEl = document.getElementById('objectiveText');
  if (objEl) {
    if (!State.ghost.active) {
      objEl.textContent = 'Search Blackwood Manor';
    } else if (State.shardsCollected < State.shardsTotal) {
      objEl.textContent = `Recover Memory Shards (${State.shardsCollected}/${State.shardsTotal})`;
    } else if (State.puzzlesSolved < 3) {
      objEl.textContent = `Break the manor's locks (${State.puzzlesSolved}/3)`;
    } else {
      objEl.textContent = 'Reach the Attic Mirror';
    }
  }

  const memoryCount = document.getElementById('memoryCount');
  const puzzleCount = document.getElementById('puzzleCount');
  const journalLast = document.getElementById('journalLast');
  if (memoryCount) memoryCount.textContent = `${State.shardsCollected}/${State.shardsTotal}`;
  if (puzzleCount) puzzleCount.textContent = `${State.puzzlesSolved}/3`;
  if (journalLast) journalLast.textContent = State.journal.lastEntry || 'No journal entries yet.';

  // Freeze HUD
  const freezeHud = document.getElementById('freezeHud');
  const freezeFill = document.getElementById('freezeFill');
  if (State.ghost.state === 'chase' && State.freezeActive) {
    freezeHud?.classList.remove('hidden');
    if (freezeFill) freezeFill.style.width = `${State.freezeCharge * 100}%`;
  } else {
    freezeHud?.classList.add('hidden');
  }
}

function setBar(id, frac) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
}

export function showInteractPrompt(text) {
  const el = document.getElementById('interactPrompt');
  const txt = document.getElementById('interactText');
  if (el && txt) {
    txt.textContent = text;
    el.classList.remove('hidden');
  }
}

export function hideInteractPrompt() {
  document.getElementById('interactPrompt')?.classList.add('hidden');
}
