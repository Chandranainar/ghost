// js/core/performance.js — Performance Monitoring & Optimization

export class PerformanceMonitor {
  constructor() {
    this.frameTimeHistory = [];
    this.maxHistoryLength = 60;
    this.fps = 60;
    this.avgFrameTime = 0;
    this.isLowPerf = false;
    this.qualityLevel = 'high'; // high | medium | low
  }

  /**
   * Record frame time
   */
  recordFrame(frameTime) {
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxHistoryLength) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate average
    this.avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.fps = 1000 / this.avgFrameTime;
    
    // Detect performance issues
    this.detectPerformanceIssues();
  }

  /**
   * Detect if performance is degrading
   */
  detectPerformanceIssues() {
    // If average frame time exceeds 16.67ms (60 FPS), we have issues
    if (this.avgFrameTime > 20) {
      this.isLowPerf = true;
      this.adjustQuality();
    } else if (this.avgFrameTime < 10) {
      this.isLowPerf = false;
      if (this.qualityLevel !== 'high') {
        this.qualityLevel = 'high';
      }
    }
  }

  /**
   * Adjust quality based on performance
   */
  adjustQuality() {
    if (this.avgFrameTime > 30) {
      this.qualityLevel = 'low';
    } else if (this.avgFrameTime > 20) {
      this.qualityLevel = 'medium';
    }
  }

  /**
   * Get frame time in milliseconds
   */
  getAvgFrameTime() {
    return this.avgFrameTime;
  }

  /**
   * Get current FPS
   */
  getFPS() {
    return Math.round(this.fps);
  }

  /**
   * Get quality level settings based on performance
   */
  getQualitySettings() {
    const settings = {
      high: {
        renderDistance: 15,
        particleMax: 500,
        shadowQuality: 'high',
        postFXEnabled: true,
        motionBlur: true,
        filmGrain: true,
        chromaticAberration: true
      },
      medium: {
        renderDistance: 10,
        particleMax: 300,
        shadowQuality: 'medium',
        postFXEnabled: true,
        motionBlur: false,
        filmGrain: true,
        chromaticAberration: false
      },
      low: {
        renderDistance: 8,
        particleMax: 100,
        shadowQuality: 'low',
        postFXEnabled: false,
        motionBlur: false,
        filmGrain: false,
        chromaticAberration: false
      }
    };
    
    return settings[this.qualityLevel] || settings.high;
  }

  /**
   * Get debug info string
   */
  getDebugInfo() {
    return `FPS: ${this.getFPS()} | Avg Frame: ${this.avgFrameTime.toFixed(2)}ms | Quality: ${this.qualityLevel}`;
  }
}

/**
 * Memory pool for object recycling (reduces GC pressure)
 */
export class ObjectPool {
  constructor(ObjectClass, initialSize = 100) {
    this.ObjectClass = ObjectClass;
    this.available = [];
    this.inUse = new Set();
    
    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(new ObjectClass());
    }
  }

  /**
   * Get object from pool
   */
  get() {
    if (this.available.length === 0) {
      this.available.push(new this.ObjectClass());
    }
    
    const obj = this.available.pop();
    this.inUse.add(obj);
    return obj;
  }

  /**
   * Return object to pool
   */
  release(obj) {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.available.push(obj);
    }
  }

  /**
   * Release all objects
   */
  releaseAll() {
    for (const obj of this.inUse) {
      this.available.push(obj);
    }
    this.inUse.clear();
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}

/**
 * Throttle function calls
 */
export class Throttle {
  constructor(fn, minInterval) {
    this.fn = fn;
    this.minInterval = minInterval;
    this.lastCall = 0;
  }

  /**
   * Call function if enough time has passed
   */
  call(...args) {
    const now = Date.now();
    if (now - this.lastCall >= this.minInterval) {
      this.lastCall = now;
      return this.fn(...args);
    }
  }

  /**
   * Reset throttle
   */
  reset() {
    this.lastCall = 0;
  }
}

/**
 * Debounce function calls
 */
export class Debounce {
  constructor(fn, delay) {
    this.fn = fn;
    this.delay = delay;
    this.timeout = null;
  }

  /**
   * Call function after delay
   */
  call(...args) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.fn(...args);
    }, this.delay);
  }

  /**
   * Cancel pending call
   */
  cancel() {
    clearTimeout(this.timeout);
    this.timeout = null;
  }
}

export const perfMonitor = new PerformanceMonitor();
