import { useSettingsStore } from '../stores/settingsStore';

export default function AudioControls() {
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const sfxEnabled = useSettingsStore((s) => s.sfxEnabled);
  const toggleMusic = useSettingsStore((s) => s.toggleMusic);
  const toggleSfx = useSettingsStore((s) => s.toggleSfx);

  return (
    <div className="fixed top-2 right-2 z-50 flex gap-1.5">
      <button
        onClick={toggleMusic}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
          musicEnabled
            ? 'bg-white/10 text-white/70 hover:bg-white/20'
            : 'bg-white/5 text-white/20 hover:bg-white/10'
        }`}
        title={musicEnabled ? 'Musik aus' : 'Musik an'}
      >
        {musicEnabled ? '🎵' : '🔇'}
      </button>
      <button
        onClick={toggleSfx}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
          sfxEnabled
            ? 'bg-white/10 text-white/70 hover:bg-white/20'
            : 'bg-white/5 text-white/20 hover:bg-white/10'
        }`}
        title={sfxEnabled ? 'Effekte aus' : 'Effekte an'}
      >
        {sfxEnabled ? '🔊' : '🔈'}
      </button>
    </div>
  );
}
