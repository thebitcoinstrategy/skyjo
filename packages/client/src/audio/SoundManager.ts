import { Howl } from 'howler';
import { useSettingsStore } from '../stores/settingsStore';

export type SoundEffect =
  | 'card-flip'
  | 'card-place'
  | 'card-drag'
  | 'card-deal'
  | 'card-shuffle'
  | 'draw'
  | 'turn-notify'
  | 'good-play'
  | 'bad-play'
  | 'column-eliminate'
  | 'win-fanfare'
  | 'lose-sound'
  | 'button-click'
  | 'error';

/**
 * Sound Manager using Howler.js
 * Handles SFX and background music with separate volume controls.
 *
 * For now, uses Web Audio API to generate procedural sounds.
 * In production, replace with real audio sprite files.
 */
class SoundManagerClass {
  private sfxSounds: Map<SoundEffect, Howl> = new Map();
  private music: Howl | null = null;
  private initialized = false;
  private audioContext: AudioContext | null = null;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Create procedural sounds using Web Audio API oscillators via Howler
    // These are placeholder sine/square wave sounds that actually work
    // Replace with real .webm/.mp3 files for production quality
    this.createProceduralSounds();
  }

  private createProceduralSounds() {
    // Card flip - swooshy card sound (bandpass-swept noise)
    this.sfxSounds.set('card-flip', this.createSwooshHowl(0.18, 800, 3000, 0.35));
    // Card place - soft thud with paper landing
    this.sfxSounds.set('card-place', this.createPlaceHowl());
    // Card drag - subtle slide sound
    this.sfxSounds.set('card-drag', this.createSwooshHowl(0.12, 600, 2000, 0.2));
    // Card deal - rapid tick
    this.sfxSounds.set('card-deal', this.createSwooshHowl(0.08, 1000, 4000, 0.15));
    // Card shuffle - longer swoosh
    this.sfxSounds.set('card-shuffle', this.createSwooshHowl(0.3, 500, 2500, 0.2));
    // Draw - pick-up swoosh
    this.sfxSounds.set('draw', this.createSwooshHowl(0.15, 900, 3500, 0.25));
    // Turn notify - pleasant two-tone chime
    this.sfxSounds.set('turn-notify', this.createChimeHowl([880, 1320], 0.2, 0.25));
    // Good play - ascending arpeggio
    this.sfxSounds.set('good-play', this.createChimeHowl([523, 659, 784, 1046], 0.4, 0.3));
    // Bad play - descending tone
    this.sfxSounds.set('bad-play', this.createToneHowl(220, 0.25, 'sawtooth', 0.2));
    // Column eliminate - dramatic whoosh + sparkle
    this.sfxSounds.set('column-eliminate', this.createEliminateHowl());
    // Win fanfare - triumphant arpeggio
    this.sfxSounds.set('win-fanfare', this.createChimeHowl([523, 659, 784, 1046, 1318], 0.6, 0.4));
    // Lose
    this.sfxSounds.set('lose-sound', this.createToneHowl(165, 0.4, 'sawtooth', 0.2));
    // Button click - soft tap
    this.sfxSounds.set('button-click', this.createSwooshHowl(0.04, 2000, 5000, 0.12));
    // Error
    this.sfxSounds.set('error', this.createToneHowl(200, 0.15, 'square', 0.15));
  }

  private writeWavHeader(view: DataView, numSamples: number, sampleRate: number) {
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
  }

  private makeBlobHowl(view: DataView): Howl {
    const blob = new Blob([view.buffer as ArrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    return new Howl({ src: [url], format: ['wav'], preload: true, volume: 1 });
  }

  /**
   * Creates a swoosh/whoosh sound using bandpass-swept noise.
   * freqLow→freqHigh sweep gives the characteristic "card cutting through air" feel.
   */
  private createSwooshHowl(duration: number, freqLow: number, freqHigh: number, volume: number): Howl {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    this.writeWavHeader(view, numSamples, sampleRate);

    // Multi-pass filtered noise for smoother sound
    const raw = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) raw[i] = Math.random() * 2 - 1;

    // Simple two-pole bandpass filter simulation via running averages
    const out = new Float32Array(numSamples);
    let prev1 = 0, prev2 = 0;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const normalizedT = t / duration;

      // Frequency sweep: low → high → low (arc shape) gives "swoosh" character
      const sweepT = Math.sin(normalizedT * Math.PI);
      const centerFreq = freqLow + (freqHigh - freqLow) * sweepT;

      // Filter coefficient from center frequency
      const rc = 1 / (2 * Math.PI * centerFreq);
      const dt = 1 / sampleRate;
      const alpha = dt / (rc + dt);

      // Two-pass low-pass creates bandpass-like effect
      prev1 = prev1 + alpha * (raw[i] - prev1);
      prev2 = prev2 + alpha * (prev1 - prev2);

      // Envelope: smooth attack and decay (no sharp transients = no popping)
      const attackTime = duration * 0.15;
      const decayStart = duration * 0.4;
      let env: number;
      if (t < attackTime) {
        env = (t / attackTime) * (t / attackTime); // Quadratic attack (soft onset)
      } else if (t > decayStart) {
        env = Math.pow(1 - (t - decayStart) / (duration - decayStart), 2);
      } else {
        env = 1;
      }

      out[i] = prev2 * env * volume;
    }

    for (let i = 0; i < numSamples; i++) {
      const value = Math.max(-32768, Math.min(32767, Math.floor(out[i] * 32767)));
      view.setInt16(44 + i * 2, value, true);
    }

    return this.makeBlobHowl(view);
  }

  /**
   * Card landing on table — soft thump with paper rustling.
   */
  private createPlaceHowl(): Howl {
    const sampleRate = 44100;
    const duration = 0.15;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    this.writeWavHeader(view, numSamples, sampleRate);

    let prev = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const normalizedT = t / duration;

      // Soft thump: low-frequency sine burst
      const thump = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 30) * 0.3;

      // Paper rustle: filtered noise with quick decay
      const noise = Math.random() * 2 - 1;
      const alpha = 0.15; // Heavy low-pass
      prev = prev * (1 - alpha) + noise * alpha;
      const rustleEnv = Math.exp(-normalizedT * 6) * 0.15;

      const sample = thump + prev * rustleEnv;
      const value = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, value, true);
    }

    return this.makeBlobHowl(view);
  }

  /**
   * Ascending chime arpeggio for pleasant notifications.
   */
  private createChimeHowl(freqs: number[], duration: number, volume: number): Howl {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    this.writeWavHeader(view, numSamples, sampleRate);

    const noteSpacing = duration / (freqs.length + 1);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      for (let n = 0; n < freqs.length; n++) {
        const noteStart = n * noteSpacing;
        const nt = t - noteStart;
        if (nt >= 0) {
          const env = Math.exp(-nt * 6) * volume;
          // Sine with a touch of harmonic for shimmer
          sample += Math.sin(2 * Math.PI * freqs[n] * t) * env * 0.6;
          sample += Math.sin(2 * Math.PI * freqs[n] * 2 * t) * env * 0.15;
          sample += Math.sin(2 * Math.PI * freqs[n] * 3 * t) * env * 0.05;
        }
      }

      const value = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, value, true);
    }

    return this.makeBlobHowl(view);
  }

  /**
   * Column elimination: swoosh + sparkle shimmer.
   */
  private createEliminateHowl(): Howl {
    const sampleRate = 44100;
    const duration = 0.5;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    this.writeWavHeader(view, numSamples, sampleRate);

    let prev = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const normalizedT = t / duration;

      // Rising shimmer tone
      const shimmerFreq = 600 + normalizedT * 1200;
      const shimmer = Math.sin(2 * Math.PI * shimmerFreq * t) * Math.exp(-normalizedT * 3) * 0.15;

      // Whoosh noise
      const noise = Math.random() * 2 - 1;
      const alpha = 0.08 + normalizedT * 0.15;
      prev = prev * (1 - alpha) + noise * alpha;
      const whooshEnv = Math.sin(normalizedT * Math.PI) * 0.2;

      // Sparkle: high-frequency pings
      const sparkle = Math.sin(2 * Math.PI * (2000 + normalizedT * 2000) * t) *
        Math.exp(-((normalizedT - 0.3) * (normalizedT - 0.3)) * 20) * 0.1;

      const sample = shimmer + prev * whooshEnv + sparkle;
      const value = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, value, true);
    }

    return this.makeBlobHowl(view);
  }

  private createToneHowl(
    freq: number,
    duration: number,
    type: OscillatorType,
    maxVolume: number
  ): Howl {
    // Generate a PCM WAV buffer for each sound procedurally
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate samples
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / duration) * maxVolume;
      let sample: number;

      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * freq * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * (freq * t - Math.floor(freq * t + 0.5));
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (freq * t - Math.floor(freq * t + 0.5))) - 1;
          break;
        default:
          sample = Math.sin(2 * Math.PI * freq * t);
      }

      const value = Math.max(-32768, Math.min(32767, Math.floor(sample * envelope * 32767)));
      view.setInt16(44 + i * 2, value, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    return new Howl({
      src: [url],
      format: ['wav'],
      preload: true,
      volume: 1, // Volume is controlled externally
    });
  }

  play(sound: SoundEffect) {
    const settings = useSettingsStore.getState();
    if (!settings.sfxEnabled) return;

    this.init();

    const howl = this.sfxSounds.get(sound);
    if (howl) {
      howl.volume(settings.sfxVolume);
      howl.play();
    }
  }

  startMusic() {
    const settings = useSettingsStore.getState();
    if (!settings.musicEnabled) return;

    if (!this.music) {
      this.music = this.createMusicLoop(settings.musicVolume);
    }

    this.music.play();
  }

  /**
   * Generates a fun lounge/bossa-nova style background loop.
   * 16-bar progression at 110 BPM with bass, chords, and light percussion.
   */
  private createMusicLoop(volume: number): Howl {
    const sampleRate = 44100;
    const bpm = 110;
    const beatsPerBar = 4;
    const bars = 16;
    const totalBeats = bars * beatsPerBar;
    const beatDuration = 60 / bpm;
    const duration = totalBeats * beatDuration;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Chord progression (2 bars each): Cmaj7 → Am7 → Dm7 → G7 → Em7 → Am7 → Dm7 → G7
    const chords = [
      [261.63, 329.63, 392.00, 493.88],  // Cmaj7: C4 E4 G4 B4
      [220.00, 261.63, 329.63, 392.00],  // Am7:   A3 C4 E4 G4
      [293.66, 349.23, 440.00, 523.25],  // Dm7:   D4 F4 A4 C5
      [196.00, 246.94, 293.66, 349.23],  // G7:    G3 B3 D4 F4
      [164.81, 196.00, 246.94, 293.66],  // Em7:   E3 G3 B3 D4
      [220.00, 261.63, 329.63, 392.00],  // Am7
      [293.66, 349.23, 440.00, 523.25],  // Dm7
      [196.00, 246.94, 293.66, 349.23],  // G7
    ];

    // Bass notes (root of each chord, one octave lower)
    const bassNotes = [130.81, 110.00, 146.83, 98.00, 82.41, 110.00, 146.83, 98.00];

    // Pseudo-random for deterministic percussion
    let seed = 42;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const beat = t / beatDuration;
      const bar = Math.floor(beat / beatsPerBar);
      const beatInBar = beat % beatsPerBar;
      const chordIdx = Math.floor(bar / 2) % chords.length;
      const chord = chords[chordIdx];
      const bassFreq = bassNotes[chordIdx];

      let sample = 0;

      // ── Pad chords (warm, low-pass sine with slow attack/release) ──
      const chordBarStart = Math.floor(bar / 2) * 2 * beatsPerBar * beatDuration;
      const chordTime = t - chordBarStart;
      const chordEnv = Math.min(1, chordTime / 0.3) * Math.min(1, Math.max(0, (2 * beatsPerBar * beatDuration - chordTime) / 0.3));
      for (const freq of chord) {
        sample += Math.sin(2 * Math.PI * freq * t) * 0.04 * chordEnv;
      }

      // ── Bass (plucked style on beats 1 and 3) ──
      const bassBeats = [0, 2]; // beat 1 and 3
      for (const bb of bassBeats) {
        const bassStart = (Math.floor(beat / beatsPerBar) * beatsPerBar + bb) * beatDuration;
        const bt = t - bassStart;
        if (bt >= 0 && bt < beatDuration * 1.5) {
          const bassEnv = Math.exp(-bt * 4) * 0.12;
          sample += Math.sin(2 * Math.PI * bassFreq * t) * bassEnv;
          // Add a subtle octave harmonic
          sample += Math.sin(2 * Math.PI * bassFreq * 2 * t) * bassEnv * 0.3;
        }
      }

      // ── Bossa rhythm guitar (offbeat stabs) ──
      const subBeat = (beat * 2) % 2;
      if (subBeat > 0.9 && subBeat < 1.1) {
        // Offbeat strum
        const strumStart = Math.floor(beat + 0.5) * beatDuration - beatDuration * 0.5;
        const st = t - strumStart;
        if (st >= 0 && st < 0.15) {
          const strumEnv = Math.exp(-st * 25) * 0.06;
          for (const freq of chord) {
            sample += Math.sin(2 * Math.PI * freq * 1.5 * t) * strumEnv;
          }
        }
      }

      // ── Light hi-hat (8th notes) ──
      const eighthBeat = beat * 2;
      const eighthPos = eighthBeat % 1;
      if (eighthPos < 0.05) {
        const ht = eighthPos * beatDuration / 2;
        const hihatEnv = Math.exp(-ht * 600) * 0.015;
        sample += (rand() * 2 - 1) * hihatEnv;
      }

      // ── Soft kick on beats 1 and 3 ──
      const kickBeats = [0, 2];
      for (const kb of kickBeats) {
        const kickStart = (Math.floor(beat / beatsPerBar) * beatsPerBar + kb) * beatDuration;
        const kt = t - kickStart;
        if (kt >= 0 && kt < 0.12) {
          const kickEnv = Math.exp(-kt * 40) * 0.08;
          const kickFreq = 60 * Math.exp(-kt * 30);
          sample += Math.sin(2 * Math.PI * kickFreq * kt) * kickEnv;
        }
      }

      // Soft clamp and write
      sample = Math.tanh(sample * 2) * 0.5; // Soft clip
      const value = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, value, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    return new Howl({
      src: [url],
      format: ['wav'],
      loop: true,
      volume: volume * 0.4,
    });
  }

  stopMusic() {
    this.music?.stop();
  }

  updateMusicVolume(volume: number) {
    if (this.music) {
      this.music.volume(volume * 0.3);
    }
  }

  setMusicEnabled(enabled: boolean) {
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }
}

export const soundManager = new SoundManagerClass();
