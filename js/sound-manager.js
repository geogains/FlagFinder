const soundManager = {
  sounds: {},
  isInitialized: false,

  async init(soundMap) {
    if (this.isInitialized) return;
    const promises = [];

    for (const [key, path] of Object.entries(soundMap)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      audio.volume = 1.0;

      this.sounds[key] = audio;

      promises.push(new Promise((resolve) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = () => {
          console.warn(`Failed to load sound: ${key}`);
          resolve();
        };
      }));
    }

    await Promise.all(promises);
    this.isInitialized = true;
  },

  play(soundKey) {
    const original = this.sounds[soundKey];
    if (!original) return;

    const clone = original.cloneNode(true);

    // SAFARI-FRIENDLY SOUND UNLOCK
    clone.muted = true;
    clone.play()
      .then(() => {
        clone.muted = false;
        clone.currentTime = 0;
        clone.play().catch((err) => {
          console.warn(`Unmuted playback failed: ${soundKey}`, err);
        });
      })
      .catch((err) => {
        console.warn(`Initial muted play failed: ${soundKey}`, err);
      });
  },

  stop(soundKey) {
    const sound = this.sounds[soundKey];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }
};

export default soundManager;
