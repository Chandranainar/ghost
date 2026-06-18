// js/main.js — Entry Point: Story Screen + Menu + Wires Everything Together

import { initEngine, startGame, triggerDeath, triggerVictory, togglePause } from './core/engine.js';
import { Audio } from './core/audio.js';
import { hasSave } from './systems/save.js';

// ======================== DEBUG LOGGER ========================
function debugLog(...args) {
  const msg = args.join(' ');
  console.log(msg);
  const debugEl = document.getElementById('debugText');
  if (debugEl && isDebugMode()) {
    debugEl.innerHTML += msg + '<br>';
  }
}

function isDebugMode() {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

// ======================== STORY INTRO ========================
const STORY_LINES = [
  'October 31st. 11:58 PM.',
  'The last road into Blackwood bends through dead trees and old rain.',
  'I came chasing a missing-person story the police had already buried.',
  'At the gate, my recorder caught a child humming beneath the static.',
  'Then the manor lights opened one by one, like eyes.',
  'The locals were right about Cyrus Blackwood.',
  'They were wrong about one thing: the house does not wait for victims.',
  'It invites witnesses.',
  'That witness was me.',
  'And I just woke up inside.',
];

let storyIdx   = 0;
let storyChar  = 0;
let storyTimer = null;
let storyDone  = false;

function startStory() {
  debugLog('📖 startStory called');
  const screen = document.getElementById('storyScreen');
  const textEl = document.getElementById('storyText');
  const skipBtn = document.getElementById('storySkip');
  
  debugLog('Found elements:', !!screen, !!textEl, !!skipBtn);
  
  if (!screen || !textEl || !skipBtn) {
    debugLog('❌ Missing story elements!');
    console.error('Missing elements:', {screen, textEl, skipBtn});
    return;
  }

  // Make sure screen is visible
  screen.classList.remove('hidden');
  screen.style.display = 'flex';
  screen.style.visibility = 'visible';
  
  debugLog('✓ Story screen visible');

  // Reset story state for fresh start
  storyIdx = 0;
  storyChar = 0;
  storyDone = false;
  if (storyTimer) clearTimeout(storyTimer);
  storyTimer = null;

  // Attach skip button handler
  skipBtn.onclick = null; // Clear any previous handlers
  skipBtn.addEventListener('click', () => {
    debugLog('⏭ Skip clicked');
    finishStory();
  }, { once: false });

  function typeNextLine() {
    if (storyIdx >= STORY_LINES.length) {
      debugLog('✓ Story lines complete');
      finishStory();
      return;
    }
    const line = STORY_LINES[storyIdx];
    debugLog(`📝 Line ${storyIdx}: ${line.substring(0, 30)}...`);
    storyChar = 0;
    textEl.textContent = '';

    const interval = setInterval(() => {
      storyChar++;
      textEl.textContent = line.slice(0, storyChar);
      if (storyChar >= line.length) {
        clearInterval(interval);
        storyIdx++;
        storyTimer = setTimeout(typeNextLine, 2200);
      }
    }, 45);
  }

  debugLog('📖 Starting to type story lines...');
  typeNextLine();
}

function finishStory() {
  debugLog('✓ finishStory called, storyDone=' + storyDone);
  if (storyDone) return;
  storyDone = true;
  if (storyTimer) clearTimeout(storyTimer);

  const screen = document.getElementById('storyScreen');
  if (!screen) {
    debugLog('❌ Story screen not found');
    showMenu();
    return;
  }
  
  debugLog('⏸ Fading out story...');
  screen.classList.add('fade-out');
  setTimeout(() => {
    debugLog('🎬 Showing menu');
    screen.classList.add('hidden');
    showMenu();
  }, 1000);
}

// ======================== MAIN MENU ========================
function showMenu() {
  console.log('🎭 showMenu called');
  const menu = document.getElementById('mainMenu');
  if (!menu) {
    console.error('❌ Main menu not found');
    return;
  }
  menu.classList.remove('hidden');
  console.log('✓ Main menu visible');

  // Update continue button visibility
  const btnContinue = document.getElementById('btnContinue');
  if (btnContinue) {
    btnContinue.style.opacity = hasSave() ? '1' : '0.35';
    btnContinue.style.pointerEvents = hasSave() ? 'auto' : 'none';
  }

  document.getElementById('btnNewGame')?.addEventListener('click', () => {
    console.log('🎮 New Game clicked');
    Audio.init();
    Audio.resume();
    menu.classList.add('hidden');
    startGame(false);
  });

  document.getElementById('btnContinue')?.addEventListener('click', () => {
    if (!hasSave()) return;
    console.log('📁 Continue clicked');
    Audio.init();
    Audio.resume();
    menu.classList.add('hidden');
    startGame(true);
  });

  document.getElementById('btnHowTo')?.addEventListener('click', () => {
    console.log('📖 How to play clicked');
    document.getElementById('howToPanel')?.classList.remove('hidden');
  });

  document.getElementById('btnCloseHowTo')?.addEventListener('click', () => {
    document.getElementById('howToPanel')?.classList.add('hidden');
  });
}

// ======================== IN-GAME UI WIRING ========================
function wireInGameUI() {
  // Pause menu
  document.getElementById('btnResume')?.addEventListener('click', () => {
    togglePause();
  });

  document.getElementById('btnSave')?.addEventListener('click', () => {
    import('./systems/save.js').then(m => {
      m.saveGame();
      const msg = document.createElement('div');
      msg.textContent = 'Game Saved';
      msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);color:#00ff88;padding:16px 32px;font-family:monospace;font-size:1.2rem;z-index:9999;border:1px solid #00ff88;letter-spacing:3px;';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 2000);
    });
  });

  document.getElementById('btnQuit')?.addEventListener('click', () => {
    location.reload();
  });

  document.getElementById('btnPlayAgain')?.addEventListener('click', () => {
    location.reload();
  });

  // Full map close on M key (handled by engine) but also click outside
  document.getElementById('fullMapOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
      import('./core/input.js').then(() => {
        document.getElementById('gameCanvas')?.requestPointerLock();
      });
    }
  });
}

// ======================== BOOT ========================
window.addEventListener('error', (e) => {
  debugLog('❌ Error event: ' + e.message);
  console.error('Error:', e);
});

window.addEventListener('unhandledrejection', (e) => {
  debugLog('❌ Unhandled rejection: ' + e.reason);
  console.error('Unhandled rejection:', e.reason);
});

window.addEventListener('DOMContentLoaded', () => {
  debugLog('🎮 Game boot started');
  
  const debugInfo = document.getElementById('debugInfo');
  if (debugInfo) {
    debugInfo.style.display = isDebugMode() ? 'block' : 'none';
  }
  
  try {
    debugLog('Initializing engine...');
    initEngine();
    debugLog('✓ Engine initialized');
    
    debugLog('Wiring UI...');
    wireInGameUI();
    debugLog('✓ UI wired');
    
    debugLog('Starting story...');
    startStory();
    debugLog('✓ Story started');
  } catch (error) {
    debugLog('❌ Boot error: ' + error.message);
    console.error('Boot error:', error);
    // Try to show story anyway even if engine fails
    try {
      debugLog('Attempting fallback story...');
      startStory();
    } catch (e) {
      debugLog('❌ Fallback failed: ' + e.message);
    }
  }
});
