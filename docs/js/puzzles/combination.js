// js/puzzles/combination.js — Kitchen Combination Lock
// 3-digit code dynamically generated per run. Clues scattered in manor.

import { State } from '../core/state.js';
import { Audio } from '../core/audio.js';

let correctCode = [0, 0, 0];
let playerDials = [0, 0, 0];

export function generateCode() {
  // Digits 1-9 to avoid trivial zeros
  correctCode = [
    1 + Math.floor(Math.random() * 8),
    1 + Math.floor(Math.random() * 8),
    1 + Math.floor(Math.random() * 8),
  ];
  // Update the clue notes with the actual numbers
  State.comboCode = correctCode;
  return correctCode;
}

export function buildComboUI(onSolve, onClose) {
  playerDials = [0, 0, 0];
  correctCode = Array.isArray(State.comboCode) && State.comboCode.length === 3
    ? State.comboCode.map(Number)
    : generateCode();
  const modal = document.getElementById('puzzleModal');
  modal.innerHTML = `
    <button class="puzzle-close-btn" id="pzCloseBtn">✕</button>
    <div class="puzzle-title">COMBINATION LOCK</div>
    <div class="puzzle-desc">
      Three numbers hide in the manor's shadows...<br>
      <small style="color:#444">Find the torn notes to discover each digit.</small>
    </div>
    <div class="combo-dials">
      ${[0,1,2].map(i => `
        <div class="dial-wrap">
          <button class="dial-up" data-i="${i}">▲</button>
          <div class="dial-num" id="dial${i}">${playerDials[i]}</div>
          <button class="dial-down" data-i="${i}">▼</button>
        </div>
      `).join('')}
    </div>
    <button class="combo-submit" id="comboSubmit">UNLOCK</button>
    <div id="comboFeedback" style="text-align:center;margin-top:12px;min-height:20px;font-size:0.9rem;color:#666;"></div>
  `;

  document.getElementById('pzCloseBtn').onclick = onClose;

  document.querySelectorAll('.dial-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.i);
      playerDials[i] = (playerDials[i] + 1) % 10;
      document.getElementById(`dial${i}`).textContent = playerDials[i];
    });
  });
  document.querySelectorAll('.dial-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.i);
      playerDials[i] = (playerDials[i] + 9) % 10;
      document.getElementById(`dial${i}`).textContent = playerDials[i];
    });
  });

  document.getElementById('comboSubmit').addEventListener('click', () => {
    const fb = document.getElementById('comboFeedback');
    if (playerDials[0] === correctCode[0] &&
        playerDials[1] === correctCode[1] &&
        playerDials[2] === correctCode[2]) {
      fb.textContent = 'The lock clicks open.';
      fb.style.color = '#00ff88';
      Audio.playPuzzleSolve();
      State.puzzles.combo.solved = true;
      State.puzzlesSolved++;
      setTimeout(onSolve, 1500);
    } else {
      fb.textContent = `Wrong - ${Math.max(0, 3 - [0,1,2].filter(i => playerDials[i] !== correctCode[i]).length)} digit(s) correct`;
      fb.style.color = '#dc143c';
      Audio.playGhostWhisper();
      State.screenFlash = { alpha: 0.2, r: 150, g: 0, b: 0 };
    }
  });
}
