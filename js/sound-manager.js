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
      lose: new Audio('sounds/lose.mp3'),
      background: new Audio('sounds/background.mp3')
    };

    for (let key in this.sounds) {
      this.sounds[key].volume = this.volume;
    }

    this.sounds.background.loop = true;
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

  play(soundKey) {
    if (!this.enabled) return;

    const sound = this.sounds[soundKey];
    if (!sound) return;

    const clone = sound.cloneNode();
    clone.volume = this.volume;
    clone.play().catch(err => {
      console.warn(`Failed to play sound: ${soundKey}`, err);
    });
  }

  playLoop(soundKey) {
    if (!this.enabled) return;

    const sound = this.sounds[soundKey];
    if (!sound) return;

    sound.loop = true;
    sound.volume = this.volume;
    sound.play().catch(err => {
      console.warn(`Failed to play sound: ${soundKey}`, err);
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
