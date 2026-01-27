class SoundManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.5;
    this.sounds = {
      click: new Audio('sounds/click.mp3'),
      correct: new Audio('sounds/correct.mp3'),
      wrong: new Audio('sounds/wrong.mp3'),
      countdown: new Audio('sounds/countdown.mp3'),
      timesup: new Audio('sounds/timesup.mp3'),
      win: new Audio('sounds/win.mp3'),
      lose: new Audio('sounds/lose.mp3')
    };

    for (let key in this.sounds) {
      this.sounds[key].volume = this.volume;
    }
  }

  setEnabled(value) {
    this.enabled = value;
  }

  setVolume(value) {
    this.volume = value;
    for (let key in this.sounds) {
      this.sounds[key].volume = this.volume;
    }
  }

  // Play a sound without interrupting background music apps
  play(soundKey) {
    if (!this.enabled) return;

    const sound = this.sounds[soundKey];
    if (!sound) {
      console.warn(`Sound not found: ${soundKey}`);
      return;
    }

    const audioClone = sound.cloneNode();
    audioClone.volume = this.volume;

    // Setup to avoid interrupting background audio
    audioClone.setAttribute('playsinline', '');
    audioClone.setAttribute('muted', '');
    audioClone.muted = true;

    // Play silently once to "unlock" safe playback
    audioClone.play().then(() => {
      audioClone.muted = false;
      audioClone.volume = this.volume;

      // Play again with actual sound
      audioClone.play().catch(err => {
        console.warn(`Failed to play sound: ${soundKey}`, err);
      });
    }).catch(err => {
      console.warn(`Silent play failed: ${soundKey}`, err);
    });
  }
}

const soundManager = new SoundManager();
