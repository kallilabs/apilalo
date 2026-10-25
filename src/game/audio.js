// Small synthesized sound effects. No audio files, so nothing to license or download.

const PENTATONIC = [0, 2, 4, 7, 9];
const note = semitones => 523.25 * Math.pow(2, semitones / 12);

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    });
  }

  /** Browsers only allow audio after a user gesture: call this from input handlers. */
  unlock() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch { /* audio is optional */ }
  }

  tone(freq, duration, type, volume, endFreq, delay = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.03);
    } catch { /* audio is optional */ }
  }

  /** Each perfect in a streak plays the next note up the scale. */
  perfect(combo) {
    const i = Math.min(combo - 1, 14);
    this.tone(note(PENTATONIC[i % 5] + 12 * Math.floor(i / 5)), 0.28, 'triangle', 0.2);
  }

  cut() { this.tone(260, 0.09, 'sine', 0.16, 150); }
  fail() { this.tone(330, 0.55, 'sawtooth', 0.07, 70); }
  fanfare() { [0, 4, 7, 12].forEach((s, i) => this.tone(note(s), 0.3, 'triangle', 0.14, null, i * 0.07)); }
}
