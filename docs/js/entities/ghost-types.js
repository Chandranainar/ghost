// js/entities/ghost-types.js — Multiple Ghost Types with Distinct Behaviors

import { State, emitNoise } from '../core/state.js';
import { Audio } from '../core/audio.js';
import { TILE, MAP_W, MAP_H } from '../maps/manor.js';

const PATROL_SPEED     = 1.2;
const INVESTIGATE_SPEED= 2.0;
const CHASE_SPEED      = 3.2;
const RETREAT_SPEED    = 1.8;

const LOS_RANGE      = 7 * TILE;
const HEAR_RANGE_MAX = 6 * TILE;
const ATTACK_RANGE   = TILE * 0.6;
const CHASE_TIMEOUT  = 8;

/**
 * Base Ghost Type
 */
export class Ghost {
  constructor(x, y, type = 'cyrus') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.state = 'patrol';
    this.health = 100;
    this.speed = PATROL_SPEED;
    
    // AI state
    this.targetX = x;
    this.targetY = y;
    this.lastHeardX = x;
    this.lastHeardY = y;
    this.chaseTimer = 0;
    this.sightTimer = 0;
    
    // Animation
    this.anim = 0;
    this.vx = 0;
    this.vy = 0;
    
    this.setupTypeDefaults();
  }

  setupTypeDefaults() {
    switch(this.type) {
      case 'cyrus':
        this.speed = PATROL_SPEED;
        this.sightRange = LOS_RANGE;
        this.hearRange = HEAR_RANGE_MAX;
        this.attackDamage = 15;
        break;
      case 'specter':
        this.speed = PATROL_SPEED * 1.5; // Faster
        this.sightRange = LOS_RANGE * 0.6; // Harder to spot visually
        this.hearRange = HEAR_RANGE_MAX * 1.3; // Better hearing
        this.attackDamage = 10;
        this.invisible = true;
        break;
      case 'poltergeist':
        this.speed = PATROL_SPEED * 0.7; // Slower
        this.sightRange = LOS_RANGE * 0.5; // Weak sight
        this.hearRange = HEAR_RANGE_MAX * 2.0; // Excellent hearing
        this.attackDamage = 5;
        this.canThrowObjects = true;
        break;
    }
  }

  update(dt, player, playerAngle) {
    this.anim += dt;
    
    // Handle each state
    switch(this.state) {
      case 'patrol':
        this.updatePatrol(dt, player);
        break;
      case 'investigate':
        this.updateInvestigate(dt, player);
        break;
      case 'chase':
        this.updateChase(dt, player, playerAngle);
        break;
      case 'stunned':
        this.updateStunned(dt);
        break;
      case 'retreat':
        this.updateRetreat(dt, player);
        break;
    }
    
    // Move towards target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 1) {
      const speed = this.speed * (this.state === 'chase' ? CHASE_SPEED / PATROL_SPEED : 1);
      this.vx = (dx / dist) * speed * dt * 60;
      this.vy = (dy / dist) * speed * dt * 60;
      this.x += this.vx;
      this.y += this.vy;
    }
    
    // Check if can see player
    this.checkPlayerVisibility(player);
    
    // Process noise events
    this.processNoise(player);
  }

  updatePatrol(dt, player) {
    // Wander around
    if (Math.hypot(this.targetX - this.x, this.targetY - this.y) < TILE * 0.5) {
      this.pickNewPatrolTarget();
    }
  }

  updateInvestigate(dt, player) {
    // Move towards last heard position
    const dist = Math.hypot(this.lastHeardX - this.x, this.lastHeardY - this.y);
    if (dist < TILE) {
      // Reached investigation point, go back to patrol
      this.state = 'patrol';
      this.targetX = this.x;
      this.targetY = this.y;
    }
    
    this.targetX = this.lastHeardX;
    this.targetY = this.lastHeardY;
  }

  updateChase(dt, player, playerAngle) {
    this.chaseTimer += dt;
    
    // Chase player
    this.targetX = player.x;
    this.targetY = player.y;
    
    // Predict player movement based on velocity
    if (this.type !== 'specter') {
      this.targetX += player.vx * 0.3;
      this.targetY += player.vy * 0.3;
    } else {
      // Specter is smarter - predicts better
      this.targetX += player.vx * 0.6;
      this.targetY += player.vy * 0.6;
    }
    
    // Give up chase after timeout
    if (this.chaseTimer > CHASE_TIMEOUT) {
      this.state = 'retreat';
      this.chaseTimer = 0;
    }
    
    // Check attack range
    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist < ATTACK_RANGE) {
      player.damage(this.attackDamage, this.type);
    }
  }

  updateStunned(dt) {
    this.sightTimer -= dt;
    if (this.sightTimer <= 0) {
      this.state = 'patrol';
      this.health = Math.min(100, this.health + 20); // Recover some health
    }
  }

  updateRetreat(dt, player) {
    // Run away from player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > LOS_RANGE * 1.5) {
      this.state = 'patrol';
      this.targetX = this.x;
      this.targetY = this.y;
    }
    
    // Set target opposite to player
    this.targetX = this.x - (dx / dist) * TILE * 3;
    this.targetY = this.y - (dy / dist) * TILE * 3;
  }

  checkPlayerVisibility(player) {
    if (player.isHiding) return;
    
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < this.sightRange) {
      // Player visible!
      if (this.state !== 'chase') {
        this.state = 'chase';
        this.chaseTimer = 0;
      }
      this.sightTimer = 3; // Keep chasing for 3 seconds after losing sight
    }
  }

  processNoise(player) {
    for (const ev of State.noiseEvents) {
      const dx = ev.x - this.x;
      const dy = ev.y - this.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < this.hearRange && dist < ev.radius) {
        if (this.state === 'patrol' || this.state === 'retreat') {
          this.state = 'investigate';
          this.lastHeardX = ev.x;
          this.lastHeardY = ev.y;
        }
      }
    }
  }

  pickNewPatrolTarget() {
    const angle = Math.random() * Math.PI * 2;
    const dist = TILE * (2 + Math.random() * 3);
    this.targetX = this.x + Math.cos(angle) * dist;
    this.targetY = this.y + Math.sin(angle) * dist;
  }

  receive(freezeDamage) {
    this.health -= freezeDamage;
    if (this.health <= 0) {
      this.state = 'stunned';
      this.sightTimer = 5;
      this.health = 100; // Reset for respawn
    } else if (this.health < 50) {
      this.state = 'retreat';
    }
  }
}

/**
 * Specter - Invisible Ghost
 * Harder to detect, faster, better hearing
 */
export class Specter extends Ghost {
  constructor(x, y) {
    super(x, y, 'specter');
    this.visibility = 0.2; // Mostly invisible
  }

  update(dt, player, playerAngle) {
    // Fade in/out based on distance to player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    
    // When close, becomes more visible
    this.visibility = Math.max(0.1, 1 - dist / (TILE * 5));
    
    super.update(dt, player, playerAngle);
  }

  checkPlayerVisibility(player) {
    if (player.isHiding) return;
    
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    
    // Much harder to see, but senses better
    if (dist < this.sightRange && dist < TILE * 2) {
      if (this.state !== 'chase') {
        this.state = 'chase';
        this.chaseTimer = 0;
      }
    }
  }
}

/**
 * Poltergeist - Territorial Ghost
 * Weaker but can throw objects
 */
export class Poltergeist extends Ghost {
  constructor(x, y, territory = { x: 0, y: 0, radius: TILE * 5 }) {
    super(x, y, 'poltergeist');
    this.territory = territory;
    this.throwCooldown = 0;
  }

  update(dt, player, playerAngle) {
    this.throwCooldown -= dt;
    
    // Only attacks if player enters territory
    const dx = player.x - this.territory.x;
    const dy = player.y - this.territory.y;
    const distToTerritory = Math.hypot(dx, dy);
    
    if (distToTerritory > this.territory.radius) {
      if (this.state === 'chase') {
        this.state = 'patrol';
      }
    }
    
    super.update(dt, player, playerAngle);
    
    // Throw objects
    if (this.state === 'chase' && this.throwCooldown <= 0) {
      this.throwObject(player);
      this.throwCooldown = 2;
    }
  }

  checkPlayerVisibility(player) {
    // Only sees within territory
    const dx = player.x - this.territory.x;
    const dy = player.y - this.territory.y;
    const distToTerritory = Math.hypot(dx, dy);
    
    if (distToTerritory < this.territory.radius) {
      super.checkPlayerVisibility(player);
    }
  }

  throwObject(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < LOS_RANGE) {
      emitNoise(this.x, this.y, 100);
      // Object would hit player causing light damage
      if (dist < TILE * 3) {
        player.damage(5, 'poltergeist');
      }
    }
  }
}

/**
 * Create ghost based on type
 */
export function createGhost(x, y, type = 'cyrus') {
  switch(type) {
    case 'specter':
      return new Specter(x, y);
    case 'poltergeist':
      return new Poltergeist(x, y);
    default:
      return new Ghost(x, y, type);
  }
}
