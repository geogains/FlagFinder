// sound-manager.js
// Web Audio API based sound manager — avoids interrupting external music
// (Spotify, Anghami, etc.) unlike cloning <audio> elements.
//
// USAGE:
//   import soundManager from "./js/sound-manager.js";
//
//   // 1. Init with your sound map (same format as before)
//   await soundManager.init({ click: "/sounds/click.mp3", win: "/sounds/win.mp3" });
//
//   // 2. Unlock from a user gesture (required once on iOS/Safari)
//   window.addEventListener("pointerdown", () => soundManager.unlock(), { once: true });
//
//   // 3. Play sounds as before
//   soundManager.play("click");

const soundManager = {
  buffers: {},
  activeSources: {},

  // State
  isInitialized: false,
  isUnlocked: false,
  muted: false,

  // Web Audio nodes
  ctx: null,
  masterGain: null,

  // Defaults
  defaultVolume: 1.0,
  defaultPlaybackRate: 1.0,

  async init(soundMap) {
    if (this.isInitialized) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn("Web Audio API not supported in this browser.");
      this.isInitialized = true;
      return;
    }

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.defaultVolume;
    this.masterGain.connect(this.ctx.destination);

    // Preload and decode all sounds into buffers
    const entries = Object.entries(soundMap);

    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();

          const buffer = await new Promise((resolve, reject) => {
            // decodeAudioData has both callback and promise forms depending on browser
            const result = this.ctx.decodeAudioData(
              arrayBuffer,
              (decoded) => resolve(decoded),
              (err) => reject(err)
            );
            // Some browsers return a promise; only use it if callbacks haven't fired
            if (result && typeof result.then === "function") {
              result.catch(() => {}); // prevent unhandled rejection from the promise form
            }
          });

          this.buffers[key] = buffer;
        } catch (err) {
          console.warn(`Failed to load/decode sound: ${key}`, err);
        }
      })
    );

    this.isInitialized = true;
  },

  /**
   * Must be called from a user gesture at least once (click / touch / keydown).
   * Best approach: window.addEventListener("pointerdown", () => soundManager.unlock(), { once: true });
   */
  async unlock() {
    if (!this.ctx || this.isUnlocked) return;

    try {
      if (this.ctx.state !== "running") {
        await this.ctx.resume();
      }

      // Play a silent tick to fully unlock audio on iOS
      const src = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      src.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.value = 0; // silent
      src.connect(gain);
      gain.connect(this.masterGain);
      src.start(0);

      this.isUnlocked = true;
    } catch (err) {
      console.warn("Audio unlock failed (needs user gesture).", err);
    }
  },

  /**
   * Play a sound by key. Same API as before — just call soundManager.play("click").
   *
   * Optional options object:
   *   volume:       0..1 (default 1.0)
   *   playbackRate: e.g. 1.0 normal, 1.5 faster (default 1.0)
   */
  play(soundKey, opts = {}) {
    if (this.muted) return;
    if (!this.ctx || !this.masterGain) return;

    const buffer = this.buffers[soundKey];
    if (!buffer) return;

    // Try to resume if context got suspended
    if (this.ctx.state !== "running") {
      this.ctx.resume().catch(() => {});
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value =
      typeof opts.playbackRate === "number" ? opts.playbackRate : this.defaultPlaybackRate;

    const gain = this.ctx.createGain();
    gain.gain.value = typeof opts.volume === "number" ? opts.volume : 1.0;

    src.connect(gain);
    gain.connect(this.masterGain);

    try {
      src.start(0);
    } catch (err) {
      console.warn(`Failed to play sound: ${soundKey}`, err);
    }

    // Track active source so stop() works
    this.activeSources[soundKey] = { src, gain };

    // Cleanup on end
    src.onended = () => {
      try {
        src.disconnect();
        gain.disconnect();
      } catch (_) {}
      if (this.activeSources[soundKey]?.src === src) {
        delete this.activeSources[soundKey];
      }
    };
  },

  /**
   * Stop a specific sound — matches your original API.
   */
  stop(soundKey) {
    const active = this.activeSources[soundKey];
    if (!active) return;
    try {
      active.src.stop();
      active.src.disconnect();
      active.gain.disconnect();
    } catch (_) {}
    delete this.activeSources[soundKey];
  },

  /**
   * Stop all currently playing sounds.
   */
  stopAll() {
    for (const key of Object.keys(this.activeSources)) {
      this.stop(key);
    }
  },

  setMuted(value) {
    this.muted = Boolean(value);
  },

  setMasterVolume(value) {
    if (!this.masterGain) return;
    const v = Math.max(0, Math.min(1, Number(value)));
    this.masterGain.gain.value = Number.isFinite(v) ? v : 1.0;
  }
};

export default soundManager;