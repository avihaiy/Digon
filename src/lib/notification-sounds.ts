// Notification sound presets using Web Audio API
export type SoundPreset = 'chime' | 'bell' | 'gentle' | 'urgent' | 'mute';

export const SOUND_PRESETS: { value: SoundPreset; label: string }[] = [
  { value: 'chime', label: 'צלצול (ברירת מחדל)' },
  { value: 'bell', label: 'פעמון' },
  { value: 'gentle', label: 'עדין' },
  { value: 'urgent', label: 'דחוף' },
  { value: 'mute', label: 'השתקה' },
];

const STORAGE_KEY = 'notification_sound_preset';

export function getSelectedSound(): SoundPreset {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SOUND_PRESETS.some(p => p.value === stored)) {
      return stored as SoundPreset;
    }
  } catch {}
  return 'chime';
}

export function setSelectedSound(preset: SoundPreset) {
  try {
    localStorage.setItem(STORAGE_KEY, preset);
  } catch {}
}

export function playNotificationSound(preset?: SoundPreset) {
  const sound = preset || getSelectedSound();
  if (sound === 'mute') return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (freq: number, startTime: number, duration: number, volume = 0.3, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const t = ctx.currentTime;

    switch (sound) {
      case 'chime':
        playTone(880, t, 0.15);
        playTone(1174, t + 0.15, 0.25);
        playTone(1318, t + 0.35, 0.3);
        break;

      case 'bell':
        playTone(659, t, 0.4, 0.25, 'triangle');
        playTone(880, t + 0.1, 0.5, 0.2, 'triangle');
        playTone(1047, t + 0.25, 0.6, 0.15, 'triangle');
        break;

      case 'gentle':
        playTone(523, t, 0.5, 0.15, 'sine');
        playTone(659, t + 0.3, 0.5, 0.12, 'sine');
        break;

      case 'urgent':
        playTone(1047, t, 0.12, 0.35, 'square');
        playTone(1319, t + 0.12, 0.12, 0.3, 'square');
        playTone(1047, t + 0.24, 0.12, 0.35, 'square');
        playTone(1319, t + 0.36, 0.12, 0.3, 'square');
        playTone(1568, t + 0.48, 0.2, 0.25, 'square');
        break;
    }
  } catch {
    // Audio not supported
  }
}
