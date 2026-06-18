// js/core/cinematics.js — Authored cinematic beats layered over normal play

import { State } from './state.js';
import { Audio } from './audio.js';
import { flashScreen, shakeScreen, pulseRitual } from './feedback.js';
import { showDialogue, isDialogueActive } from '../ui/dialogue.js';

const BEATS = {
  opening_wake: {
    title: 'BLACKWOOD MANOR',
    subtitle: 'Maya Vale / October 31st / 11:58 PM',
    speaker: 'MAYA',
    duration: 6.2,
    stinger: 'entrance',
    flash: [210, 190, 150, 0.16],
    shake: 2,
    lines: [
      'Stone under my hands. Rain in the walls.',
      'My recorder is still running, but I do not remember pressing record.',
      'Four Memory Shards. Three locks. A mirror in the Attic.',
      'If Elara is still here, I have to learn what Cyrus did to her.',
    ],
  },
  first_hide: {
    title: 'HOLD YOUR BREATH',
    subtitle: 'The manor listens for panic.',
    speaker: 'MAYA',
    duration: 4.8,
    ui: 'relief',
    lines: [
      'The dark closes around me.',
      'If Cyrus passes, I wait. Then I leave with H or E.',
    ],
  },
  ghost_awakened: {
    title: 'CYRUS STIRS',
    subtitle: 'Somewhere above, a locked door opens by itself.',
    speaker: 'CYRUS',
    duration: 4.6,
    whisper: true,
    flash: [140, 0, 70, 0.22],
    shake: 4,
    lines: [
      'You should not have come back to my house.',
    ],
  },
  first_chase: {
    title: 'RUN',
    subtitle: 'Lantern light bends away from him.',
    speaker: 'MAYA',
    duration: 3.4,
    flash: [190, 0, 0, 0.22],
    shake: 6,
    lines: [
      'He saw me.',
    ],
  },
  room_library: {
    title: 'FORGOTTEN LIBRARY',
    subtitle: 'Every page is damp, but one sentence keeps rewriting itself.',
    duration: 3.4,
    stinger: 'library',
  },
  room_dining: {
    title: 'DINING ROOM',
    subtitle: 'Nine places set. One chair scraped back in a hurry.',
    duration: 3.4,
    stinger: 'dining',
  },
  room_kitchen: {
    title: 'COLD KITCHEN',
    subtitle: 'The knives remember hands better than names.',
    duration: 3.4,
    stinger: 'kitchen',
  },
  room_childroom: {
    title: "ELARA'S ROOM",
    subtitle: 'A music box turns without a key.',
    duration: 4.2,
    stinger: 'childroom',
    whisper: true,
  },
  room_attic: {
    title: 'CURSED ATTIC',
    subtitle: 'The mirror waits where the roof forgets the sky.',
    duration: 4.2,
    stinger: 'attic',
    flash: [95, 45, 150, 0.14],
  },
  room_basement: {
    title: 'SEALED BASEMENT',
    subtitle: 'Water drips upward. The house is holding its breath.',
    duration: 4.2,
    stinger: 'basement',
    shake: 3,
  },
  room_bedroom: {
    title: 'MASTER BEDROOM',
    subtitle: 'The bed is made for someone who never wakes.',
    duration: 3.8,
    stinger: 'bedroom',
  },
  room_garden: {
    title: 'WITHERED GARDEN',
    subtitle: 'Moonlight pools in the dead grass like spilled milk.',
    duration: 3.4,
    stinger: 'garden',
  },
  memory_shard1: {
    title: 'MEMORY I',
    subtitle: 'The attic door. A child crying on the other side.',
    speaker: 'ELARA',
    duration: 5,
    flash: [120, 230, 255, 0.22],
    shake: 3,
    lines: [
      'Father said mirrors only tell lies.',
      'But this one showed me the room where he hid the key.',
    ],
  },
  memory_shard2: {
    title: 'MEMORY II',
    subtitle: 'Crayon on floorboards. A name crossed out.',
    speaker: 'ELARA',
    duration: 5,
    flash: [190, 120, 255, 0.2],
    shake: 3,
    lines: [
      'I drew the garden because mother missed the sun.',
      'Father burned the drawing, but the floor remembered.',
    ],
  },
  memory_shard3: {
    title: 'MEMORY III',
    subtitle: 'A stairwell. A heavy sound dragged below.',
    speaker: 'MAYA',
    duration: 5,
    flash: [255, 70, 70, 0.2],
    shake: 4,
    lines: [
      'The basement smells like river mud and iron.',
      'Cyrus did not bury the truth. He locked it underneath us.',
    ],
  },
  memory_shard4: {
    title: 'MEMORY IV',
    subtitle: 'A candle gutters out. The manor learns to breathe.',
    speaker: 'ELARA',
    duration: 5,
    flash: [255, 190, 90, 0.18],
    shake: 3,
    lines: [
      'When the candle died, the house spoke with father\'s voice.',
      'It promised him forever. It gave him this instead.',
    ],
  },
  all_memories: {
    title: 'THE TRUTH RETURNS',
    subtitle: 'Elara was never haunting the manor. She was trapped inside it.',
    speaker: 'MAYA',
    duration: 5.4,
    stinger: 'attic',
    flash: [210, 210, 255, 0.24],
    lines: [
      'All memory shards... I remember now.',
      'Cyrus murdered Elara and bound the house to hide it.',
      'The ritual mirror in the Attic is the only way to free her.',
    ],
  },
  ritual_ready: {
    title: 'THE MIRROR CALLS',
    subtitle: 'Every lock has opened. The house knows it is dying.',
    speaker: 'ELARA',
    duration: 4.6,
    stinger: 'attic',
    lines: [
      'Maya. Come to the Attic.',
      'Bring the truth into the glass.',
    ],
  },
  ritual_start: {
    title: 'RITUAL OF DAWN',
    subtitle: 'Hold the circle. Do not let Cyrus reach the mirror.',
    speaker: 'ELARA',
    duration: 5,
    ritualPulse: 1,
    flash: [110, 30, 190, 0.28],
    shake: 7,
    lines: [
      'The mirror pulses with violet light...',
      'The ritual has begun. Hold position.',
      'Cyrus is coming. Do not let him reach you.',
    ],
  },
  ending_free: {
    title: 'DAWN',
    subtitle: 'For the first time in seventy years, the manor is silent.',
    speaker: 'ELARA',
    duration: 4.8,
    ritualPulse: 1.3,
    flash: [255, 230, 160, 0.34],
    shake: 5,
    lines: [
      'The glass breaks.',
      'Elara breathes once, and the house exhales around her.',
    ],
  },
};

let overlay = null;
let titleEl = null;
let subtitleEl = null;
let activeTimer = 0;
let currentBeat = null;
let queue = [];

export function initCinematics() {
  overlay = document.getElementById('cinematicOverlay');
  titleEl = document.getElementById('cinematicTitle');
  subtitleEl = document.getElementById('cinematicSubtitle');
  queue = [];
  activeTimer = 0;
  currentBeat = null;
  hideOverlay();
  Object.assign(State.cinematic, {
    active: false,
    id: null,
    title: '',
    subtitle: '',
    timer: 0,
    duration: 0,
  });
}

export function playBeat(id, options = {}) {
  const beat = BEATS[id];
  if (!beat) return false;
  const force = !!options.force;
  if (!force && hasSeen(id)) return false;
  if (currentBeat || isDialogueActive()) {
    enqueueBeat(id, force);
    return true;
  }
  startBeat(id, beat, force);
  return true;
}

export function updateCinematics(dt) {
  if (activeTimer > 0) {
    activeTimer = Math.max(0, activeTimer - dt);
    State.cinematic.timer = activeTimer;
    if (activeTimer <= 0) {
      currentBeat = null;
      hideOverlay();
    }
  }

  if (!currentBeat && queue.length > 0 && !isDialogueActive()) {
    const next = queue.shift();
    const beat = BEATS[next.id];
    if (beat && (next.force || !hasSeen(next.id))) {
      startBeat(next.id, beat, next.force);
    }
  }
}

export function isCinematicActive() {
  return !!State.cinematic.active;
}

function enqueueBeat(id, force) {
  if (queue.some(entry => entry.id === id)) return;
  queue.push({ id, force });
  if (queue.length > 5) queue = queue.slice(queue.length - 5);
}

function startBeat(id, beat, force) {
  if (!force) markSeen(id);
  currentBeat = id;
  activeTimer = beat.duration || 3.5;
  Object.assign(State.cinematic, {
    active: true,
    id,
    title: beat.title || '',
    subtitle: beat.subtitle || '',
    timer: activeTimer,
    duration: activeTimer,
  });

  if (titleEl) titleEl.textContent = beat.title || '';
  if (subtitleEl) subtitleEl.textContent = beat.subtitle || '';
  overlay?.classList.remove('hidden');

  if (Array.isArray(beat.flash)) flashScreen(...beat.flash);
  if (beat.shake) shakeScreen(beat.shake);
  if (beat.ritualPulse) pulseRitual(beat.ritualPulse);
  if (beat.stinger) Audio.playRoomStinger(beat.stinger);
  if (beat.whisper) Audio.playGhostWhisper();
  if (beat.ui) Audio.playUISound(beat.ui);
  if (beat.lines?.length) showDialogue(beat.lines, beat.speaker || 'MAYA');
}

function hideOverlay() {
  overlay?.classList.add('hidden');
  State.cinematic.active = false;
  State.cinematic.id = null;
  State.cinematic.title = '';
  State.cinematic.subtitle = '';
  State.cinematic.timer = 0;
  State.cinematic.duration = 0;
}

function hasSeen(id) {
  return State.storyFlags?.seenBeats?.includes(id);
}

function markSeen(id) {
  if (!State.storyFlags) State.storyFlags = { seenBeats: [] };
  if (!Array.isArray(State.storyFlags.seenBeats)) State.storyFlags.seenBeats = [];
  if (!State.storyFlags.seenBeats.includes(id)) State.storyFlags.seenBeats.push(id);
}
