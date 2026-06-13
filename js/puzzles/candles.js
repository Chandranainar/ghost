// js/puzzles/candles.js — Dining Room Candle Ritual
// 5 candles. Light them in the correct order (based on number clue from note).
// Wrong order = ghost event (flash + shriek).

import { State } from '../core/state.js';
import { Audio } from '../core/audio.js';

// Correct order is 3-1-5-2-4 (tied to lore clue in note)
const CORRECT_ORDER = [3, 1, 5, 2, 4];
let litOrder = [];

export function buildCandleUI(onSolve, onClose) {
  litOrder = [];
  const modal = document.getElementById('puzzleModal');
  modal.innerHTML = `
    <button class="puzzle-close-btn" id="pzCloseBtn">✕</button>
    <div class="puzzle-title">CANDLE RITUAL</div>
    <div class="puzzle-desc">
      "Light the candles in the order of the Blackwood children's birth..."<br>
      <small style="color:#444">(The diary mentions: Cyrus Jr, Elara, Thomas, Rose, and the last...)</small>
    </div>
    <div class="candle-grid" id="candleGrid">
      ${[1,2,3,4,5].map(n => `
        <div class="candle-slot" id="candle${n}" data-num="${n}">
          <div class="candle-flame" id="flame${n}"></div>
          <div class="candle-body"></div>
          <div class="candle-num">CANDLE ${n}</div>
        </div>
      `).join('')}
    </div>
    <div id="candleFeedback" style="text-align:center;margin-top:16px;min-height:24px;font-size:0.9rem;color:#666;"></div>
    <div style="text-align:center;margin-top:8px;">
      <button class="combo-submit" id="candleReset">RESET CANDLES</button>
    </div>
  `;

  document.getElementById('pzCloseBtn').onclick = onClose;
  document.getElementById('candleReset').onclick = () => {
    litOrder = [];
    document.querySelectorAll('.candle-flame').forEach(f => f.classList.remove('lit'));
    document.querySelectorAll('.candle-slot').forEach(s => s.classList.remove('active'));
    document.getElementById('candleFeedback').textContent = '';
  };

  document.querySelectorAll('.candle-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const n = parseInt(slot.dataset.num);
      if (litOrder.includes(n)) return; // already lit

      litOrder.push(n);
      document.getElementById(`flame${n}`).classList.add('lit');
      slot.classList.add('active');

      const idx = litOrder.length - 1;
      if (litOrder[idx] !== CORRECT_ORDER[idx]) {
        // Wrong!
        document.getElementById('candleFeedback').textContent = 'The flames extinguish - wrong order.';
        document.getElementById('candleFeedback').style.color = '#dc143c';
        Audio.playGhostShriek();
        State.screenFlash = { alpha: 0.35, r: 180, g: 0, b: 0 };

        // Ghost investigates
        const g = State.ghost;
        const p = State.player;
        g.state = 'investigate';
        g.lastHeardX = p.x;
        g.lastHeardY = p.y;

        setTimeout(() => {
          litOrder = [];
          document.querySelectorAll('.candle-flame').forEach(f => f.classList.remove('lit'));
          document.querySelectorAll('.candle-slot').forEach(s => s.classList.remove('active'));
          document.getElementById('candleFeedback').textContent = '';
        }, 1200);
        return;
      }

      if (litOrder.length === CORRECT_ORDER.length) {
        document.getElementById('candleFeedback').textContent = 'The ritual flames hold.';
        document.getElementById('candleFeedback').style.color = '#00ff88';
        Audio.playPuzzleSolve();
        State.puzzles.candles.solved = true;
        State.puzzlesSolved++;
        setTimeout(onSolve, 1500);
      }
    });
  });
}
