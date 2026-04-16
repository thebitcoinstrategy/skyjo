import { Howl } from 'howler';
import { useSettingsStore } from '../stores/settingsStore';

export type SoundEffect =
  | 'card-flip'
  | 'card-place'
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
    // Card flip - quick high pitch blip
    this.sfxSounds.set('card-flip', this.createToneHowl(800, 0.08, 'sine', 0.3));
    // Card place - low thud
    this.sfxSounds.set('card-place', this.createToneHowl(200, 0.12, 'sine', 0.4));
    // Card deal - rapid tick
    this.sfxSounds.set('card-deal', this.createToneHowl(600, 0.05, 'sine', 0.2));
    // Card shuffle - noise-like
    this.sfxSounds.set('card-shuffle', this.createToneHowl(300, 0.2, 'sawtooth', 0.15));
    // Draw
    this.sfxSounds.set('draw', this.createToneHowl(500, 0.1, 'sine', 0.3));
    // Turn notify - pleasant chime
    this.sfxSounds.set('turn-notify', this.createToneHowl(1200, 0.15, 'sine', 0.25));
    // Good play - ascending tone
    this.sfxSounds.set('good-play', this.createToneHowl(880, 0.2, 'sine', 0.3));
    // Bad play - descending tone
    this.sfxSounds.set('bad-play', this.createToneHowl(220, 0.25, 'sawtooth', 0.2));
    // Column eliminate - whoosh
    this.sfxSounds.set('column-eliminate', this.createToneHowl(440, 0.4, 'triangle', 0.35));
    // Win fanfare
    this.sfxSounds.set('win-fanfare', this.createToneHowl(1046, 0.5, 'sine', 0.4));
    // Lose
    this.sfxSounds.set('lose-sound', this.createToneHowl(165, 0.4, 'sawtooth', 0.2));
    // Button click
    this.sfxSounds.set('button-click', this.createToneHowl(700, 0.05, 'sine', 0.2));
    // Error
    this.sfxSounds.set('error', this.createToneHowl(200, 0.15, 'square', 0.15));
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

    // Generate a simple looping ambient tone for now
    // Replace with a real music file in production
    if (!this.music) {
      const sampleRate = 44100;
      const duration = 4; // 4 second loop
      const numSamples = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

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

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Gentle ambient chord: C4 + E4 + G4 at very low volume
        const sample =
          Math.sin(2 * Math.PI * 261.63 * t) * 0.05 +
          Math.sin(2 * Math.PI * 329.63 * t) * 0.03 +
          Math.sin(2 * Math.PI * 392.0 * t) * 0.04;
        const value = Math.floor(sample * 32767);
        view.setInt16(44 + i * 2, value, true);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      this.music = new Howl({
        src: [url],
        format: ['wav'],
        loop: true,
        volume: settings.musicVolume * 0.3,
      });
    }

    this.music.play();
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
