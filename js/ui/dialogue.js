// js/ui/dialogue.js — Typewriter Dialogue System

let _queue   = [];
let _current = null;
let _charIdx = 0;
let _timer   = 0;
let _waiting = false;
let _onDone  = null;

const CHAR_DELAY = 0.035; // seconds per character

export function showDialogue(lines, speaker = 'MAYA', onDone = null) {
  _queue   = Array.isArray(lines) ? [...lines] : [lines];
  _onDone  = onDone;
  _speaker = speaker;
  _nextLine();

  document.getElementById('dialogueBox')?.classList.remove('hidden');
  // Space key to advance
  const handler = (e) => {
    if (e.code === 'Space') {
      if (_charIdx < (_current?.length || 0)) {
        // Skip to end of current line
        _charIdx = _current.length;
        document.getElementById('dialogueText').textContent = _current;
        _waiting = true;
      } else if (_waiting) {
        if (_queue.length > 0) {
          _nextLine();
        } else {
          _closeDialogue();
          window.removeEventListener('keydown', handler);
        }
      }
    }
  };
  window.addEventListener('keydown', handler);
  _spaceHandler = handler;
}

let _spaceHandler = null;
let _speaker = 'MAYA';

function _nextLine() {
  _current = _queue.shift();
  _charIdx = 0;
  _waiting = false;
  document.getElementById('dialogueText').textContent = '';
  document.getElementById('dialogueSpeaker').textContent = _speaker;
}

function _closeDialogue() {
  document.getElementById('dialogueBox')?.classList.add('hidden');
  if (_onDone) _onDone();
  _current = null; _queue = []; _waiting = false;
  if (_spaceHandler) window.removeEventListener('keydown', _spaceHandler);
}

export function updateDialogue(dt) {
  if (!_current) return;

  if (_charIdx < _current.length) {
    _timer -= dt;
    if (_timer <= 0) {
      _timer = CHAR_DELAY;
      _charIdx++;
      document.getElementById('dialogueText').textContent = _current.slice(0, _charIdx);
    }
  } else {
    _waiting = true;
  }
}

export function isDialogueActive() {
  return !!_current;
}
