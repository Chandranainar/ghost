// js/puzzles/symbols.js — Library Symbol Sequence Puzzle
// Player sees 4 rune symbols on the wall. Must press them in order.

import { State } from '../core/state.js';
import { Audio } from '../core/audio.js';

const SYMBOLS = ['ASH','BONE','VEIL','MOON','WICK','WELL','ROSE','EYE'];
let correctSeq = [];
let playerSeq  = [];

export function initSymbolPuzzle() {
  // Generate a 4-symbol sequence
  const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5);
  correctSeq = shuffled.slice(0, 4);
  playerSeq  = [];
  return correctSeq;
}

export function buildSymbolUI(onSolve, onClose) {
  const seq = initSymbolPuzzle();
  playerSeq = [];
  const modal = document.getElementById('puzzleModal');
  modal.innerHTML = `
    <button class="puzzle-close-btn" id="pzCloseBtn">✕</button>
    <div class="puzzle-title">LIBRARY CIPHER</div>
    <div class="puzzle-desc">The wall carves a sequence into the dust. Memorize and repeat it.</div>
    <div class="symbol-display" id="symDisplay">
      ${seq.map(s => `<div class="sym-box">${s}</div>`).join('')}
    </div>
    <div class="puzzle-desc" style="margin-bottom:12px;color:#555;">Press the symbols in the correct order:</div>
    <div class="symbol-grid" id="symGrid">
      ${SYMBOLS.map(s => `<button class="sym-btn" data-sym="${s}">${s}</button>`).join('')}
    </div>
    <div id="symFeedback" style="text-align:center;margin-top:12px;height:20px;font-size:0.9rem;color:#666;"></div>
  `;

  document.getElementById('pzCloseBtn').onclick = onClose;

  // Briefly show sequence then hide it
  const display = document.getElementById('symDisplay');
  setTimeout(() => {
    display.querySelectorAll('.sym-box').forEach(b => b.textContent = '?');
  }, 2500);

  document.querySelectorAll('.sym-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sym = btn.dataset.sym;
      playerSeq.push(sym);
      btn.classList.add('correct');
      setTimeout(() => btn.classList.remove('correct'), 300);

      const idx = playerSeq.length - 1;
      if (playerSeq[idx] !== correctSeq[idx]) {
        // Wrong!
        btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 400);
        document.getElementById('symFeedback').textContent = 'Wrong sequence - try again';
        document.getElementById('symFeedback').style.color = '#dc143c';
        playerSeq = [];
        // Re-reveal sequence briefly
        display.querySelectorAll('.sym-box').forEach((b, i) => { b.textContent = seq[i]; });
        setTimeout(() => display.querySelectorAll('.sym-box').forEach(b => b.textContent = '?'), 2000);
        Audio.playGhostWhisper();
        return;
      }

      if (playerSeq.length === correctSeq.length) {
        // Solved!
        document.getElementById('symFeedback').textContent = 'The cipher is broken.';
        document.getElementById('symFeedback').style.color = '#00ff88';
        display.querySelectorAll('.sym-box').forEach((b, i) => { b.textContent = seq[i]; b.style.borderColor = '#00ff88'; });
        Audio.playPuzzleSolve();
        State.puzzles.symbols.solved = true;
        State.puzzlesSolved++;
        setTimeout(onSolve, 1500);
      }
    });
  });
}
