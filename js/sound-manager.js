// js/sound-manager.js - Centralized sound management
class SoundManager {
  constructor() {
    this.sounds = {};
    this.enabled = localStorage.getItem('soundsEnabled') !== 'false'; // Default ON
    this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.5'); // 50% default
    this.initialized = false;
  }

  // Initialize and preload sounds
  async init(soundMap) {
    if (this.initialized) return;
    
    console.log('🔊 Initializing Sound Manager...');
    
    for (const [key, path] of Object.entries(soundMap)) {
      try {
        const audio = new Audio(path);
        audio.volume = this.volume;
        audio.preload = 'auto';
        
        // Preload by triggering load
        audio.load();
        
        this.sounds[key] = audio;
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error);
      }
    }
    
    this.initialized = true;
    console.log(`✅ Loaded ${Object.keys(this.sounds).length} sounds`);
  }

  // Play a sound
  play(soundKey) {
    if (!this.enabled) return;
    
    const sound = this.sounds[soundKey];
    if (!sound) {
      console.warn(`Sound not found: ${soundKey}`);
      return;
    }

    // Clone audio for overlapping sounds
    const audioClone = sound.cloneNode();
    audioClone.volume = this.volume;
    
    audioClone.play().catch(err => {
      console.warn(`Failed to play sound: ${soundKey}`, err);
    });
  }

  // Set volume (0.0 to 1.0)
  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
    localStorage.setItem('soundVolume', this.volume);
    
    // Update all loaded sounds
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
  }

  // Toggle sounds on/off
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('soundsEnabled', this.enabled);
    return this.enabled;
  }

  // Enable sounds
  enable() {
    this.enabled = true;
    localStorage.setItem('soundsEnabled', 'true');
  }

  // Disable sounds
  disable() {
    this.enabled = false;
    localStorage.setItem('soundsEnabled', 'false');
  }

  // Check if enabled
  isEnabled() {
    return this.enabled;
  }
}

// Create global instance
window.soundManager = new SoundManager();

// Export for modules
export { SoundManager };
export default window.soundManager;