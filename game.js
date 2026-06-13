// ==================== CANVAS SETUP ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 768;

// ==================== AUDIO SYSTEM ====================
class AudioManager {
       constructor() {
              this.sounds = {};
              this.enabled = true;
              this.initialized = false;
              this.ambientOsc = null;
              this.windNode = null;
       }

       init() {
              if (this.initialized) return;
              try {
                     this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                     this.initialized = true;
                     this.startAmbient();
              } catch (e) {
                     console.error("Web Audio API not supported", e);
              }
       }

       resume() {
              if (!this.initialized) {
                     this.init();
              } else if (this.audioContext && this.audioContext.state === 'suspended') {
                     this.audioContext.resume();
              }
       }

       play(soundName) {
              this.resume();
              if (!this.enabled || !this.initialized) return;

              switch (soundName) {
                     case 'doorCreak':
                            this.playDoorCreak();
                            break;
                     case 'ghostWhisper':
                            this.playGhostWhisper();
                            break;
                     case 'itemPickup':
                            this.playItemPickup();
                            break;
                     case 'puzzleSolve':
                            this.playPuzzleSolve();
                            break;
                     case 'clockChime':
                            this.playClockChime();
                            break;
                     case 'breathing':
                            this.playBreathing();
                            break;
              }
       }

       playFootstep(roomType, isRunning = false) {
              this.resume();
              if (!this.enabled || !this.initialized) return;

              const ctx = this.audioContext;
              const now = ctx.currentTime;
              const speedMult = isRunning ? 1.3 : 1.0;
              const volume = isRunning ? 0.25 : 0.12;

              if (roomType === 'grass') {
                     // Rustling grass: white noise sweep
                     const bufferSize = ctx.sampleRate * 0.12;
                     const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                     const data = buffer.getChannelData(0);
                     for (let i = 0; i < bufferSize; i++) {
                            data[i] = (Math.random() * 2 - 1) * volume;
                     }
                     const source = ctx.createBufferSource();
                     source.buffer = buffer;

                     const filter = ctx.createBiquadFilter();
                     filter.type = 'bandpass';
                     filter.frequency.setValueAtTime(800, now);
                     filter.Q.setValueAtTime(1.5, now);

                     const gain = ctx.createGain();
                     gain.gain.setValueAtTime(1.0, now);
                     gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 * speedMult);

                     source.connect(filter);
                     filter.connect(gain);
                     gain.connect(ctx.destination);
                     source.start(now);
              } else if (roomType === 'stone') {
                     // Stone: sharp high-mid click
                     const osc = ctx.createOscillator();
                     const gain = ctx.createGain();
                     osc.type = 'triangle';
                     osc.frequency.setValueAtTime(130, now);
                     osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

                     gain.gain.setValueAtTime(volume * 0.8, now);
                     gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                     osc.connect(gain);
                     gain.connect(ctx.destination);
                     osc.start(now);
                     osc.stop(now + 0.08);
              } else {
                     // Wood: heavy low thump + creak
                     const osc = ctx.createOscillator();
                     const gain = ctx.createGain();
                     osc.type = 'sine';
                     osc.frequency.setValueAtTime(75, now);
                     osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

                     gain.gain.setValueAtTime(volume * 1.2, now);
                     gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

                     osc.connect(gain);
                     gain.connect(ctx.destination);
                     osc.start(now);
                     osc.stop(now + 0.14);

                     // Occasional creak
                     if (Math.random() < 0.25) {
                            const creak = ctx.createOscillator();
                            const creakGain = ctx.createGain();
                            const filter = ctx.createBiquadFilter();

                            creak.type = 'sawtooth';
                            creak.frequency.setValueAtTime(400, now);
                            creak.frequency.linearRampToValueAtTime(550, now + 0.22);

                            filter.type = 'bandpass';
                            filter.frequency.setValueAtTime(1400, now);
                            filter.Q.setValueAtTime(3.0, now);

                            creakGain.gain.setValueAtTime(0.015, now);
                            creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

                            creak.connect(filter);
                            filter.connect(creakGain);
                            creakGain.connect(ctx.destination);
                            creak.start(now);
                            creak.stop(now + 0.22);
                     }
              }
       }

       playHeartbeat(fearLevel) {
              this.resume();
              if (!this.enabled || !this.initialized) return;

              const ctx = this.audioContext;
              const now = ctx.currentTime;
              const intensity = fearLevel / 100;

              // Beat 1
              const osc1 = ctx.createOscillator();
              const gain1 = ctx.createGain();
              osc1.type = 'sine';
              osc1.frequency.setValueAtTime(55, now);
              osc1.frequency.exponentialRampToValueAtTime(25, now + 0.15);

              gain1.gain.setValueAtTime(0.25 + intensity * 0.35, now);
              gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

              osc1.connect(gain1);
              gain1.connect(ctx.destination);
              osc1.start(now);
              osc1.stop(now + 0.15);

              // Beat 2
              const beat2Time = now + 0.18;
              const osc2 = ctx.createOscillator();
              const gain2 = ctx.createGain();
              osc2.type = 'sine';
              osc2.frequency.setValueAtTime(50, beat2Time);
              osc2.frequency.exponentialRampToValueAtTime(20, beat2Time + 0.15);

              gain2.gain.setValueAtTime(0.15 + intensity * 0.25, beat2Time);
              gain2.gain.exponentialRampToValueAtTime(0.001, beat2Time + 0.15);

              osc2.connect(gain2);
              gain2.connect(ctx.destination);
              osc2.start(beat2Time);
              osc2.stop(beat2Time + 0.15);
       }

       playDoorCreak() {
              const ctx = this.audioContext;
              const now = ctx.currentTime;

              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              const filter = ctx.createBiquadFilter();

              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(150, now);
              osc.frequency.linearRampToValueAtTime(320, now + 0.7);
              osc.frequency.linearRampToValueAtTime(130, now + 1.4);

              filter.type = 'bandpass';
              filter.frequency.setValueAtTime(1000, now);
              filter.frequency.linearRampToValueAtTime(1400, now + 0.7);
              filter.frequency.linearRampToValueAtTime(700, now + 1.4);
              filter.Q.setValueAtTime(2.0, now);

              gain.gain.setValueAtTime(0.04, now);
              gain.gain.linearRampToValueAtTime(0.07, now + 0.5);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

              osc.connect(filter);
              filter.connect(gain);
              gain.connect(ctx.destination);
              osc.start(now);
              osc.stop(now + 1.4);
       }

       playGhostWhisper() {
              const ctx = this.audioContext;
              const now = ctx.currentTime;

              const bufferSize = ctx.sampleRate * 2.0;
              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
              const data = buffer.getChannelData(0);
              for (let i = 0; i < bufferSize; i++) {
                     data[i] = Math.random() * 2 - 1;
              }

              const noise = ctx.createBufferSource();
              noise.buffer = buffer;

              const filter = ctx.createBiquadFilter();
              filter.type = 'bandpass';
              filter.Q.setValueAtTime(18.0, now);
              filter.frequency.setValueAtTime(300, now);
              filter.frequency.exponentialRampToValueAtTime(2800, now + 0.8);
              filter.frequency.exponentialRampToValueAtTime(180, now + 1.8);

              const gain = ctx.createGain();
              gain.gain.setValueAtTime(0.07, now);
              gain.gain.linearRampToValueAtTime(0.12, now + 0.8);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

              noise.connect(filter);
              filter.connect(gain);
              gain.connect(ctx.destination);

              noise.start(now);
              noise.stop(now + 1.9);
       }

       playItemPickup() {
              const ctx = this.audioContext;
              const now = ctx.currentTime;
              const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord

              notes.forEach((freq, idx) => {
                     const osc = ctx.createOscillator();
                     const gain = ctx.createGain();
                     osc.type = 'triangle';
                     osc.connect(gain);
                     gain.connect(ctx.destination);

                     osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                     gain.gain.setValueAtTime(0.1, now + idx * 0.08);
                     gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

                     osc.start(now + idx * 0.08);
                     osc.stop(now + idx * 0.08 + 0.25);
              });
       }

       playPuzzleSolve() {
              const ctx = this.audioContext;
              const now = ctx.currentTime;
              const notes = [523.25, 659.25, 783.99, 1046.50];

              notes.forEach((freq, idx) => {
                     const osc = ctx.createOscillator();
                     const gain = ctx.createGain();
                     osc.type = 'sine';
                     osc.connect(gain);
                     gain.connect(ctx.destination);

                     osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                     gain.gain.setValueAtTime(0.08, now + idx * 0.1);
                     gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

                     osc.start(now + idx * 0.1);
                     osc.stop(now + idx * 0.1 + 0.6);
              });
       }

       playClockChime() {
              const ctx = this.audioContext;
              const now = ctx.currentTime;
              const freqs = [110, 165, 220, 330];

              freqs.forEach((freq, idx) => {
                     const osc = ctx.createOscillator();
                     const gain = ctx.createGain();
                     osc.type = 'sine';
                     osc.connect(gain);
                     gain.connect(ctx.destination);

                     osc.frequency.setValueAtTime(freq, now);
                     gain.gain.setValueAtTime(idx === 0 ? 0.2 : 0.06, now);
                     gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

                     osc.start(now);
                     osc.stop(now + 2.0);
              });
       }

       playBreathing() {
              const ctx = this.audioContext;
              const now = ctx.currentTime;

              // Inhale (0.5s)
              const osc1 = ctx.createOscillator();
              const gain1 = ctx.createGain();
              const filter1 = ctx.createBiquadFilter();
              osc1.type = 'sawtooth';
              osc1.frequency.setValueAtTime(95, now);
              filter1.type = 'bandpass';
              filter1.frequency.setValueAtTime(250, now);
              filter1.frequency.linearRampToValueAtTime(420, now + 0.55);
              filter1.Q.setValueAtTime(2.0, now);

              gain1.gain.setValueAtTime(0.001, now);
              gain1.gain.linearRampToValueAtTime(0.04, now + 0.25);
              gain1.gain.linearRampToValueAtTime(0.001, now + 0.55);

              osc1.connect(filter1);
              filter1.connect(gain1);
              gain1.connect(ctx.destination);

              osc1.start(now);
              osc1.stop(now + 0.55);

              // Exhale (0.6s)
              const osc2 = ctx.createOscillator();
              const gain2 = ctx.createGain();
              const filter2 = ctx.createBiquadFilter();
              osc2.type = 'sawtooth';
              osc2.frequency.setValueAtTime(85, now + 0.6);
              filter2.type = 'bandpass';
              filter2.frequency.setValueAtTime(380, now + 0.6);
              filter2.frequency.linearRampToValueAtTime(220, now + 1.25);
              filter2.Q.setValueAtTime(2.0, now + 0.6);

              gain2.gain.setValueAtTime(0.001, now + 0.6);
              gain2.gain.linearRampToValueAtTime(0.055, now + 0.85);
              gain2.gain.linearRampToValueAtTime(0.001, now + 1.25);

              osc2.connect(filter2);
              filter2.connect(gain2);
              gain2.connect(ctx.destination);

              osc2.start(now + 0.6);
              osc2.stop(now + 1.25);
       }

       startAmbient() {
              if (!this.enabled || !this.initialized) return;
              if (this.ambientOsc) return;

              const ctx = this.audioContext;
              const now = ctx.currentTime;

              // Low drone
              const osc1 = ctx.createOscillator();
              const osc2 = ctx.createOscillator();
              const filter = ctx.createBiquadFilter();
              const gain = ctx.createGain();

              osc1.type = 'sawtooth';
              osc1.frequency.setValueAtTime(55, now);
              osc2.type = 'triangle';
              osc2.frequency.setValueAtTime(55.4, now);

              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(140, now);

              gain.gain.setValueAtTime(0.05, now);

              osc1.connect(filter);
              osc2.connect(filter);
              filter.connect(gain);
              gain.connect(ctx.destination);

              osc1.start();
              osc2.start();

              this.ambientOsc = { osc1, osc2, filter, gain };

              // Ominous wind noise loop
              const bufferSize = ctx.sampleRate * 2.0;
              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
              const data = buffer.getChannelData(0);
              for (let i = 0; i < bufferSize; i++) {
                     data[i] = Math.random() * 2 - 1;
              }

              const noise = ctx.createBufferSource();
              noise.buffer = buffer;
              noise.loop = true;

              const windFilter = ctx.createBiquadFilter();
              windFilter.type = 'bandpass';
              windFilter.frequency.setValueAtTime(320, now);
              windFilter.Q.setValueAtTime(3.5, now);

              const windGain = ctx.createGain();
              windGain.gain.setValueAtTime(0.012, now);

              noise.connect(windFilter);
              windFilter.connect(windGain);
              windGain.connect(ctx.destination);
              noise.start();

              this.windNode = { source: noise, filter: windFilter, gain: windGain };

              const sweepWind = () => {
                     if (!this.initialized) return;
                     const targetFreq = 180 + Math.random() * 450;
                     const targetGain = 0.007 + Math.random() * 0.014;
                     const time = 3.0 + Math.random() * 4.0;
                     const sweepNow = ctx.currentTime;
                     windFilter.frequency.exponentialRampToValueAtTime(targetFreq, sweepNow + time);
                     windGain.gain.linearRampToValueAtTime(targetGain, sweepNow + time);
                     this.windTimeout = setTimeout(sweepWind, time * 1000);
              };
              sweepWind();
       }
}

const audio = new AudioManager();

// ==================== GAME STATE ====================
// ==================== GAME STATE ====================
let gameRunning = true;
let currentRoom = 'entrance';
let timeLeft = 60; // minutes
let timeSeconds = 0;
let gameTimer = null;
let lastTimestamp = Date.now();
let fearLevel = 0;
let screenShake = 0;
let screenFlash = 0;
let vignetteIntensity = 0;
let lightsOn = false; // fuse not installed yet

// Player setup
const player = {
       x: 8 * 64 + 32, // middle of entrance hall
       y: 8 * 64 + 32,
       angle: -Math.PI / 2, // looking UP
       radius: 18,
       speed: 2.2,
       runSpeed: 3.8,
       isRunning: false,
       health: 100,
       lanternRadius: 100,
       inventory: [],
       maxInventory: 4,
       stamina: 100,
       maxStamina: 100,
       exhausted: false,
       walkCycle: 0,
       isHiding: false,
       hidingSpotRef: null
};

// Stalker Ghost
const ghost = {
       x: 4 * 64,
       y: 4 * 64,
       room: 'library',
       speed: 1.1,
       active: false,
       visible: false,
       lastSeen: 0,
       frozen: false,
       freezeEnd: 0,
       lastHeartbeat: 0
};

let ghostPointedTimer = 0; // charge timer for flashlight freeze

let memoryFragments = [];
let puzzlesSolved = {
       library: false,
       well: false
};
let hasLocket = false;
let showingDialogue = false;

// Helpers to parse map strings
function parseMap(gridStr) {
       return gridStr.map(row => row.split('').map(Number));
}

// 16x16 Room Grid Maps
const roomMaps = {
       entrance: parseMap([
              "1111111111111111",
              "1000000000000001",
              "1000000000000001",
              "1001100110011001",
              "1001000000001001",
              "1001000000001001",
              "1000000000000001",
              "1000000000000000", // Right door (to garden)
              "1000000000000000",
              "1001000000001001",
              "1001000000001001",
              "1001100110011001",
              "1000000000000001",
              "1000000000000001",
              "1000000000000001",
              "1111111100111111"  // Down door (to library)
       ]),
       library: parseMap([
              "1111111100111111", // Up door (to entrance)
              "1000000000000001",
              "1022022002202201",
              "1020002002000201",
              "1020002002000201",
              "1000000000000001",
              "1000000000000001",
              "1022022002202201",
              "1022022002202201",
              "1000000000000001",
              "1000000000000001",
              "1020002002000201",
              "1020002002000201",
              "1022022002202201",
              "1000000000000001",
              "1111111100111111"  // Down door (to dining)
       ]),
       dining: parseMap([
              "1111111100111111", // Up door (to library)
              "1000000000000001",
              "1033300000033301",
              "1030000000000301",
              "1030000000000301",
              "1000000000000001",
              "1000000000000001",
              "1030033333300301",
              "1030030000300301",
              "1000030000300000", // Right door (to kitchen)
              "1000030000300000",
              "1030033333300301",
              "1030000000000301",
              "1033300000033301",
              "1000000000000001",
              "1111111111111111"
       ]),
       kitchen: parseMap([
              "1111111111111111",
              "1000000000000001",
              "1033300330033301",
              "1030000330000301",
              "1000000000000001",
              "1000000000000001",
              "1033000000003301",
              "0000000000000001", // Left door (to dining)
              "0000000000000001",
              "1033000000003301",
              "1000000000000001",
              "1000000000000001",
              "1030000330000301",
              "1033300330033301",
              "1000000000000001",
              "1111111100111111"  // Down door (to bedroom)
       ]),
       bedroom: parseMap([
              "1111111100111111", // Up door (to kitchen)
              "1000000000000001",
              "1003330000333001",
              "1003000000003001",
              "1003000000003001",
              "1000000000000001",
              "1000000000000001",
              "0000000000000001", // Left door (to childroom)
              "0000000000000001",
              "1000000000000001",
              "1000000000000001",
              "1003000000003001",
              "1003000000003001",
              "1003330000333001",
              "1000000000000001",
              "1111111111111111"
       ]),
       childroom: parseMap([
              "1111111111111111",
              "1000000000000001",
              "1044400440044401",
              "1040000440000401",
              "1040000000000401",
              "1000000000000001",
              "1000000000000001",
              "1000000000000000", // Right door (to bedroom)
              "1000000000000000",
              "1000000000000001",
              "1000000000000001",
              "1040000000000401",
              "1040000440000401",
              "1044400440044401",
              "1000000000000001",
              "1111111111111111"
       ]),
       garden: parseMap([
              "1111111111111111",
              "1000000000000001",
              "1055500550055501",
              "1050000550000501",
              "1000000000000001",
              "1000000000000001",
              "1055000000005501",
              "0000000000000000", // Left to Entrance, Right to Attic
              "0000000000000000",
              "1055000000005501",
              "1000000000000001",
              "1000000000000001",
              "1050000550000501",
              "1055500550055501",
              "1000000000000001",
              "1111111111111111"
       ]),
       attic: parseMap([
              "1111111111111111",
              "1000000000000001",
              "1044400440044401",
              "1040000440000401",
              "1040000000000401",
              "1000000000000001",
              "1000000000000001",
              "0000000000000001", // Left door (to garden)
              "0000000000000001",
              "1000000000000001",
              "1000000000000001",
              "1040000000000401",
              "1040000440000401",
              "1044400440044401",
              "1000000000000001",
              "1111111111111111"
       ])
};

// Rooms Data with parsed maps, items, and interactive elements
const rooms = {
       entrance: {
              name: 'ENTRANCE HALL',
              description: 'A grand staircase looms. The power breaker box is empty.',
              doors: {
                     down: 'library',
                     right: 'garden'
              },
              objects: [
                     { id: 'letter', name: 'Old Letter', x: 3 * 64 + 32, y: 3 * 64 + 32, emoji: '📜', description: 'A faded letter: "Meet me at midnight. Come alone. - Cyrus"', collected: false, type: 'clue' },
                     { id: 'portrait', name: 'Family Portrait', x: 12 * 64 + 32, y: 12 * 64 + 32, emoji: '🖼️', description: 'A family of three. The girl\'s face is scratched out.', collected: false, type: 'clue' },
                     { id: 'fusebox', name: 'Fuse Box', x: 13 * 64 + 32, y: 2 * 64 + 32, emoji: '⚡', description: 'The main breaker. Blows a fuse.', collected: false, type: 'special' }
              ],
              hidingSpots: [
                     { id: 'hs_ent1', x: 2 * 64 + 32, y: 12 * 64 + 32, emoji: '🗄️' }
              ],
              map: roomMaps.entrance
       },
       library: {
              name: 'FORGOTTEN LIBRARY',
              description: 'Thousands of books. One holds the truth.',
              doors: {
                     up: 'entrance',
                     down: 'dining'
              },
              objects: [
                     { id: 'diary', name: 'Leather Diary', x: 8 * 64 + 32, y: 8 * 64 + 32, emoji: '📔', description: 'Diary entry: "I fear Cyrus. He watches me at night."', collected: false, type: 'memory', fragment: 1 },
                     { id: 'book_puzzle', name: 'Colorful Books', x: 3 * 64 + 32, y: 11 * 64 + 32, emoji: '📚', description: 'Arrange books: Red, Blue, Green, Yellow', collected: false, type: 'puzzle' }
              ],
              hidingSpots: [
                     { id: 'hs_lib1', x: 12 * 64 + 32, y: 3 * 64 + 32, emoji: '🗄️' }
              ],
              map: roomMaps.library
       },
       dining: {
              name: 'DINING ROOM',
              description: 'A long table set for a feast that never came.',
              doors: {
                     up: 'library',
                     right: 'kitchen'
              },
              objects: [
                     { id: 'painting', name: 'Strange Painting', x: 8 * 64 + 32, y: 3 * 64 + 32, emoji: '🎨', description: 'A young girl with a shadow behind her.', collected: false, type: 'clue' },
                     { id: 'bible', name: 'Family Bible', x: 12 * 64 + 32, y: 12 * 64 + 32, emoji: '📖', description: 'Bible entry: "Lord forgive us. Elara is gone."', collected: false, type: 'memory', fragment: 4 },
                     { id: 'fuse', name: 'Electric Fuse', x: 3 * 64 + 32, y: 11 * 64 + 32, emoji: '🔌', description: 'A 15A electric fuse. Can restore the manor power.', collected: false, type: 'key' }
              ],
              hidingSpots: [
                     { id: 'hs_din1', x: 2 * 64 + 32, y: 2 * 64 + 32, emoji: '🗄️' }
              ],
              map: roomMaps.dining
       },
       kitchen: {
              name: 'COLD KITCHEN',
              description: 'Rusty utensils. The hearth is cold.',
              doors: {
                     left: 'dining',
                     down: 'bedroom'
              },
              objects: [
                     { id: 'knife', name: 'Rusty Knife', x: 8 * 64 + 32, y: 8 * 64 + 32, emoji: '🔪', description: 'Dried blood on the blade.', collected: false, type: 'clue' },
                     { id: 'key', name: 'Rusty Key', x: 12 * 64 + 32, y: 4 * 64 + 32, emoji: '🔑', description: 'A key to the attic trunk.', collected: false, type: 'key' }
              ],
              hidingSpots: [],
              map: roomMaps.kitchen
       },
       bedroom: {
              name: 'MASTER BEDROOM',
              description: 'A canopy bed. A music box plays alone.',
              doors: {
                     up: 'kitchen',
                     left: 'childroom'
              },
              objects: [
                     { id: 'music_box', name: 'Music Box', x: 11 * 64 + 32, y: 11 * 64 + 32, emoji: '🎵', description: 'A sad melody loops.', collected: false, type: 'memory', fragment: 2 },
                     { id: 'portrait_cyrus', name: 'Cyrus Portrait', x: 4 * 64 + 32, y: 4 * 64 + 32, emoji: '👤', description: 'Stern man. "Cyrus Blackwood".', collected: false, type: 'clue' }
              ],
              hidingSpots: [
                     { id: 'hs_bed1', x: 12 * 64 + 32, y: 2 * 64 + 32, emoji: '🗄️' }
              ],
              map: roomMaps.bedroom
       },
       childroom: {
              name: "ELARA'S ROOM",
              description: 'Toys scattered. A child\'s laughter echoes.',
              doors: {
                     right: 'bedroom'
              },
              objects: [
                     { id: 'doll', name: 'Ragged Doll', x: 8 * 64 + 32, y: 8 * 64 + 32, emoji: '🎎', description: 'A doll with one button eye.', collected: false, type: 'memory', fragment: 3 },
                     { id: 'drawing', name: 'Child Drawing', x: 4 * 64 + 32, y: 4 * 64 + 32, emoji: '🎨', description: 'A stick figure falling into a well.', collected: false, type: 'clue' }
              ],
              hidingSpots: [
                     { id: 'hs_child1', x: 2 * 64 + 32, y: 12 * 64 + 32, emoji: '🗄️' }
              ],
              map: roomMaps.childroom
       },
       garden: {
              name: 'WITHERED GARDEN',
              description: 'Fog rolls in. A deep well is nearby.',
              doors: {
                     left: 'entrance',
                     right: 'attic'
              },
              objects: [
                     { id: 'well', name: 'Ancient Well', x: 12 * 64 + 32, y: 10 * 64 + 32, emoji: '🕳️', description: 'Something glimmers at the bottom...', collected: false, type: 'special' },
                     { id: 'rose', name: 'Black Rose', x: 4 * 64 + 32, y: 12 * 64 + 32, emoji: '🌹', description: 'Ice cold to the touch.', collected: false, type: 'clue' }
              ],
              hidingSpots: [],
              map: roomMaps.garden
       },
       attic: {
              name: 'CURSED ATTIC',
              description: 'Dusty mirrors. A mirror covered in cloth.',
              doors: {
                     left: 'garden'
              },
              objects: [
                     { id: 'mirror', name: 'Covered Mirror', x: 8 * 64 + 32, y: 8 * 64 + 32, emoji: '🪞', description: 'Cloth ripples... needs locket and memories.', collected: false, type: 'special' },
                     { id: 'trunk', name: 'Locked Trunk', x: 3 * 64 + 32, y: 12 * 64 + 32, emoji: '📦', description: 'Locked wooden chest.', collected: false, type: 'special' }
              ],
              hidingSpots: [
                     { id: 'hs_attic1', x: 12 * 64 + 32, y: 12 * 64 + 32, emoji: '🗄️' }
              ],
              map: roomMaps.attic
       }
};

// ==================== INPUT LISTENERS ====================
const keys = {};

window.addEventListener('keydown', (e) => {
       keys[e.key.toLowerCase()] = true;
       
       if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
              e.preventDefault();
       }
       if (e.key.toLowerCase() === 'e') {
              triggerInteraction();
       }
       if (e.key.toLowerCase() === 'i') {
              toggleInventory();
       }
       if (e.key === 'Escape') {
              if (showingBookPuzzle) {
                     showingBookPuzzle = false;
                     showMessage("You stepped away from the bookshelf.");
              }
              closeInventory();
       }
});

window.addEventListener('keyup', (e) => {
       keys[e.key.toLowerCase()] = false;
});

// Pointer Lock mouse control & Book Puzzle clicks
canvas.addEventListener('click', (e) => {
       const startScr = document.getElementById('startScreen');
       if (startScr && !startScr.classList.contains('hidden')) return;

       if (showingBookPuzzle) {
              const rect = canvas.getBoundingClientRect();
              const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
              const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
              handleBookPuzzleClick(mx, my);
              return;
       }

       if (startScr && startScr.classList.contains('hidden')) {
              canvas.requestPointerLock();
       }
});

document.addEventListener('mousemove', (e) => {
       const startScr = document.getElementById('startScreen');
       if (startScr && !startScr.classList.contains('hidden')) return;

       if (document.pointerLockElement === canvas) {
              // Mouse horizontal turns player view angle (with fallback to prevent NaN)
              const dx = e.movementX || e.webkitMovementX || e.mozMovementX || 0;
              player.angle += dx * 0.007;
       }
});

// Tutorial button listeners
document.getElementById('howToPlayBtn').addEventListener('click', () => {
       document.getElementById('tutorialPanel').classList.remove('hidden');
       document.getElementById('controlsGuide').classList.add('hidden');
});

document.getElementById('closeTutorialBtn').addEventListener('click', () => {
       document.getElementById('tutorialPanel').classList.add('hidden');
       document.getElementById('controlsGuide').classList.remove('hidden');
});

// Dynamic Dust motes
const dustMotes = [];
for (let i = 0; i < 40; i++) {
       dustMotes.push({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              vx: (Math.random() - 0.5) * 0.15,
              vy: (Math.random() - 0.5) * 0.15,
              size: Math.random() * 2 + 1,
              alpha: Math.random() * 0.5 + 0.2,
              timer: Math.random() * Math.PI
       });
}

// Dialogue messages
function showMessage(text, isGhost = false, duration = 4000) {
       const dialogueDiv = document.getElementById('dialogueText');
       dialogueDiv.style.opacity = '0';
       setTimeout(() => {
              dialogueDiv.innerHTML = isGhost ? `👻 <span style="color: #ff5555; text-shadow: 0 0 5px red;">${text}</span>` : `📜 ${text}`;
              dialogueDiv.style.opacity = '1';
       }, 100);

       if (duration > 0) {
              setTimeout(() => {
                     if (dialogueDiv.innerHTML.includes(text)) {
                            dialogueDiv.style.opacity = '0';
                            setTimeout(() => {
                                   if (!showingDialogue) {
                                          dialogueDiv.innerHTML = 'The manor whispers...';
                                          dialogueDiv.style.opacity = '1';
                                   }
                            }, 300);
                     }
              }, duration);
       }
}

// Inventory Logic
function addToInventory(item) {
       if (player.inventory.length >= player.maxInventory) {
              showMessage("Inventory full! Use/drop an item first.");
              return false;
       }

       player.inventory.push(item);
       updateInventoryUI();
       showMessage(`Picked up: ${item.name}`);
       audio.play('itemPickup');

       if (item.type === 'memory') {
              memoryFragments.push(item.id);
              showMessage(`Memory fragment ${memoryFragments.length}/5 recovered...`);

              if (memoryFragments.length === 5 && hasLocket) {
                     showMessage("All fragments recovered! Bring the Golden Locket to the mirror in the attic!");
              }
       }
       return true;
}

function updateInventoryUI() {
       const grid = document.getElementById('inventoryGrid');
       const slots = grid.children;
       for (let i = 0; i < player.maxInventory; i++) {
              if (i < player.inventory.length) {
                     const item = player.inventory[i];
                     slots[i].innerHTML = item.emoji;
                     slots[i].className = 'inv-slot filled';
                     slots[i].title = `${item.name}: ${item.description}`;
                     slots[i].onclick = () => useItem(i);
              } else {
                     slots[i].innerHTML = '⚫';
                     slots[i].className = 'inv-slot empty';
                     slots[i].title = '';
                     slots[i].onclick = null;
              }
       }
}

function useItem(index) {
       const item = player.inventory[index];
       if (!item) return;

       if (item.id === 'book_puzzle') {
              triggerBookPuzzle();
       } else if (item.type === 'memory' || item.type === 'clue') {
              showMessage(`${item.name}: ${item.description}`, false, 6000);
       } else {
              showMessage(`Cannot use ${item.name} right now.`);
       }
}

function toggleInventory() {
       const modal = document.getElementById('inventoryModal');
       if (modal.classList.contains('hidden')) {
              modal.classList.remove('hidden');
              updateModalInventory();
              document.exitPointerLock(); // Release pointer lock so user can click items
       } else {
              modal.classList.add('hidden');
       }
}

function closeInventory() {
       document.getElementById('inventoryModal').classList.add('hidden');
}

function updateModalInventory() {
       const container = document.getElementById('modalInventory');
       container.innerHTML = '';
       if (player.inventory.length === 0) {
              container.innerHTML = '<div style="color: #888; padding: 20px; font-family: monospace;">Inventory is empty.</div>';
              return;
       }
       player.inventory.forEach((item, idx) => {
              const div = document.createElement('div');
              div.className = 'modal-item';
              div.style.display = 'flex';
              div.style.justifyContent = 'space-between';
              div.style.alignItems = 'center';
              div.style.marginBottom = '10px';
              div.style.padding = '8px';
              div.style.background = 'rgba(155, 89, 182, 0.15)';
              div.style.border = '1px solid rgba(155, 89, 182, 0.4)';
              div.style.borderRadius = '5px';
              div.innerHTML = `
                     <span style="color: #ddd; font-size: 0.9rem;">${item.emoji} <strong>${item.name}</strong> - ${item.description}</span>
                     <button onclick="dropItem(${idx})" style="background: #e74c3c; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-family: monospace;">DROP</button>
              `;
              container.appendChild(div);
       });
}

window.dropItem = function(idx) {
       const item = player.inventory[idx];
       if (!item) return;

       player.inventory.splice(idx, 1);
       updateInventoryUI();
       updateModalInventory();

       const room = rooms[currentRoom];
       const droppedItem = {
              ...item,
              x: player.x + (Math.random() * 60 - 30),
              y: player.y + (Math.random() * 60 - 30),
              collected: false
       };

       if (item.id !== 'locket') {
              room.objects.push(droppedItem);
       }
       showMessage(`Dropped: ${item.name}`);
};

function updateHUD() {
       const fill = document.getElementById('healthFill');
       if (fill) {
              fill.style.width = `${player.health}%`;
              if (player.health < 35) {
                     fill.style.background = 'linear-gradient(90deg, #ff0000, #ff5555)';
              } else {
                     fill.style.background = 'linear-gradient(90deg, #ff4444, #ff8888)';
              }
       }

       const timeDisplay = document.getElementById('timeDisplay');
       const timeAmPm = document.getElementById('timeAmPm');
       if (timeDisplay && timeAmPm) {
              const minutesPassed = 60 - timeLeft;
              let hours = 11;
              let minutes = minutesPassed;
              let ampm = 'PM';
              if (minutes >= 60) {
                     hours = 12;
                     minutes = 0;
                     ampm = 'AM';
              }
              const minStr = minutes.toString().padStart(2, '0');
              timeDisplay.textContent = `${hours}:${minStr}`;
              timeAmPm.textContent = ampm;
       }
}

// Wall sliding collision check
function checkWallCollision(newX, newY) {
       const r = player.radius;
       const points = [
              { x: newX - r, y: newY - r },
              { x: newX + r, y: newY - r },
              { x: newX - r, y: newY + r },
              { x: newX + r, y: newY + r },
              { x: newX, y: newY - r },
              { x: newX, y: newY + r },
              { x: newX - r, y: newY },
              { x: newX + r, y: newY }
       ];
       const map = rooms[currentRoom].map;
       for (let p of points) {
              const cx = Math.floor(p.x / 64);
              const cy = Math.floor(p.y / 64);
              if (cx < 0 || cx >= 16 || cy < 0 || cy >= 16) {
                     return true; // boundaries
              }
              if (map[cy][cx] > 0) {
                     return true; // wall hit
              }
       }
       return false;
}

function getRoomFootstepType(roomId) {
       if (roomId === 'garden') return 'grass';
       if (['entrance', 'dining', 'kitchen'].includes(roomId)) return 'stone';
       return 'wood';
}

// Interaction state checks
let nearestDoor = null;
let nearestObject = null;
let nearestHidingSpot = null;

function triggerInteraction() {
       if (player.isHiding) {
              // Exit hiding spot
              player.isHiding = false;
              player.hidingSpotRef = null;
              audio.play('doorCreak');
              document.getElementById('closetOverlay').classList.add('hidden');
              showMessage("You stepped out of the closet.");
              return;
       }

       if (nearestHidingSpot) {
              // Enter hiding spot
              player.isHiding = true;
              player.hidingSpotRef = nearestHidingSpot;
              player.vx = 0;
              player.vy = 0;
              audio.play('doorCreak');
              document.getElementById('closetOverlay').classList.remove('hidden');
              showMessage("Quiet! Cyrus cannot see you in here unless he saw you enter.");
              
              // If ghost is in room, check if too close
              if (ghost.active && ghost.room === currentRoom && !ghost.frozen) {
                     const gx = ghost.x - player.x;
                     const gy = ghost.y - player.y;
                     const d = Math.sqrt(gx * gx + gy * gy);
                     if (d < 220) {
                            // Caught entering hiding spot!
                            player.isHiding = false;
                            document.getElementById('closetOverlay').classList.add('hidden');
                            player.health -= 35;
                            screenFlash = 0.9;
                            screenShake = 20;
                            audio.play('ghostWhisper');
                            showMessage("Cyrus caught you entering the wardrobe!", true);
                     } else {
                            // Ghost loses track
                            ghost.lastSeen = Date.now();
                     }
              }
       } else if (nearestObject) {
              interactWithObject(nearestObject);
       }
}

function interactWithObject(obj) {
       if (obj.id === 'fusebox') {
              const hasFuse = player.inventory.some(item => item.id === 'fuse');
              if (hasFuse) {
                     lightsOn = true;
                     showMessage("You snapped the Electric Fuse in place! Breaker clicks. House lights flickered on!");
                     audio.play('puzzleSolve');
                     obj.collected = true;
                     screenFlash = 1.0;
                     ghost.speed = 1.6; // Enrage ghost speed
                     
                     const fuseIdx = player.inventory.findIndex(item => item.id === 'fuse');
                     player.inventory.splice(fuseIdx, 1);
                     updateInventoryUI();
              } else {
                     showMessage("The Fuse Box is empty. Find the Electric Fuse in the manor to restore the lighting.");
              }
       } else if (obj.id === 'well') {
              if (hasLocket) {
                     showMessage("You already collected the locket from the well.");
              } else {
                     const locket = { id: 'locket', name: 'Golden Locket', emoji: '📿', description: 'Elara\'s golden locket. Engraved with "E.B."', type: 'key' };
                     if (addToInventory(locket)) {
                            hasLocket = true;
                            obj.collected = true;
                            showMessage("You tied the rope and fished out the Golden Locket from the cold well!");
                     }
              }
       } else if (obj.id === 'trunk') {
              const hasKey = player.inventory.some(item => item.id === 'key');
              if (hasKey) {
                     showMessage("You unlocked the trunk using the Rusty Key!");
                     audio.play('puzzleSolve');
                     obj.collected = true;

                     const photo = { id: 'photo', name: 'Old Photograph', emoji: '📷', description: 'Elara holding her locket. She looks happy.', collected: false, type: 'memory', fragment: 5 };
                     addToInventory(photo);

                     const keyIdx = player.inventory.findIndex(item => item.id === 'key');
                     player.inventory.splice(keyIdx, 1);
                     updateInventoryUI();
              } else {
                     showMessage("The trunk is locked. Requires a key.");
              }
       } else if (obj.id === 'mirror') {
              if (hasLocket && memoryFragments.length === 5) {
                     triggerVictory();
              } else {
                     showMessage("Mirror whispers: 'Restore my 5 memories... and my golden locket...'", true);
                     audio.play('ghostWhisper');
                     screenShake = 10;
              }
       } else if (obj.id === 'book_puzzle') {
              triggerBookPuzzle();
       } else {
              if (addToInventory(obj)) {
                     obj.collected = true;
              }
       }
}

// Room transition
let transitioning = false;
let transitionOpacity = 0;

function changeRoom(destRoomId, direction) {
       if (transitioning) return;
       transitioning = true;
       audio.play('doorCreak');

       let fadeOut = setInterval(() => {
              transitionOpacity += 0.08;
              if (transitionOpacity >= 1.0) {
                     transitionOpacity = 1.0;
                     clearInterval(fadeOut);

                     currentRoom = destRoomId;
                     const room = rooms[currentRoom];

                     // Reposition player relative to opposite door entry
                     if (direction === 'up') {
                            player.x = 8 * 64 + 32;
                            player.y = 14 * 64 + 32;
                            player.angle = -Math.PI / 2;
                     } else if (direction === 'down') {
                            player.x = 8 * 64 + 32;
                            player.y = 1 * 64 + 32;
                            player.angle = Math.PI / 2;
                     } else if (direction === 'left') {
                            player.x = 14 * 64 + 32;
                            player.y = 8 * 64 + 32;
                            player.angle = Math.PI;
                     } else if (direction === 'right') {
                            player.x = 1 * 64 + 32;
                            player.y = 8 * 64 + 32;
                            player.angle = 0;
                     }

                     showMessage(room.description);

                     let fadeIn = setInterval(() => {
                            transitionOpacity -= 0.08;
                            if (transitionOpacity <= 0) {
                                   transitionOpacity = 0;
                                   clearInterval(fadeIn);
                                   transitioning = false;
                            }
                     }, 25);
              }
       }, 25);
}

// Bookshelf puzzle logic
let showingBookPuzzle = false;
let bookOrder = [];

function triggerBookPuzzle() {
       showingBookPuzzle = true;
       bookOrder = [];
       document.exitPointerLock(); // Release pointer lock so user can click books
       showMessage("Click the books on screen in order: Red, Blue, Green, Yellow.");
}

function handleBookPuzzleClick(mx, my) {
       const bx = canvas.width / 2 - 120;
       const by = canvas.height / 2 - 50;
       const bw = 50;
       const bh = 100;
       
       const colors = ['red', 'blue', 'green', 'yellow'];
       
       for (let i = 0; i < 4; i++) {
              const x = bx + i * 60;
              if (mx > x && mx < x + bw && my > by && my < by + bh) {
                     const color = colors[i];
                     bookOrder.push(color);
                     audio.play('itemPickup');
                     
                     const expected = ['red', 'blue', 'green', 'yellow'];
                     const idx = bookOrder.length - 1;
                     
                     if (bookOrder[idx] !== expected[idx]) {
                            bookOrder = [];
                            showMessage("Wrong sequence! The books slide back.", false, 3000);
                            screenShake = 6;
                     } else if (bookOrder.length === expected.length) {
                            showingBookPuzzle = false;
                            audio.play('puzzleSolve');
                            showMessage("Latch clicked! A compartment opens. You found a Torn Page.");
                            
                            const clue = { id: 'clue_diary', name: 'Torn Page', emoji: '📄', description: 'Page: "Cyrus hates the locket. He threw it in the garden well."', collected: false, type: 'clue' };
                            addToInventory(clue);
                            
                            const bookshelf = rooms.library.objects.find(o => o.id === 'book_puzzle');
                            if (bookshelf) bookshelf.collected = true;
                     }
                     break;
              }
       }
}

function drawBookPuzzle() {
       if (!showingBookPuzzle) return;
       
       ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
       ctx.fillRect(0, 0, canvas.width, canvas.height);
       
       ctx.fillStyle = '#e0e0e0';
       ctx.font = '20px Courier New';
       ctx.textAlign = 'center';
       ctx.fillText("BOOKSHELF MECHANISM", canvas.width / 2, canvas.height / 2 - 95);
       
       ctx.font = '13px Courier New';
       ctx.fillStyle = '#888';
       ctx.fillText("Click books in order: Red, Blue, Green, Yellow", canvas.width / 2, canvas.height / 2 - 70);
       
       const bx = canvas.width / 2 - 120;
       const by = canvas.height / 2 - 50;
       const bw = 50;
       const bh = 100;
       const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
       
       for (let i = 0; i < 4; i++) {
              ctx.fillStyle = colors[i];
              ctx.fillRect(bx + i * 60, by, bw, bh);
              
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(bx + i * 60, by, bw, bh);
              
              ctx.strokeStyle = 'rgba(0,0,0,0.3)';
              ctx.beginPath();
              ctx.moveTo(bx + i * 60 + 5, by + 12);
              ctx.lineTo(bx + i * 60 + 45, by + 12);
              ctx.moveTo(bx + i * 60 + 5, by + 24);
              ctx.lineTo(bx + i * 60 + 45, by + 24);
              ctx.stroke();
       }
       
       ctx.fillStyle = '#9b59b6';
       ctx.font = '12px Courier New';
       ctx.fillText("Press ESC to exit bookshelf", canvas.width / 2, canvas.height / 2 + 90);
}

// Ghost Freeze Logic
function freezeGhost() {
       ghost.frozen = true;
       ghost.freezeEnd = Date.now() + 5000; // 5 seconds freeze
       ghostPointedTimer = 0;
       audio.play('puzzleSolve');
       screenShake = 15;
       showMessage("The flashlight light beam stuns Cyrus! You have 5 seconds to run!", true, 4000);
}

function drawFreezeIndicator(charge) {
       const percent = Math.min(1.0, charge / 6.0);
       const hfill = document.getElementById('freezeBarFill');
       const hud = document.getElementById('freezeHud');
       if (percent > 0.05) {
              hud.classList.remove('hidden');
              hfill.style.width = `${percent * 100}%`;
       } else {
              hud.classList.add('hidden');
       }
}

// Ghost AI Stalking
function updateGhost() {
       if (!ghost.active) return;

       // Handle unfreeze
       if (ghost.frozen) {
              if (Date.now() > ghost.freezeEnd) {
                     ghost.frozen = false;
                     showMessage("Cyrus broke out of stun!", true, 3000);
                     audio.play('ghostWhisper');
              }
              return; // stands still
       }

       if (ghost.room === currentRoom) {
              ghost.visible = true;

              // If player is hiding, do not move ghost unless he is already yanking
              if (player.isHiding) {
                     // Ghost wanders away
                     if (Date.now() - ghost.lastSeen > 4000) {
                            ghost.room = 'library'; // teleport away
                            ghost.lastSeen = Date.now();
                            showMessage("You hear Cyrus growl and glide away into the dark...", true);
                     }
                     fearLevel = Math.max(0, fearLevel - 0.2);
                     return;
              }

              const dx = player.x - ghost.x;
              const dy = player.y - ghost.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              // Move towards player
              ghost.x += (dx / dist) * ghost.speed;
              ghost.y += (dy / dist) * ghost.speed;

              // Fear Level scale
              const fearDist = 380;
              if (dist < fearDist) {
                     const mult = 1.0 - (dist / fearDist);
                     fearLevel += mult * 0.45;
              } else {
                     fearLevel -= 0.08;
              }

              if (dist < 150) {
                     screenShake = Math.max(screenShake, (1.0 - dist / 150) * 12);
              }

              if (dist < 32) {
                     player.health -= 0.8;
                     screenShake = 18;
                     screenFlash = 0.8;
                     if (Math.random() < 0.04) {
                            audio.play('ghostWhisper');
                     }
              }
       } else {
              ghost.visible = false;
              fearLevel -= 0.2;

              // Teleport/stalk check
              if (Date.now() - ghost.lastSeen > 6500) {
                     ghost.lastSeen = Date.now();
                     if (Math.random() < 0.26 && !player.isHiding) {
                            ghost.room = currentRoom;
                            // Spawn at random angle outside of direct view
                            const ang = player.angle + Math.PI + (Math.random() - 0.5) * 1.5;
                            ghost.x = player.x + Math.cos(ang) * 450;
                            ghost.y = player.y + Math.sin(ang) * 450;
                            audio.play('ghostWhisper');
                            showMessage("A cold draft blows... Cyrus has entered the room!", true, 4000);
                     }
              }
       }

       fearLevel = Math.max(0, Math.min(100, fearLevel));

       if (fearLevel > 0) {
              vignetteIntensity = fearLevel / 100;
              const rate = 1600 - (fearLevel * 12.5);
              if (!ghost.lastHeartbeat || Date.now() - ghost.lastHeartbeat > rate) {
                     audio.playHeartbeat(fearLevel);
                     ghost.lastHeartbeat = Date.now();
                     screenShake = Math.max(screenShake, fearLevel * 0.06);
              }
       } else {
              vignetteIntensity = 0;
       }

       if (player.health <= 0) {
              player.health = 0;
              triggerGameOver("SOULED OUT", "Cyrus's spirit consumed your life force. You are now another echo in the dark.");
       }
}

// 3D Raycasting Renderer
const zBuffer = new Array(canvas.width).fill(Infinity);

function draw3D() {
       const room = rooms[currentRoom];
       const map = room.map;
       const FOV = Math.PI / 3; // 60 degrees

       const bobY = Math.sin(player.walkCycle) * (player.isRunning ? 12 : 6);

       // 1. Render Ceiling & Floor
       // Ceiling
       ctx.fillStyle = lightsOn ? '#1e1c2a' : '#0f0e15';
       ctx.fillRect(0, 0, canvas.width, canvas.height / 2 + bobY);
       
       // Floor
       ctx.fillStyle = lightsOn ? '#342d22' : '#14121a';
       ctx.fillRect(0, canvas.height / 2 + bobY, canvas.width, canvas.height / 2 - bobY);

       // 2. Raycast Walls (optimized column-width rendering)
       const scale = 4; // Cast 256 rays instead of 1024 for a 4x framerate performance boost
       for (let x = 0; x < canvas.width; x += scale) {
              const rayAngle = player.angle - (FOV / 2) + (x / canvas.width) * FOV;
              
              const rayDirX = Math.cos(rayAngle);
              const rayDirY = Math.sin(rayAngle);

              let mapX = Math.floor(player.x / 64);
              let mapY = Math.floor(player.y / 64);

              const deltaDistX = Math.abs(1 / (rayDirX + 0.0001));
              const deltaDistY = Math.abs(1 / (rayDirY + 0.0001));

              let stepX, stepY;
              let sideDistX, sideDistY;

              if (rayDirX < 0) {
                     stepX = -1;
                     sideDistX = (player.x / 64 - mapX) * deltaDistX;
              } else {
                     stepX = 1;
                     sideDistX = (mapX + 1.0 - player.x / 64) * deltaDistX;
              }
              if (rayDirY < 0) {
                     stepY = -1;
                     sideDistY = (player.y / 64 - mapY) * deltaDistY;
              } else {
                     stepY = 1;
                     sideDistY = (mapY + 1.0 - player.y / 64) * deltaDistY;
              }

              let hitWall = 0;
              let depth = 0;
              let side = 0;

              while (hitWall === 0 && depth < 20) {
                     if (sideDistX < sideDistY) {
                            sideDistX += deltaDistX;
                            mapX += stepX;
                            side = 0;
                     } else {
                            sideDistY += deltaDistY;
                            mapY += stepY;
                            side = 1;
                     }

                     if (mapX < 0 || mapX >= 16 || mapY < 0 || mapY >= 16) break;

                     if (map[mapY][mapX] > 0) {
                            hitWall = map[mapY][mapX];
                     }
                     depth++;
              }

              let wallDist;
              if (side === 0) {
                     wallDist = (mapX - player.x / 64 + (1 - stepX) / 2) / (rayDirX + 0.0001);
              } else {
                     wallDist = (mapY - player.y / 64 + (1 - stepY) / 2) / (rayDirY + 0.0001);
              }

              // Correct fish-eye
              const correctedDist = wallDist * Math.cos(rayAngle - player.angle);
              
              // Fill z-buffer for all columns in this slice
              for (let i = 0; i < scale; i++) {
                     if (x + i < canvas.width) {
                            zBuffer[x + i] = correctedDist;
                     }
              }

              // Projection height
              const sliceHeight = Math.floor(canvas.height / (correctedDist + 0.001));

              // Procedural wall color
              let color = { r: 60, g: 60, b: 65 }; // default stone
              if (hitWall === 1) color = { r: 90, g: 30, b: 30 }; // Red brick (Entrance)
              else if (hitWall === 2) color = { r: 35, g: 45, b: 65 }; // Bookshelf (Library)
              else if (hitWall === 3) color = { r: 75, g: 50, b: 35 }; // Wooden panel (Dining/Kitchen/Bedroom)
              else if (hitWall === 4) color = { r: 50, g: 50, b: 55 }; // Cold stone (Attic/Childroom)
              else if (hitWall === 5) color = { r: 25, g: 55, b: 25 }; // Garden hedge (Garden)

              // Shadow dark walls on side hits
              if (side === 1) {
                     color.r = Math.floor(color.r * 0.7);
                     color.g = Math.floor(color.g * 0.7);
                     color.b = Math.floor(color.b * 0.7);
              }

              // Flashlight Light-cone calculations
              let diff = rayAngle - player.angle;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;

              let intensity = 0.18; // base ambient to see silhouettes in pitch dark
              if (lightsOn) intensity = 0.65; // brighter manor lights

              const cone = 28 * Math.PI / 180; // wider flashlight cone (28 degrees)
              if (Math.abs(diff) < cone) {
                     const scaleA = 1.0 - (Math.abs(diff) / cone);
                     const scaleD = Math.max(0, 1.0 - (correctedDist / 16)); // longer reach (16 cells)
                     intensity += scaleA * scaleD * 0.95;
              }

              intensity = Math.min(1.0, intensity);
              color.r = Math.floor(color.r * intensity);
              color.g = Math.floor(color.g * intensity);
              color.b = Math.floor(color.b * intensity);

              ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

              const drawStart = Math.max(0, -sliceHeight / 2 + canvas.height / 2 + bobY);
              const drawEnd = Math.min(canvas.height, sliceHeight / 2 + canvas.height / 2 + bobY);

              ctx.fillRect(x, drawStart, scale, drawEnd - drawStart);
       }
}

// 3D Billboard Sprite Projection
function drawSprites() {
       const room = rooms[currentRoom];
       const sprites = [];

       const bobY = Math.sin(player.walkCycle) * (player.isRunning ? 12 : 6);

       // Nearest reset
       nearestObject = null;
       nearestHidingSpot = null;
       nearestDoor = null;

       // 1. Gather Sprites
       // Items/Objects
       room.objects.forEach(obj => {
              if (!obj.collected) {
                     sprites.push({
                            x: obj.x,
                            y: obj.y,
                            emoji: obj.emoji,
                            name: obj.name,
                            type: 'object',
                            objRef: obj
                     });
              }
       });

       // Hiding Spot Wardrobes
       if (room.hidingSpots) {
              room.hidingSpots.forEach(hs => {
                     sprites.push({
                            x: hs.x,
                            y: hs.y,
                            emoji: hs.emoji,
                            name: 'Wardrobe (E to Hide)',
                            type: 'hiding_spot',
                            objRef: hs
                     });
              });
       }

       // Ghost Cyrus
       if (ghost.active && ghost.room === currentRoom && ghost.visible) {
              sprites.push({
                     x: ghost.x,
                     y: ghost.y,
                     emoji: '👻',
                     name: 'CYRUS',
                     type: 'ghost'
              });
       }

       // Project and sort sprites by distance
       sprites.forEach(s => {
              s.dx = s.x - player.x;
              s.dy = s.y - player.y;
              s.dist = Math.sqrt(s.dx * s.dx + s.dy * s.dy);
       });
       sprites.sort((a, b) => b.dist - a.dist);

       let ghostCenterVisible = false;

       sprites.forEach(s => {
              if (s.dist < 12) return; // clipping

              let spriteAngle = Math.atan2(s.dy, s.dx) - player.angle;
              while (spriteAngle < -Math.PI) spriteAngle += Math.PI * 2;
              while (spriteAngle > Math.PI) spriteAngle -= Math.PI * 2;

              const FOV = Math.PI / 3;
              if (Math.abs(spriteAngle) < FOV * 0.85) {
                     const correctedDist = s.dist * Math.cos(spriteAngle);
                     if (correctedDist < 8) return;

                     const spriteHeight = Math.floor(canvas.height / (correctedDist / 64));
                     const screenX = Math.floor((canvas.width / 2) + Math.tan(spriteAngle) * (canvas.width / 2));

                     const xStart = Math.floor(screenX - spriteHeight / 2);
                     const xEnd = Math.floor(screenX + spriteHeight / 2);

                     let visible = false;
                     for (let col = xStart; col < xEnd; col++) {
                            if (col >= 0 && col < canvas.width) {
                                   if (zBuffer[col] > correctedDist / 64) {
                                          visible = true;
                                          if (col === Math.floor(canvas.width / 2)) {
                                                 ghostCenterVisible = true;
                                          }
                                   }
                            }
                     }

                     if (visible) {
                            let light = 0.22; // base ambient visibility for items/ghost in dark
                            if (lightsOn) light = 0.65;

                            const cone = 28 * Math.PI / 180;
                            if (Math.abs(spriteAngle) < cone) {
                                   const scaleA = 1.0 - (Math.abs(spriteAngle) / cone);
                                   const scaleD = Math.max(0, 1.0 - (correctedDist / 800));
                                   light += scaleA * scaleD * 0.95;
                            }
                            light = Math.min(1.0, light);

                            ctx.save();
                            ctx.translate(screenX, canvas.height / 2 + bobY);
                            ctx.globalAlpha = light;

                            if (s.type === 'ghost') {
                                   const floatY = Math.sin(Date.now() / 220) * 12;
                                   ctx.translate(0, floatY);

                                   ctx.shadowBlur = 20;
                                   if (ghost.frozen) {
                                          ctx.shadowColor = '#00ffff';
                                          ctx.fillStyle = '#a0ffff';
                                   } else {
                                          ctx.shadowColor = '#ff0000';
                                          ctx.fillStyle = '#ffaaaa';
                                   }
                            }

                            const fontSize = Math.floor(spriteHeight * 0.65);
                            ctx.font = `${fontSize}px Arial`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';

                            ctx.fillText(s.emoji, 0, 0);

                            // Draw label above
                            if (s.dist < 350) {
                                   ctx.font = 'bold 12px monospace';
                                   ctx.fillStyle = '#eee';
                                   ctx.shadowBlur = 4;
                                   ctx.shadowColor = '#000';
                                   ctx.fillText(s.name, 0, -spriteHeight / 2 - 12);
                            }

                            ctx.restore();

                            // Proximity interact check (within 2.2 cells)
                            if (s.dist < 140) {
                                   if (s.type === 'object') nearestObject = s.objRef;
                                   if (s.type === 'hiding_spot') nearestHidingSpot = s.objRef;
                            }
                     }
              }
       });

       // Ghost freeze status accumulation
       if (ghost.active && ghost.room === currentRoom && ghost.visible && !ghost.frozen) {
              if (ghostCenterVisible) {
                     ghostPointedTimer += 1 / 60;
                     drawFreezeIndicator(ghostPointedTimer);
                     if (ghostPointedTimer >= 6.0) {
                            freezeGhost();
                     }
              } else {
                     ghostPointedTimer = Math.max(0, ghostPointedTimer - (1 / 60) * 0.55);
                     drawFreezeIndicator(ghostPointedTimer);
              }
       } else {
              drawFreezeIndicator(0);
       }

       // Update interaction prompt UI
       const prompt = document.getElementById('interactionPrompt');
       const ptext = document.getElementById('promptText');
       if (prompt && ptext) {
              if (player.isHiding) {
                     prompt.classList.remove('hidden');
                     ptext.textContent = "Exit Wardrobe";
              } else if (nearestHidingSpot) {
                     prompt.classList.remove('hidden');
                     ptext.textContent = "Hide in Wardrobe";
              } else if (nearestObject) {
                     prompt.classList.remove('hidden');
                     ptext.textContent = `Interact with ${nearestObject.name}`;
              } else {
                     prompt.classList.add('hidden');
              }
       }
}

// Ambient dynamic wind & dust motes
function updateAndDrawDustMotes() {
       const bobY = Math.sin(player.walkCycle) * (player.isRunning ? 12 : 6);
       ctx.save();
       
       dustMotes.forEach(mote => {
              mote.x += mote.vx;
              mote.y += mote.vy;

              if (mote.x < 0) mote.x = canvas.width;
              if (mote.x > canvas.width) mote.x = 0;
              if (mote.y < 0) mote.y = canvas.height;
              if (mote.y > canvas.height) mote.y = 0;

              mote.timer += 0.02;
              const alpha = mote.alpha * (0.3 + Math.abs(Math.sin(mote.timer)) * 0.7);

              // check if illuminated
              const dx = mote.x - canvas.width / 2;
              const dy = mote.y - (canvas.height / 2 + bobY);
              const dist = Math.sqrt(dx * dx + dy * dy);

              let lit = false;
              if (dist < 120) {
                     lit = true;
              } else {
                     // Check center flashlight cone
                     const ang = Math.atan2(dy, dx);
                     if (Math.abs(ang) < 22 * Math.PI / 180) {
                            lit = true;
                     }
              }

              if (lit) {
                     ctx.fillStyle = `rgba(255, 255, 230, ${alpha})`;
                     ctx.beginPath();
                     ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
                     ctx.fill();
              }
       });
       ctx.restore();
}

function drawVignette() {
       const rad = canvas.width * 0.75;
       const fear = vignetteIntensity * 0.35;
       
       const grad = ctx.createRadialGradient(
              canvas.width / 2, canvas.height / 2, canvas.width / 4,
              canvas.width / 2, canvas.height / 2, rad * (1.0 - fear)
       );
       grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
       grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
       grad.addColorStop(1, `rgba(0, 0, 0, ${0.93 + fear * 0.07})`);

       ctx.fillStyle = grad;
       ctx.fillRect(0, 0, canvas.width, canvas.height);

       if (fearLevel > 60) {
              const red = (fearLevel - 60) / 40 * 0.35;
              ctx.strokeStyle = `rgba(220, 0, 0, ${red})`;
              ctx.lineWidth = 14;
              ctx.strokeRect(0, 0, canvas.width, canvas.height);
       }
}

// 120x120 HUD Minimap canvas drawing
const minimapCanvas = document.getElementById('minimapCanvas');
const mctx = minimapCanvas.getContext('2d');

function updateMinimap() {
       mctx.fillStyle = '#05020c';
       mctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

       const room = rooms[currentRoom];
       const map = room.map;
       const scale = minimapCanvas.width / 16; // grid scale

       mctx.strokeStyle = '#9b59b6';
       mctx.lineWidth = 1;
       mctx.strokeRect(2, 2, minimapCanvas.width - 4, minimapCanvas.height - 4);

       mctx.fillStyle = 'rgba(155, 89, 182, 0.25)';
       for (let y = 0; y < 16; y++) {
              for (let x = 0; x < 16; x++) {
                     if (map[y][x] > 0) {
                            mctx.fillRect(x * scale, y * scale, scale - 1, scale - 1);
                     }
              }
       }

       // Player dot
       const px = (player.x / 1024) * minimapCanvas.width;
       const py = (player.y / 1024) * minimapCanvas.height;

       mctx.fillStyle = '#00ff00';
       mctx.beginPath();
       mctx.arc(px, py, 3.5, 0, Math.PI * 2);
       mctx.fill();

       // Player direction line
       mctx.strokeStyle = '#00ff00';
       mctx.lineWidth = 1.5;
       mctx.beginPath();
       mctx.moveTo(px, py);
       mctx.lineTo(px + Math.cos(player.angle) * 8, py + Math.sin(player.angle) * 8);
       mctx.stroke();

       // Ghost dot
       if (ghost.active && ghost.room === currentRoom && ghost.visible) {
              const gx = (ghost.x / 1024) * minimapCanvas.width;
              const gy = (ghost.y / 1024) * minimapCanvas.height;

              mctx.fillStyle = '#ff2222';
              mctx.beginPath();
              mctx.arc(gx, gy, 3, 0, Math.PI * 2);
              mctx.fill();
       }
}

function triggerGameOver(title, message) {
       gameRunning = false;
       document.exitPointerLock();
       const overlay = document.getElementById('gameOverlay');
       document.getElementById('overlayTitle').textContent = `💀 ${title}`;
       document.getElementById('overlayTitle').style.color = '#ff4444';
       document.getElementById('overlayMessage').textContent = message;
       overlay.classList.remove('hidden');
}

function triggerVictory() {
       gameRunning = false;
       document.exitPointerLock();
       const overlay = document.getElementById('gameOverlay');
       document.getElementById('overlayTitle').textContent = `✨ THE CURSE BROKEN`;
       document.getElementById('overlayTitle').style.color = '#2ecc71';
       
       const message = "As you hold Elara's golden locket to the cursed mirror, a warm light erupts, dissolving the darkness. Her spirit smiles, finally free from the manor's torment. You step out into the dawn.";
       document.getElementById('overlayMessage').textContent = message;
       overlay.classList.remove('hidden');
}

// Start Manor click listener
document.getElementById('startBtn').addEventListener('click', () => {
       audio.init();
       document.getElementById('startScreen').classList.add('hidden');
       canvas.requestPointerLock();
       lightsOn = false;

       player.x = 8 * 64 + 32;
       player.y = 8 * 64 + 32;
       player.angle = -Math.PI / 2;

       updateHUD();
       updateInventoryUI();
       showMessage("The manor door slams behind you... Find the Electric Fuse in the house to restore lights first.", false, 6000);
       audio.play('doorCreak');

       // Stalker triggers in 8 seconds
       setTimeout(() => {
              ghost.active = true;
              ghost.room = 'library';
              ghost.x = 8 * 64;
              ghost.y = 8 * 64;
       }, 8000);
});

// Time tick loop
let gameCountdown = setInterval(() => {
       if (!gameRunning) return;
       timeLeft -= 1;
       updateHUD();

       if (timeLeft <= 0) {
              clearInterval(gameCountdown);
              triggerGameOver("MIDNIGHT STRIKES", "The clock struck midnight. Cyrus's curse is sealed forever. You are trapped in the dark.");
       }

       if (timeLeft % 10 === 0) {
              audio.play('clockChime');
       }
}, 4000); // 1 game-minute = 4 seconds real-time

// Main game logic ticker
function update() {
       if (!gameRunning || !document.getElementById('startScreen').classList.contains('hidden')) return;

       let moveX = 0;
       let moveY = 0;
       const accel = 1.2;

       // If hiding, player cannot move
       if (!player.isHiding) {
              let ax = 0;
              let ay = 0;

              // WASD/Arrows movement relative to look direction player.angle
              if (keys['w'] || keys['arrowup']) {
                     ax += Math.cos(player.angle);
                     ay += Math.sin(player.angle);
              }
              if (keys['s'] || keys['arrowdown']) {
                     ax -= Math.cos(player.angle);
                     ay -= Math.sin(player.angle);
              }
              if (keys['a'] || keys['arrowleft']) {
                     // strafe left: angle - PI/2
                     ax += Math.cos(player.angle - Math.PI / 2);
                     ay += Math.sin(player.angle - Math.PI / 2);
              }
              if (keys['d'] || keys['arrowright']) {
                     // strafe right: angle + PI/2
                     ax += Math.cos(player.angle + Math.PI / 2);
                     ay += Math.sin(player.angle + Math.PI / 2);
              }

              // Normalize direction vector
              const len = Math.sqrt(ax * ax + ay * ay);
              if (len > 0) {
                     ax /= len;
                     ay /= len;
              }

              player.isRunning = keys['shift'] && !player.exhausted && len > 0;

              if (player.isRunning) {
                     player.stamina -= 0.45;
                     if (player.stamina <= 0) {
                            player.stamina = 0;
                            player.exhausted = true;
                            audio.play('breathing');
                     }
              } else {
                     player.stamina += 0.25;
                     if (player.stamina >= player.maxStamina) {
                            player.stamina = player.maxStamina;
                            player.exhausted = false;
                     }
              }

              const maxSpeed = player.isRunning ? player.runSpeed : player.speed;

              player.vx += ax * accel;
              player.vy += ay * accel;
              player.vx *= 0.68;
              player.vy *= 0.68;

              const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
              if (currentSpeed > maxSpeed) {
                     player.vx = (player.vx / currentSpeed) * maxSpeed;
                     player.vy = (player.vy / currentSpeed) * maxSpeed;
              }

              // Apply sliding wall collision
              const nextX = player.x + player.vx;
              const nextY = player.y + player.vy;

              if (!checkWallCollision(nextX, player.y)) {
                     player.x = nextX;
              } else {
                     player.vx = 0;
              }

              if (!checkWallCollision(player.x, nextY)) {
                     player.y = nextY;
              } else {
                     player.vy = 0;
              }

              // Footsteps walk cycle bob
              if (currentSpeed > 0.15) {
                     const cycleSpeed = player.isRunning ? 0.24 : 0.15;
                     player.walkCycle += cycleSpeed;

                     const walkPeriod = Math.PI;
                     if (Math.floor(player.walkCycle / walkPeriod) > Math.floor((player.walkCycle - cycleSpeed) / walkPeriod)) {
                            audio.playFootstep(getRoomFootstepType(currentRoom), player.isRunning);
                     }
              } else {
                     player.walkCycle %= Math.PI * 2;
                     if (player.walkCycle > 0) {
                            player.walkCycle -= 0.1;
                            if (player.walkCycle < 0) player.walkCycle = 0;
                     }
              }
       }

       // Room boundary checks (door trigger walks)
       const bounds = 0.35 * 64;
       const maxBound = 15.65 * 64;

       if (player.x < bounds && rooms[currentRoom].doors.left) {
              changeRoom(rooms[currentRoom].doors.left, 'left');
       } else if (player.x > maxBound && rooms[currentRoom].doors.right) {
              changeRoom(rooms[currentRoom].doors.right, 'right');
       } else if (player.y < bounds && rooms[currentRoom].doors.up) {
              changeRoom(rooms[currentRoom].doors.up, 'up');
       } else if (player.y > maxBound && rooms[currentRoom].doors.down) {
              changeRoom(rooms[currentRoom].doors.down, 'down');
       }

       // Stalker updating
       updateGhost();

       // Update minimap
       updateMinimap();
}

function draw() {
       if (!gameRunning || !document.getElementById('startScreen').classList.contains('hidden')) return;

       ctx.fillStyle = '#000';
       ctx.fillRect(0, 0, canvas.width, canvas.height);

       ctx.save();
       if (screenShake > 0) {
              const dx = (Math.random() - 0.5) * screenShake;
              const dy = (Math.random() - 0.5) * screenShake;
              ctx.translate(dx, dy);
              screenShake *= 0.92;
              if (screenShake < 0.1) screenShake = 0;
       }

       // 3D Raycasting Walls
       draw3D();

       // 3D Billboard Sprites
       drawSprites();

       ctx.restore();

       // Atmosphere overlays
       updateAndDrawDustMotes();
       drawVignette();

       // Red damage flashes
       if (screenFlash > 0) {
              ctx.fillStyle = `rgba(180, 0, 0, ${screenFlash})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              screenFlash *= 0.88;
              if (screenFlash < 0.01) screenFlash = 0;
       }

       // Screen transitions
       if (transitionOpacity > 0) {
              ctx.fillStyle = `rgba(0, 0, 0, ${transitionOpacity})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
       }

       // Puzzle draw
       drawBookPuzzle();

       // Crosshair in center (very dim pixel)
       ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
       ctx.fillRect(canvas.width / 2 - 2, canvas.height / 2 - 2, 4, 4);
}

function loop() {
       update();
       draw();
       requestAnimationFrame(loop);
}

loop();