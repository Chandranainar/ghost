// js/systems/save.js — localStorage Save / Load (diegetic: save at mirrors)

import { State } from '../core/state.js';

const SAVE_KEY = 'blackwood_save_v1';

export function saveGame() {
  const p = State.player;
  const data = {
    timestamp: Date.now(),
    player: {
      x: p.x, y: p.y, angle: p.angle,
      health: p.health, stamina: p.stamina, lantern: p.lantern,
      inventory: p.inventory.map(i => i.id),
    },
    ghost: { state: State.ghost.state },
    currentRoom: State.currentRoom,
    discoveredRooms: [...State.discoveredRooms],
    shardsCollected: State.shardsCollected,
    puzzlesSolved: State.puzzlesSolved,
    puzzles: {
      symbols: State.puzzles.symbols.solved,
      candles:  State.puzzles.candles.solved,
      combo:    State.puzzles.combo.solved,
    },
    items: Object.fromEntries(
      Object.entries(State.items).map(([id, item]) => [id, item.collected])
    ),
    comboCode: State.comboCode,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function applySave(data, allItems) {
  if (!data) return;
  const p = State.player;
  p.x = data.player?.x ?? p.x;
  p.y = data.player?.y ?? p.y;
  p.angle = data.player?.angle ?? p.angle;
  p.health = data.player?.health ?? p.health;
  p.stamina = data.player?.stamina ?? p.stamina;
  p.lantern = data.player?.lantern ?? p.lantern;

  // Restore inventory
  p.inventory = (data.player?.inventory || [])
    .map(id => allItems[id])
    .filter(Boolean);

  State.currentRoom = data.currentRoom || State.currentRoom;
  State.discoveredRooms = new Set(data.discoveredRooms || [State.currentRoom]);
  State.shardsCollected = data.shardsCollected ?? State.shardsCollected;
  State.puzzlesSolved   = data.puzzlesSolved ?? State.puzzlesSolved;
  State.puzzles.symbols.solved = !!data.puzzles?.symbols;
  State.puzzles.candles.solved  = !!data.puzzles?.candles;
  State.puzzles.combo.solved    = !!data.puzzles?.combo;
  if (Array.isArray(data.comboCode) && data.comboCode.length === 3) {
    State.comboCode = data.comboCode.map(Number);
  }

  // Restore collected items
  if (data.items) {
    for (const [id, collected] of Object.entries(data.items)) {
      if (State.items[id]) State.items[id].collected = collected;
    }
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
