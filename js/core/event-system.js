// js/core/event-system.js — Game Event System for Narrative & Gameplay

export class EventSystem {
  constructor() {
    this.listeners = {};
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.eventSequences = [];
    this.currentSequence = null;
  }

  /**
   * Subscribe to an event
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners[eventName].indexOf(callback);
      if (index > -1) {
        this.listeners[eventName].splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to event once
   */
  once(eventName, callback) {
    const unsubscribe = this.on(eventName, (...args) => {
      callback(...args);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * Emit an event
   */
  emit(eventName, data = null) {
    this.recordEvent(eventName, data);
    
    if (this.listeners[eventName]) {
      for (const callback of this.listeners[eventName]) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      }
    }
  }

  /**
   * Record event in history
   */
  recordEvent(eventName, data) {
    this.eventHistory.push({
      name: eventName,
      data,
      timestamp: Date.now()
    });
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Remove listener
   */
  off(eventName, callback) {
    if (this.listeners[eventName]) {
      const index = this.listeners[eventName].indexOf(callback);
      if (index > -1) {
        this.listeners[eventName].splice(index, 1);
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAll(eventName = null) {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      this.listeners = {};
    }
  }

  /**
   * Get event history
   */
  getHistory() {
    return [...this.eventHistory];
  }

  /**
   * Create event sequence (chain of events)
   */
  createSequence(name, events) {
    const sequence = {
      name,
      events,
      currentIndex: 0,
      active: false,
      completed: false
    };
    
    this.eventSequences.push(sequence);
    return sequence;
  }

  /**
   * Start event sequence
   */
  playSequence(sequenceName) {
    const sequence = this.eventSequences.find(s => s.name === sequenceName);
    if (!sequence) return;
    
    this.currentSequence = sequence;
    sequence.active = true;
    sequence.completed = false;
    sequence.currentIndex = 0;
    
    this.playNextInSequence();
  }

  /**
   * Play next event in sequence
   */
  playNextInSequence() {
    if (!this.currentSequence) return;
    
    const sequence = this.currentSequence;
    if (sequence.currentIndex >= sequence.events.length) {
      sequence.active = false;
      sequence.completed = true;
      this.emit('sequence_complete', { name: sequence.name });
      return;
    }
    
    const event = sequence.events[sequence.currentIndex];
    sequence.currentIndex++;
    
    // Execute event
    if (typeof event.fn === 'function') {
      const result = event.fn();
      
      // If returns promise, wait for it
      if (result instanceof Promise) {
        result.then(() => this.playNextInSequence());
      } else if (typeof result === 'number') {
        // If returns number, use as delay
        setTimeout(() => this.playNextInSequence(), result);
      } else {
        this.playNextInSequence();
      }
    }
  }

  /**
   * Skip current sequence
   */
  skipSequence() {
    if (this.currentSequence) {
      this.currentSequence.active = false;
      this.currentSequence.completed = true;
      this.currentSequence = null;
    }
  }

  /**
   * Create timed event (delay then emit)
   */
  scheduleEvent(eventName, delay, data = null) {
    return setTimeout(() => {
      this.emit(eventName, data);
    }, delay);
  }

  /**
   * Create repeating event
   */
  repeatEvent(eventName, interval, maxTimes = -1, data = null) {
    let count = 0;
    return setInterval(() => {
      this.emit(eventName, data);
      count++;
      
      if (maxTimes > 0 && count >= maxTimes) {
        clearInterval(this.repeatEventID);
      }
    }, interval);
  }
}

/**
 * Built-in game events
 */
export const GameEvents = {
  // Player events
  PLAYER_DAMAGED: 'player_damaged',
  PLAYER_HEALED: 'player_healed',
  PLAYER_DIED: 'player_died',
  PLAYER_MOVED: 'player_moved',
  PLAYER_HIDING: 'player_hiding',
  PLAYER_REVEALED: 'player_revealed',
  PLAYER_INVENTORY_CHANGED: 'player_inventory_changed',
  
  // Ghost events
  GHOST_SPOTTED: 'ghost_spotted',
  GHOST_ATTACKED: 'ghost_attacked',
  GHOST_FROZEN: 'ghost_frozen',
  GHOST_STUNNED: 'ghost_stunned',
  GHOST_ESCAPED: 'ghost_escaped',
  
  // Puzzle events
  PUZZLE_STARTED: 'puzzle_started',
  PUZZLE_SOLVED: 'puzzle_solved',
  PUZZLE_FAILED: 'puzzle_failed',
  
  // Item events
  ITEM_FOUND: 'item_found',
  ITEM_COLLECTED: 'item_collected',
  ITEM_USED: 'item_used',
  
  // Narrative events
  DIALOGUE_START: 'dialogue_start',
  DIALOGUE_END: 'dialogue_end',
  CUTSCENE_START: 'cutscene_start',
  CUTSCENE_END: 'cutscene_end',
  
  // Game state events
  GAME_STARTED: 'game_started',
  GAME_PAUSED: 'game_paused',
  GAME_RESUMED: 'game_resumed',
  GAME_WON: 'game_won',
  GAME_OVER: 'game_over',
  
  // Environmental events
  WEATHER_CHANGED: 'weather_changed',
  TIME_CHANGED: 'time_changed',
  ROOM_ENTERED: 'room_entered',
  ROOM_EXITED: 'room_exited'
};

export const eventSystem = new EventSystem();
