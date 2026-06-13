// js/maps/manor.js — Manor Map Definition
// Wall types: 0=floor 1=stone 2=wood 3=bookshelf 4=ritual 5=locked-door

export const TILE = 64;
export const MAP_W = 36;
export const MAP_H = 36;
let _lastBuiltMap = null;

// Room bounding boxes (interior, in tiles)
export const ROOM_DEFS = {
  entrance:  { name:'ENTRANCE HALL',   x:14, y:13, w:8, h:8, color:'#1a0a0a' },
  library:   { name:'FORGOTTEN LIBRARY', x:2, y:13, w:8, h:8, color:'#0a0a1a' },
  dining:    { name:'DINING ROOM',     x:14, y:25, w:8, h:8, color:'#0d0a05' },
  kitchen:   { name:'COLD KITCHEN',    x:26, y:13, w:8, h:8, color:'#0a100a' },
  childroom: { name:"ELARA'S ROOM",    x:26, y:1,  w:8, h:8, color:'#0f050f' },
  garden:    { name:'WITHERED GARDEN', x:14, y:1,  w:8, h:8, color:'#020a02' },
  attic:     { name:'CURSED ATTIC',    x:2,  y:1,  w:8, h:8, color:'#050010' },
  basement:  { name:'SEALED BASEMENT', x:2,  y:25, w:8, h:8, color:'#050000' },
  bedroom:   { name:'MASTER BEDROOM',  x:26, y:25, w:8, h:8, color:'#110808' },
};

export const ROOM_MOODS = {
  entrance:  { tint:'rgba(120,30,25,0.06)', surface:'stone', ambience:'hollow', stinger:'lowBell', tension: 0.12 },
  library:   { tint:'rgba(35,42,90,0.08)',  surface:'wood',  ambience:'dust',   stinger:'pageRush', tension: 0.22 },
  dining:    { tint:'rgba(120,70,20,0.07)', surface:'wood',  ambience:'candle', stinger:'distantChair', tension: 0.28 },
  kitchen:   { tint:'rgba(30,85,70,0.07)',  surface:'stone', ambience:'metal',  stinger:'knifePing', tension: 0.32 },
  childroom: { tint:'rgba(95,35,90,0.08)',  surface:'wood',  ambience:'music',  stinger:'musicBox', tension: 0.45 },
  garden:    { tint:'rgba(35,90,45,0.08)',  surface:'grass', ambience:'wind',   stinger:'branchSnap', tension: 0.24 },
  attic:     { tint:'rgba(85,25,130,0.10)', surface:'wood',  ambience:'wind',   stinger:'mirrorHum', tension: 0.55 },
  basement:  { tint:'rgba(105,20,20,0.09)', surface:'stone', ambience:'drip',   stinger:'pipeKnock', tension: 0.5 },
  bedroom:   { tint:'rgba(110,45,45,0.08)', surface:'wood',  ambience:'cloth',  stinger:'bedCreak', tension: 0.38 },
};

// Which room is the player in given position?
export function getRoomAtPos(wx, wy) {
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);
  for (const [id, r] of Object.entries(ROOM_DEFS)) {
    if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
      return id;
    }
  }
  return null;
}

export function getSurfaceAtPos(wx, wy) {
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);
  const room = getRoomAtPos(wx, wy);
  if (room && ROOM_MOODS[room]) return ROOM_MOODS[room].surface;

  const map = _lastBuiltMap;
  const cell = map?.[ty]?.[tx];
  if (cell === 2 || cell === 3) return 'wood';
  if (room === 'garden') return 'grass';
  return 'stone';
}

// Build the full 36×36 map
export function buildMap() {
  // Start: all walls
  const map = Array.from({length: MAP_H}, () => new Uint8Array(MAP_W).fill(1));

  // Helper: carve room interior
  function carveRoom(x, y, w, h, wallType = 0) {
    for (let row = y; row < y + h; row++)
      for (let col = x; col < x + w; col++)
        map[row][col] = wallType;
  }

  // Helper: carve corridor (horizontal or vertical)
  function carveH(x1, x2, y, thickness = 2) {
    for (let row = y; row < y + thickness; row++)
      for (let col = x1; col <= x2; col++)
        map[row][col] = 0;
  }
  function carveV(y1, y2, x, thickness = 2) {
    for (let row = y1; row <= y2; row++)
      for (let col = x; col < x + thickness; col++)
        map[row][col] = 0;
  }

  // Carve all 8 room interiors
  carveRoom(2,  1,  8, 8); // attic
  carveRoom(14, 1,  8, 8); // garden
  carveRoom(26, 1,  8, 8); // childroom
  carveRoom(2,  13, 8, 8); // library
  carveRoom(14, 13, 8, 8); // entrance
  carveRoom(26, 13, 8, 8); // kitchen
  carveRoom(2,  25, 8, 8); // basement
  carveRoom(14, 25, 8, 8); // dining
  carveRoom(26, 25, 8, 8); // bedroom

  // Horizontal corridors (between rooms on same row)
  // attic <-> garden (row 4-5, cols 10-14)
  carveH(10, 13, 4);
  // garden <-> childroom (row 4-5, cols 22-26)
  carveH(22, 25, 4);
  // library <-> entrance (row 16-17)
  carveH(10, 13, 16);
  // entrance <-> kitchen (row 16-17)
  carveH(22, 25, 16);
  // basement <-> dining (row 28-29)
  carveH(10, 13, 28);
  // dining <-> bedroom (row 28-29)
  carveH(22, 25, 28);

  // Vertical corridors (between row 1 rooms and row 2 rooms)
  // attic <-> library (col 5-6, rows 9-12)
  carveV(9, 12, 5);
  // garden <-> entrance (col 17-18, rows 9-12)
  carveV(9, 12, 17);
  // childroom <-> kitchen (col 29-30, rows 9-12)
  carveV(9, 12, 29);
  // library <-> basement (col 5-6, rows 21-24)
  carveV(21, 24, 5);
  // entrance <-> dining (col 17-18, rows 21-24)
  carveV(21, 24, 17);
  // kitchen <-> bedroom (col 29-30, rows 21-24)
  carveV(21, 24, 29);

  // Place bookshelves in library (type 3)
  const shelves = [[2,14],[4,14],[6,14],[2,16],[4,16],[6,16],[2,18],[4,18],[6,18]];
  shelves.forEach(([c,r]) => { if (map[r] && map[r][c] === 0) map[r][c] = 3; });

  // Place ritual marks in attic (type 4)
  const ritual = [[4,3],[5,3],[6,3],[4,5],[5,5],[6,5]];
  ritual.forEach(([c,r]) => { if (map[r] && map[r][c] === 0) map[r][c] = 0; }); // keep floor

  // Place wood paneling in bedroom (type 2)
  const wood = [[27,26],[28,26],[30,26],[31,26],[27,31],[28,31],[30,31],[31,31]];
  wood.forEach(([c,r]) => { if (map[r] && map[r][c] === 0) map[r][c] = 2; });

  _lastBuiltMap = map;
  return map;
}

// Item spawn positions [world x, world y]
export function getItemSpawns() {
  return {
    // Memory shards (4 total)
    shard1: { wx: (6  *TILE)+32, wy: (3  *TILE)+32, room:'attic',    emoji:'💎', name:'Memory Shard 1', type:'shard' },
    shard2: { wx: (30 *TILE)+32, wy: (4  *TILE)+32, room:'childroom',emoji:'💎', name:'Memory Shard 2', type:'shard' },
    shard3: { wx: (4  *TILE)+32, wy: (27 *TILE)+32, room:'basement', emoji:'💎', name:'Memory Shard 3', type:'shard' },
    shard4: { wx: (30 *TILE)+32, wy: (27 *TILE)+32, room:'bedroom',  emoji:'💎', name:'Memory Shard 4', type:'shard' },

    // Clues / inventory items
    diary:  { wx: (15 *TILE)+32, wy: (14 *TILE)+32, room:'entrance', emoji:'📔', name:'Elara\'s Diary',  type:'clue', desc:'Entry: "Father has locked me in again..."' },
    photo:  { wx: (15 *TILE)+32, wy: (2  *TILE)+32, room:'garden',   emoji:'📷', name:'Old Photograph', type:'clue', desc:'A family of three. One face is scratched out.' },
    crowbar:{ wx: (4  *TILE)+32, wy: (15 *TILE)+32, room:'library',  emoji:'🔧', name:'Iron Crowbar',   type:'key',  desc:'Pries open the basement hatch.' },
    candle: { wx: (15 *TILE)+32, wy: (26 *TILE)+32, room:'dining',   emoji:'🕯', name:'Black Candle',   type:'key',  desc:'Burns with a cold, purple flame.' },
    oil:    { wx: (28 *TILE)+32, wy: (15 *TILE)+32, room:'kitchen',  emoji:'🫙', name:'Lantern Oil',    type:'consumable', desc:'Refills lantern fuel.' },

    // Puzzle clues for combination lock
    note1:  { wx: (5  *TILE)+32, wy: (15 *TILE)+32, room:'library',  emoji:'📃', name:'Torn Note',      type:'clue', desc:'The first digit is the year Elara was born minus 1987.' },
    note2:  { wx: (29 *TILE)+32, wy: (3  *TILE)+32, room:'childroom',emoji:'📃', name:'Child\'s Drawing',type:'clue', desc:'Second digit: count the candles in the dining room painting. (4)' },
    note3:  { wx: (4  *TILE)+32, wy: (29 *TILE)+32, room:'basement', emoji:'📃', name:'Torn Notebook',  type:'clue', desc:'Third digit: the date of the Blackwood fire. It was the 7th.' },
  };
}

// Hiding spot positions
export function getHidingSpots() {
  return [
    { wx: (9  *TILE)-16, wy: (14 *TILE)+32, room:'library',   emoji:'🗄', name:'Old Wardrobe' },
    { wx: (14 *TILE)+32, wy: (20 *TILE)+32, room:'entrance',  emoji:'🗄', name:'Hall Cabinet' },
    { wx: (27 *TILE)+32, wy: (7  *TILE)+16, room:'childroom', emoji:'🗄', name:'Toy Chest' },
    { wx: (9  *TILE)-16, wy: (28 *TILE)+32, room:'basement',  emoji:'🗄', name:'Coal Bin' },
    { wx: (33 *TILE)+16, wy: (28 *TILE)+32, room:'bedroom',   emoji:'🗄', name:'Armoire' },
  ];
}

// Ghost patrol waypoints (world coords)
export function getGhostPatrol() {
  const c = (tx, ty) => ({ x: tx * TILE + 32, y: ty * TILE + 32 });
  return [
    c(17,14), c(17,20), c(17,17), c(5,17), c(5,14),  // entrance -> library loop
    c(5,5),   c(17,5),  c(29,5),  c(29,14),           // upper floor loop
    c(29,28), c(17,28), c(5,28),  c(5,14), c(17,14),  // lower floor loop
  ];
}
