// sound-manager.js
const soundManager = {
  sounds: {},
  isInitialized: false,

  async init(soundMap) {
    if (this.isInitialized) return;
    const promises = [];

    for (const [key, path] of Object.entries(soundMap)) {
      const audio = new Audio(path);

      // Allow game sounds to play over other audio
      audio.preload = 'auto';
      audio.load();
      audio.volume = 1.0;
      audio.muted = false;

      // This attribute prevents pausing background media like Spotify/YouTube
      audio.setAttribute('playsinline', 'true');

      // On mobile Safari, we cannot autoplay or preload sounds until user interacts
      // so we handle that outside in the game file if needed

      this.sounds[key] = audio;

      // Ensure it's loaded
      promises.push(new Promise((resolve) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => {
          console.warn(`Failed to load sound: ${path}`);
          resolve(); // Resolve even on error to avoid blocking init
        };
      }));
    }

    await Promise.all(promises);
    this.isInitialized = true;
  },

  play(soundName) {
    const sound = this.sounds[soundName];
    if (sound) {
      try {
        sound.currentTime = 0;
        sound.play().catch(err => {
          console.warn(`Sound play failed for "${soundName}":`, err);
        });
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    } else {
      console.warn(`Sound "${soundName}" not found`);
    }
  },

  stop(soundName) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  },

  muteAll() {
    for (const sound of Object.values(this.sounds)) {
      sound.muted = true;
    }
  },

  unmuteAll() {
    for (const sound of Object.values(this.sounds)) {
      sound.muted = false;
    }
  }
};

export default soundManager;
