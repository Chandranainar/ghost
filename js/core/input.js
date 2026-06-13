// js/core/input.js — Keyboard & Mouse Input

export const Keys = {};
export const Mouse = { dx: 0, dy: 0, locked: false, btnF: false };

let _mouseDx = 0;

export function initInput(canvas) {
  window.addEventListener('keydown', e => {
    Keys[e.code] = true;
    // Prevent arrow keys and space scrolling page
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', e => {
    Keys[e.code] = false;
  });

  // Pointer lock for mouse-look
  const clickOverlay = document.getElementById('clickOverlay');

  const requestLock = () => {
    // Only request lock when game container is visible (game has started)
    const gameContainer = document.getElementById('gameContainer');
    if (!gameContainer || gameContainer.classList.contains('hidden')) return;
    console.log('🖱️ Requesting pointer lock...');
    canvas.requestPointerLock();
  };

  canvas.addEventListener('click', requestLock);
  if (clickOverlay) {
    clickOverlay.addEventListener('click', requestLock);
  }

  document.addEventListener('pointerlockchange', () => {
    Mouse.locked = document.pointerLockElement === canvas;
    console.log('🔒 Pointer lock changed:', Mouse.locked);
    const overlay = document.getElementById('clickOverlay');
    if (overlay) {
      // Hide the overlay when locked, show it when unlocked (but only if game is running)
      if (Mouse.locked) {
        overlay.style.display = 'none';
        overlay.classList.add('locked');
      } else {
        const gameContainer = document.getElementById('gameContainer');
        // Only show overlay again if game container is visible
        if (gameContainer && !gameContainer.classList.contains('hidden')) {
          overlay.style.display = 'flex';
          overlay.classList.remove('locked');
        } else {
          overlay.style.display = 'none';
        }
      }
    }
  });

  document.addEventListener('pointerlockerror', () => {
    console.error('❌ Pointer lock failed (pointerlockerror). Must click inside the page from a user gesture.');
  });

  document.addEventListener('mousemove', e => {
    if (Mouse.locked) {
      _mouseDx += e.movementX;
    }
  });

  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) Mouse.btnF = true;
  });
  canvas.addEventListener('mouseup', e => {
    if (e.button === 0) Mouse.btnF = false;
  });
}

// Call once per frame to get accumulated mouse dx
export function consumeMouseDx() {
  const dx = _mouseDx;
  _mouseDx = 0;
  return dx;
}

export function isDown(code)    { return !!Keys[code]; }
export function isRunning()     { return !!Keys['ShiftLeft'] || !!Keys['ShiftRight']; }
export function isInteract()    { return !!Keys['KeyE']; }
export function isHide()        { return !!Keys['KeyH']; }
export function isMap()         { return !!Keys['KeyM']; }
export function isPause()       { return !!Keys['Escape']; }
export function isFreeze()      { return !!Keys['KeyF'] || Mouse.btnF; }
