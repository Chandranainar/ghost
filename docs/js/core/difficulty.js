// js/core/difficulty.js — Difficulty & Adaptive AI System

export class DifficultyManager {
  constructor() {
    this.difficulty = 'normal'; // easy | normal | hard | nightmare
    this.adaptiveMode = true; // Adjust difficulty based on player performance
    this.playerSkillEstimate = 0.5; // 0-1
    this.deathCount = 0;
    this.successStreak = 0;
    this.lastDeathTime = 0;
  }

  /**
   * Get current difficulty settings
   */
  getSettings() {
    const settings = {
      easy: {
        ghostSpeed: 0.8,
        ghostHearRange: 3,
        ghostSightRange: 5,
        playerHealth: 150,
        playerDamageReduction: 0.5,
        puzzleDifficulty: 0.7,
        itemDropRate: 1.2,
        ghostRespawnTime: 15
      },
      normal: {
        ghostSpeed: 1.0,
        ghostHearRange: 6,
        ghostSightRange: 7,
        playerHealth: 100,
        playerDamageReduction: 1.0,
        puzzleDifficulty: 1.0,
        itemDropRate: 1.0,
        ghostRespawnTime: 10
      },
      hard: {
        ghostSpeed: 1.3,
        ghostHearRange: 8,
        ghostSightRange: 9,
        playerHealth: 75,
        playerDamageReduction: 1.5,
        puzzleDifficulty: 1.3,
        itemDropRate: 0.8,
        ghostRespawnTime: 5
      },
      nightmare: {
        ghostSpeed: 1.6,
        ghostHearRange: 10,
        ghostSightRange: 12,
        playerHealth: 50,
        playerDamageReduction: 2.0,
        puzzleDifficulty: 1.6,
        itemDropRate: 0.5,
        ghostRespawnTime: 2
      }
    };

    if (this.adaptiveMode) {
      return this.applyAdaptiveAdjustments(settings[this.difficulty]);
    }
    
    return settings[this.difficulty] || settings.normal;
  }

  /**
   * Apply adaptive difficulty adjustments
   */
  applyAdaptiveAdjustments(baseSettings) {
    const adjusted = { ...baseSettings };
    
    // Player is doing well - increase difficulty
    if (this.playerSkillEstimate > 0.7) {
      adjusted.ghostSpeed *= 1.15;
      adjusted.ghostHearRange *= 1.1;
      adjusted.ghostSightRange *= 1.1;
      adjusted.puzzleDifficulty *= 1.1;
    }
    
    // Player is struggling - decrease difficulty
    if (this.playerSkillEstimate < 0.3) {
      adjusted.ghostSpeed *= 0.85;
      adjusted.ghostHearRange *= 0.9;
      adjusted.ghostSightRange *= 0.9;
      adjusted.playerHealth *= 1.2;
      adjusted.itemDropRate *= 1.3;
    }
    
    // Recent deaths - temporarily ease difficulty
    if (Date.now() - this.lastDeathTime < 30000) {
      const timeSinceDeath = (Date.now() - this.lastDeathTime) / 1000;
      const easeAmount = Math.max(0, 1 - timeSinceDeath / 30);
      adjusted.ghostSpeed *= 1 - easeAmount * 0.3;
      adjusted.playerHealth *= 1 + easeAmount * 0.4;
    }
    
    return adjusted;
  }

  /**
   * Update player skill estimate
   */
  updateSkillEstimate(survived, timeAlive, puzzlesSolved, healthRemaining) {
    let skillScore = 0;
    
    // Time alive (up to 10 minutes = 1.0)
    skillScore += Math.min(1, timeAlive / 600) * 0.3;
    
    // Puzzles solved
    skillScore += (puzzlesSolved / 3) * 0.3;
    
    // Health remaining (avoid damage = better player)
    skillScore += (healthRemaining / 100) * 0.4;
    
    // Survived
    if (survived) {
      this.successStreak++;
      skillScore *= 1 + (this.successStreak * 0.1);
    } else {
      this.successStreak = 0;
    }
    
    // Smooth out skill estimate
    this.playerSkillEstimate = this.playerSkillEstimate * 0.7 + skillScore * 0.3;
    this.playerSkillEstimate = Math.max(0, Math.min(1, this.playerSkillEstimate));
  }

  /**
   * Record player death
   */
  recordDeath() {
    this.deathCount++;
    this.lastDeathTime = Date.now();
    this.successStreak = 0;
    
    // Don't lower skill too much from deaths
    this.playerSkillEstimate *= 0.9;
    
    console.log(`Death recorded. Total deaths: ${this.deathCount}, Skill: ${this.playerSkillEstimate.toFixed(2)}`);
  }

  /**
   * Set difficulty
   */
  setDifficulty(level) {
    if (['easy', 'normal', 'hard', 'nightmare'].includes(level)) {
      this.difficulty = level;
      this.adaptiveMode = false;
    }
  }

  /**
   * Enable adaptive difficulty
   */
  enableAdaptive() {
    this.adaptiveMode = true;
  }

  /**
   * Get AI behavior parameters
   */
  getAIBehavior() {
    const settings = this.getSettings();
    
    return {
      ghostCount: this.difficulty === 'nightmare' ? 3 : this.difficulty === 'hard' ? 2 : 1,
      ghostAggression: {
        easy: 0.4,
        normal: 0.6,
        hard: 0.8,
        nightmare: 1.0
      }[this.difficulty],
      ghostIntelligence: {
        easy: 0.5,
        normal: 0.7,
        hard: 0.9,
        nightmare: 1.0
      }[this.difficulty],
      usePathfinding: this.difficulty !== 'easy',
      groupBehavior: this.difficulty === 'nightmare',
      canHunt: this.difficulty === 'nightmare',
      speed: settings.ghostSpeed
    };
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      difficulty: this.difficulty,
      adaptive: this.adaptiveMode,
      skill: this.playerSkillEstimate.toFixed(2),
      deaths: this.deathCount,
      streak: this.successStreak
    };
  }
}

export const difficultyManager = new DifficultyManager();
