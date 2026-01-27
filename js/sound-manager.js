class SoundManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.5;
    this.sounds = {
      click: this.createAudio('sounds/click.mp3'),
      correct: this.createAudio('sounds/correct.mp3'),
      wrong: this.createAudio('sounds/wrong.mp3'),
      countdown: this.createAudio('sounds/countdown.mp3'),
      timesup: this.createAudio('sounds/timesup.mp3'),
      win: this.createAudio('sounds/win.mp3'),
      lose: this.createAudio('sounds/lose.mp3'),
      background: this.createAudio('sounds/background.mp3', { loop: true })
    };
  }

  createAudio(src, options = {}) {
    const audio = new Audio(src);
    audio.volume = this.volume;
    audio.loop = !!options.loop;
    audio.setAttribute('preload', 'auto');
    audio.setAttribute('playsinline', '');
    return audio;
  }

  setEnabled(value) {
    this.enabled = value;
    if (!value) {
      this.stopAll();
    }
  }

  setVolume(value) {
    this.volume = value;
    for (let key in this.sounds) {
      this.sounds[key].volume = value;
    }
  }

  stopAll() {
    for (let key in this.sounds) {
      const sound = this.sounds[key];
      sound.pause();
      sound.currentTime = 0;
    }
  }

  // Play sound without pausing background media (e.g. Spotify)
  play(soundKey) {
    if (!this.enabled) return;

    const original = this.sounds[soundKey];
    if (!original) {
      console.warn(`Sound not found: ${soundKey}`);
      return;
    }

    const clone = original.cloneNode();
    clone.volume = this.volume;
    clone.setAttribute('playsinline', '');
    clone.setAttribute('muted', '');
    clone.muted = true;

    // Silent unlock
    clone.play().then(() => {
      clone.muted = false;
      clone.volume = this.volume;

      // Real playback
      clone.play().catch(err => {
        console.warn(`Playback error: ${soundKey}`, err);
      });
    }).catch(err => {
      console.warn(`Initial silent play failed: ${soundKey}`, err);
    });
  }

  playLoop(soundKey) {
    if (!this.enabled) return;

    const sound = this.sounds[soundKey];
    if (!sound) return;

    sound.loop = true;
    sound.volume = this.volume;
    sound.play().catch(err => {
      console.warn(`Loop playback failed: ${soundKey}`, err);
    });
  }

  stop(soundKey) {
    const sound = this.sounds[soundKey];
    if (!sound) return;
    sound.pause();
    sound.currentTime = 0;
  }
}

const soundManager = new SoundManager();
export default soundManager;