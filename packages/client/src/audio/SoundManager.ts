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
  private currentTrackIndex = -1;
  private trackHistory: number[] = [];

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

    // Pick a different track each time
    this.pickNextTrack();
    if (this.music) {
      this.music.stop();
      this.music.unload();
    }
    this.music = this.createMusicTrack(this.currentTrackIndex, settings.musicVolume);
    this.music.play();
  }

  private pickNextTrack() {
    const total = 20;
    let next: number;
    do {
      next = Math.floor(Math.random() * total);
    } while (next === this.currentTrackIndex && total > 1);
    this.currentTrackIndex = next;
  }

  /**
   * Generates one of 20 distinct procedural music loops.
   * Uses different waveforms, synthesis techniques, and textures per track.
   */
  private createMusicTrack(trackIndex: number, volume: number): Howl {
    const sampleRate = 44100;
    const tracks = this.getTrackDefinitions();
    const def = tracks[trackIndex % tracks.length];
    const beatDuration = 60 / def.bpm;
    const duration = def.bars * def.beatsPerBar * beatDuration;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    this.writeWavHeader(view, numSamples, sampleRate);

    let seed = trackIndex * 1337 + 42;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    // Waveform generators — each track gets different timbres
    const wave = (freq: number, t: number, type: number): number => {
      const phase = 2 * Math.PI * freq * t;
      switch (type) {
        case 0: return Math.sin(phase); // Pure sine
        case 1: return Math.sin(phase) + Math.sin(phase * 2) * 0.5 + Math.sin(phase * 3) * 0.25; // Rich/organ
        case 2: return Math.sin(phase + Math.sin(phase * 2) * 1.5); // FM bell
        case 3: { const p = (freq * t) % 1; return p < 0.5 ? 1 : -1; } // Square
        case 4: return 2 * ((freq * t) % 1) - 1; // Saw
        case 5: return Math.sin(phase + Math.sin(phase * 3.01) * 0.8); // FM metallic
        case 6: { const p2 = (freq * t) % 1; return 4 * Math.abs(p2 - 0.5) - 1; } // Triangle
        default: return Math.sin(phase);
      }
    };

    const padType = def.padWave ?? 0;
    const bassType = def.bassWave ?? 0;
    const melodyType = def.melodyWave ?? 2;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const beat = t / beatDuration;
      const bar = Math.floor(beat / def.beatsPerBar);
      const chordIdx = Math.floor(bar / def.barsPerChord) % def.chords.length;
      const chord = def.chords[chordIdx];
      const bassFreq = def.bassNotes[chordIdx];
      let sample = 0;

      // ── Pad chords ──
      const chordBarStart = Math.floor(bar / def.barsPerChord) * def.barsPerChord * def.beatsPerBar * beatDuration;
      const chordTime = t - chordBarStart;
      const chordLen = def.barsPerChord * def.beatsPerBar * beatDuration;
      const chordEnv = Math.min(1, chordTime / 0.3) * Math.min(1, Math.max(0, (chordLen - chordTime) / 0.3));
      for (const freq of chord) {
        sample += wave(freq, t, padType) * def.padVol * chordEnv;
        if (def.padDetune) {
          sample += wave(freq * 1.005, t, padType) * def.padVol * chordEnv * 0.4;
          sample += wave(freq * 0.995, t, padType) * def.padVol * chordEnv * 0.4;
        }
      }

      // ── Bass ──
      for (const bb of def.bassBeats) {
        const bassStart = (Math.floor(beat / def.beatsPerBar) * def.beatsPerBar + bb) * beatDuration;
        const bt = t - bassStart;
        if (bt >= 0 && bt < beatDuration * 1.5) {
          const bassEnv = Math.exp(-bt * def.bassDecay) * def.bassVol;
          sample += wave(bassFreq, t, bassType) * bassEnv;
          sample += wave(bassFreq * 2, t, bassType) * bassEnv * 0.2;
        }
      }

      // ── Rhythm stabs ──
      if (def.rhythmPattern) {
        for (const rp of def.rhythmPattern) {
          const rpBeat = (beat % def.beatsPerBar);
          if (Math.abs(rpBeat - rp) < 0.08) {
            const rpStart = (Math.floor(beat / def.beatsPerBar) * def.beatsPerBar + rp) * beatDuration;
            const rt = t - rpStart;
            if (rt >= 0 && rt < 0.15) {
              const strumEnv = Math.exp(-rt * 25) * 0.06;
              for (const freq of chord) {
                sample += wave(freq * 1.5, t, padType) * strumEnv;
              }
            }
          }
        }
      }

      // ── Hi-hat / Percussion ──
      if (def.hihat) {
        const hhDiv = def.hihat;
        const hhBeat = beat * hhDiv;
        const hhPos = hhBeat % 1;
        if (hhPos < 0.05) {
          const ht = hhPos * beatDuration / hhDiv;
          const hihatEnv = Math.exp(-ht * 500) * 0.015;
          sample += (rand() * 2 - 1) * hihatEnv;
        }
      }

      // ── Kick ──
      for (const kb of def.kickBeats) {
        const kickStart = (Math.floor(beat / def.beatsPerBar) * def.beatsPerBar + kb) * beatDuration;
        const kt = t - kickStart;
        if (kt >= 0 && kt < 0.12) {
          const kickEnv = Math.exp(-kt * 40) * 0.08;
          const kickFreq = 55 * Math.exp(-kt * 30);
          sample += Math.sin(2 * Math.PI * kickFreq * kt) * kickEnv;
        }
      }

      // ── Snare on 2 and 4 (if enabled) ──
      if (def.snare) {
        const snareBeats = [1, 3];
        for (const sb of snareBeats) {
          const snStart = (Math.floor(beat / def.beatsPerBar) * def.beatsPerBar + sb) * beatDuration;
          const snt = t - snStart;
          if (snt >= 0 && snt < 0.08) {
            const snEnv = Math.exp(-snt * 60) * 0.04;
            sample += (rand() * 2 - 1) * snEnv;
            sample += Math.sin(2 * Math.PI * 180 * snt) * snEnv * 0.5;
          }
        }
      }

      // ── Melody ──
      if (def.melody) {
        const melodyBeat = Math.floor(beat) % def.melody.length;
        const mFreq = def.melody[melodyBeat];
        if (mFreq > 0) {
          const mStart = Math.floor(beat) * beatDuration;
          const mt = t - mStart;
          const mEnv = Math.exp(-mt * (def.melodyDecay ?? 5)) * 0.05;
          sample += wave(mFreq, t, melodyType) * mEnv;
        }
      }

      // ── Arpeggio (if enabled) — cycles through chord notes ──
      if (def.arp) {
        const arpDiv = def.arp;
        const arpBeat = beat * arpDiv;
        const arpIdx = Math.floor(arpBeat) % chord.length;
        const arpFreq = chord[arpIdx] * 2; // One octave up
        const arpStart = Math.floor(arpBeat) / arpDiv * beatDuration;
        const at = t - arpStart;
        if (at >= 0 && at < beatDuration / arpDiv * 0.8) {
          const arpEnv = Math.exp(-at * 8) * 0.03;
          sample += wave(arpFreq, t, melodyType) * arpEnv;
        }
      }

      sample = Math.tanh(sample * 2) * 0.5;
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

  private getTrackDefinitions() {
    // Helper: note frequency calculator
    const n = (semitones: number) => 440 * Math.pow(2, semitones / 12);
    // Common note frequencies (A4=440)
    const C3=130.81, D3=146.83, E3=164.81, F3=174.61, G3=196.00, A3=220.00, Bb3=233.08, B3=246.94;
    const C4=261.63, D4=293.66, Eb4=311.13, E4=329.63, F4=349.23, Gb4=369.99, G4=392.00, Ab4=415.30, A4=440.00, Bb4=466.16, B4=493.88;
    const C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99, A5=880.00;

    type TrackDef = {
      bpm: number; bars: number; beatsPerBar: number; barsPerChord: number;
      chords: number[][]; bassNotes: number[]; bassBeats: number[]; bassDecay: number; bassVol: number;
      padVol: number; padDetune?: boolean; padWave?: number; bassWave?: number; melodyWave?: number;
      rhythmPattern?: number[]; hihat?: number; kickBeats: number[];
      melody?: number[]; melodyDecay?: number;
      snare?: boolean; arp?: number;
    };

    const tracks: TrackDef[] = [
      // 0: Bossa Nova — warm sine pads, offbeat guitar
      { bpm:110, bars:16, beatsPerBar:4, barsPerChord:2, padWave:0, bassWave:0, melodyWave:0,
        chords:[[C4,E4,G4,B4],[A3,C4,E4,G4],[D4,F4,A4,C5],[G3,B3,D4,F4],[E3,G3,B3,D4],[A3,C4,E4,G4],[D4,F4,A4,C5],[G3,B3,D4,F4]],
        bassNotes:[C3,A3,D3,G3,E3,A3,D3,G3], bassBeats:[0,2], bassDecay:4, bassVol:0.12,
        padVol:0.04, rhythmPattern:[0.5,1.5,2.5,3.5], hihat:2, kickBeats:[0,2] },
      // 1: Jazz Waltz — organ tones, brushes
      { bpm:130, bars:24, beatsPerBar:3, barsPerChord:2, padWave:1, bassWave:0, melodyWave:2,
        chords:[[D4,Gb4,A4],[G3,B3,D4,F4],[C4,E4,G4,B4],[F4,A4,C5],[Bb3,D4,F4],[E3,G3,B3,D4]],
        bassNotes:[D3,G3,C3,F3,Bb3,E3], bassBeats:[0], bassDecay:3, bassVol:0.10,
        padVol:0.035, padDetune:true, rhythmPattern:[1,2], hihat:3, kickBeats:[0] },
      // 2: Cool Lounge — FM bell melody, detuned pad
      { bpm:95, bars:16, beatsPerBar:4, barsPerChord:2, padWave:0, bassWave:0, melodyWave:2,
        chords:[[E4,Ab4,B4],[A3,C4,E4,G4],[D4,F4,A4,C5],[G3,B3,D4]],
        bassNotes:[E3,A3,D3,G3], bassBeats:[0,2.5], bassDecay:5, bassVol:0.11,
        padVol:0.04, padDetune:true, hihat:2, kickBeats:[0,2],
        melody:[E5,0,D5,0,C5,0,B4,0,A4,0,G4,0,A4,0,B4,0], melodyDecay:4 },
      // 3: Upbeat Funk — square bass, snare backbeat, fast arps
      { bpm:120, bars:16, beatsPerBar:4, barsPerChord:2, padWave:3, bassWave:4, melodyWave:3,
        chords:[[E4,G4,B4,D5],[A3,C4,E4,G4],[D4,F4,A4,C5],[G3,Bb3,D4,F4]],
        bassNotes:[E3,A3,D3,G3], bassBeats:[0,0.75,2,2.75], bassDecay:6, bassVol:0.10,
        padVol:0.025, rhythmPattern:[0.5,1,2.5,3], hihat:4, kickBeats:[0,1.5,2,3.5], snare:true },
      // 4: Dreamy Ambient — detuned sine drones, slow melody
      { bpm:72, bars:16, beatsPerBar:4, barsPerChord:4, padWave:0, bassWave:0, melodyWave:0,
        chords:[[C4,E4,G4,B4],[F4,A4,C5,E5],[G4,B4,D5],[A3,C4,E4]],
        bassNotes:[C3,F3,G3,A3], bassBeats:[0], bassDecay:2, bassVol:0.08,
        padVol:0.06, padDetune:true, kickBeats:[0],
        melody:[G5,0,0,0,E5,0,0,0,D5,0,0,0,C5,0,0,0], melodyDecay:2 },
      // 5: Reggae Chill — offbeat organ stabs, triangle bass
      { bpm:85, bars:16, beatsPerBar:4, barsPerChord:2, padWave:1, bassWave:6, melodyWave:0,
        chords:[[C4,Eb4,G4],[F4,Ab4,C5],[G4,Bb4,D5],[C4,Eb4,G4]],
        bassNotes:[C3,F3,G3,C3], bassBeats:[0,2.5], bassDecay:4, bassVol:0.12,
        padVol:0.035, rhythmPattern:[1.5,3.5], hihat:2, kickBeats:[0,2] },
      // 6: Latin Salsa — FM metallic percussion feel, busy bass
      { bpm:105, bars:16, beatsPerBar:4, barsPerChord:2, padWave:0, bassWave:0, melodyWave:5,
        chords:[[A3,C4,E4],[D4,F4,A4],[G3,B3,D4],[C4,E4,G4]],
        bassNotes:[A3,D3,G3,C3], bassBeats:[0,1.5,2,3.5], bassDecay:5, bassVol:0.11,
        padVol:0.03, rhythmPattern:[0.5,1,2.5,3], hihat:4, kickBeats:[0,2],
        arp:4 },
      // 7: Blues Shuffle — saw bass, organ pads, swung feel
      { bpm:100, bars:24, beatsPerBar:4, barsPerChord:2, padWave:1, bassWave:4, melodyWave:1,
        chords:[[C4,Eb4,G4,Bb4],[C4,Eb4,G4,Bb4],[F4,Ab4,C5,Eb4],[F4,Ab4,C5,Eb4],[G4,B4,D5,F4],[F4,Ab4,C5,Eb4],[C4,Eb4,G4,Bb4],[G3,B3,D4,F4],[C4,Eb4,G4,Bb4],[C4,Eb4,G4,Bb4],[F4,Ab4,C5,Eb4],[G4,B4,D5,F4]],
        bassNotes:[C3,C3,F3,F3,G3,F3,C3,G3,C3,C3,F3,G3], bassBeats:[0,2], bassDecay:4, bassVol:0.10,
        padVol:0.03, rhythmPattern:[1.33,2.67], hihat:3, kickBeats:[0,2] },
      // 8: Electronica — square wave pads, 4-on-the-floor, arpeggiator
      { bpm:128, bars:16, beatsPerBar:4, barsPerChord:4, padWave:3, bassWave:4, melodyWave:5,
        chords:[[A3,C4,E4,G4],[F4,A4,C5],[D4,F4,A4,C5],[E3,G3,B3]],
        bassNotes:[A3,F3,D3,E3], bassBeats:[0,1,2,3], bassDecay:8, bassVol:0.08,
        padVol:0.04, padDetune:true, hihat:4, kickBeats:[0,1,2,3], snare:true,
        arp:4 },
      // 9: Tropical Vibes — bell melody, bright pads
      { bpm:108, bars:16, beatsPerBar:4, barsPerChord:2, padWave:0, bassWave:0, melodyWave:2,
        chords:[[C4,E4,G4],[F4,A4,C5],[G4,B4,D5],[A3,C4,E4]],
        bassNotes:[C3,F3,G3,A3], bassBeats:[0,2.5], bassDecay:5, bassVol:0.11,
        padVol:0.04, rhythmPattern:[0.5,1.5,2.5,3.5], hihat:4, kickBeats:[0,1.5,2,3.5],
        melody:[G5,0,E5,0,C5,0,E5,G5,A5,0,G5,0,E5,0,D5,0], melodyDecay:6 },
      // 10: Smooth R&B — rich organ, slow groove
      { bpm:90, bars:16, beatsPerBar:4, barsPerChord:2, padWave:1, bassWave:0, melodyWave:0,
        chords:[[Eb4,G4,Bb4,D5],[Ab4,C5,Eb4],[Bb3,D4,F4,Ab4],[Eb4,G4,Bb4]],
        bassNotes:[n(-18),n(-21),n(-13),n(-18)], bassBeats:[0,2], bassDecay:3, bassVol:0.10,
        padVol:0.04, padDetune:true, rhythmPattern:[1,3], hihat:2, kickBeats:[0,2], snare:true },
      // 11: Country Swing — triangle melody, plucky bass
      { bpm:115, bars:16, beatsPerBar:4, barsPerChord:2, padWave:0, bassWave:6, melodyWave:6,
        chords:[[G3,B3,D4],[C4,E4,G4],[D4,Gb4,A4],[G3,B3,D4]],
        bassNotes:[G3,C3,D3,G3], bassBeats:[0,2], bassDecay:5, bassVol:0.12,
        padVol:0.03, rhythmPattern:[0.5,1.5,2.5,3.5], hihat:2, kickBeats:[0,2],
        melody:[D5,0,B4,0,G4,0,A4,B4,C5,0,D5,0,B4,0,A4,0], melodyDecay:7 },
      // 12: Film Noir — dark FM pads, sparse, moody
      { bpm:78, bars:16, beatsPerBar:4, barsPerChord:4, padWave:5, bassWave:0, melodyWave:2,
        chords:[[C4,Eb4,Gb4,Bb4],[F4,A4,C5,E5],[Bb3,D4,F4,Ab4],[Eb4,G4,Bb4]],
        bassNotes:[C3,F3,Bb3,n(-18)], bassBeats:[0], bassDecay:2, bassVol:0.09,
        padVol:0.04, padDetune:true, kickBeats:[0,2],
        melody:[Gb4,0,0,0,F4,0,Eb4,0,0,0,0,0,D4,0,0,0], melodyDecay:3 },
      // 13: Afrobeat — busy rhythm, saw bass, 4-feel percussion
      { bpm:125, bars:16, beatsPerBar:4, barsPerChord:2, padWave:0, bassWave:4, melodyWave:1,
        chords:[[E4,G4,B4],[A3,C4,E4],[D4,F4,A4],[G3,B3,D4]],
        bassNotes:[E3,A3,D3,G3], bassBeats:[0,0.75,1.5,2,3], bassDecay:6, bassVol:0.10,
        padVol:0.03, rhythmPattern:[0.5,1,1.5,2.5,3,3.5], hihat:4, kickBeats:[0,1.5,2.5], snare:true },
      // 14: Lo-fi Hip-Hop — vinyl crackle feel, lazy beat
      { bpm:82, bars:16, beatsPerBar:4, barsPerChord:4, padWave:0, bassWave:0, melodyWave:2,
        chords:[[A3,C4,E4,G4],[D4,F4,A4,C5],[E4,G4,B4,D5],[A3,C4,E4]],
        bassNotes:[A3,D3,E3,A3], bassBeats:[0,2.5], bassDecay:3, bassVol:0.11,
        padVol:0.05, padDetune:true, hihat:2, kickBeats:[0,1.75,2], snare:true,
        melody:[0,0,E5,0,C5,0,A4,0,0,0,G4,0,A4,0,0,0], melodyDecay:3 },
      // 15: Tango — dramatic, staccato, no hi-hat
      { bpm:66, bars:16, beatsPerBar:4, barsPerChord:2, padWave:4, bassWave:4, melodyWave:6,
        chords:[[A3,C4,E4],[D4,F4,A4],[E4,Ab4,B4],[A3,C4,E4]],
        bassNotes:[A3,D3,E3,A3], bassBeats:[0,2], bassDecay:4, bassVol:0.13,
        padVol:0.03, rhythmPattern:[0,1,2,2.5,3,3.5], hihat:0, kickBeats:[0,2] },
      // 16: Celtic Jig — fast triangle melody, bouncy
      { bpm:145, bars:16, beatsPerBar:4, barsPerChord:2, padWave:0, bassWave:6, melodyWave:6,
        chords:[[D4,F4,A4],[G3,B3,D4],[A3,C4,E4],[D4,F4,A4]],
        bassNotes:[D3,G3,A3,D3], bassBeats:[0,2], bassDecay:5, bassVol:0.11,
        padVol:0.025, hihat:4, kickBeats:[0,2],
        melody:[A5,0,G5,F5,E5,0,D5,0,C5,0,D5,E5,F5,0,G5,0], melodyDecay:8 },
      // 17: Surf Rock — distorted buzz, fast and driving
      { bpm:155, bars:16, beatsPerBar:4, barsPerChord:2, padWave:4, bassWave:4, melodyWave:4,
        chords:[[E4,Ab4,B4],[A3,C4,E4],[B3,D4,Gb4],[E4,Ab4,B4]],
        bassNotes:[E3,A3,B3,E3], bassBeats:[0,1,2,3], bassDecay:7, bassVol:0.09,
        padVol:0.025, rhythmPattern:[0.5,1.5,2.5,3.5], hihat:4, kickBeats:[0,2], snare:true,
        melody:[B4,0,E5,0,Ab4,0,B4,0,A4,0,E4,0,Ab4,0,A4,0], melodyDecay:9 },
      // 18: Big Band Swing — organ + walking bass
      { bpm:138, bars:16, beatsPerBar:4, barsPerChord:2, padWave:1, bassWave:0, melodyWave:1,
        chords:[[C4,E4,G4,Bb4],[F4,A4,C5,Eb4],[G4,B4,D5,F4],[C4,E4,G4,Bb4]],
        bassNotes:[C3,F3,G3,C3], bassBeats:[0,1,2,3], bassDecay:5, bassVol:0.10,
        padVol:0.03, rhythmPattern:[1.33,2.67,3.67], hihat:3, kickBeats:[0,2],
        melody:[G5,0,E5,0,C5,0,Bb4,0,A4,0,G4,0,0,0,B4,0] },
      // 19: Zen Garden — pure sine drones, no percussion, very slow
      { bpm:55, bars:16, beatsPerBar:4, barsPerChord:4, padWave:0, bassWave:0, melodyWave:2,
        chords:[[C4,G4,C5],[F4,C5,F5],[G4,D5,G5],[C4,G4,C5]],
        bassNotes:[C3,F3,G3,C3], bassBeats:[0], bassDecay:1.5, bassVol:0.07,
        padVol:0.06, padDetune:true, hihat:0, kickBeats:[],
        melody:[G5,0,0,0,0,0,E5,0,0,0,0,0,C5,0,0,0], melodyDecay:1.5 },
    ];

    return tracks;
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music.unload();
      this.music = null;
    }
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
