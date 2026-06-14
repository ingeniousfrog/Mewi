const MUTE_STORAGE_KEY = "mewi.muteSounds";

let audioContext: AudioContext | null = null;
let muted = loadMuted();

function loadMuted(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
}

function storeMuted(value: boolean): void {
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, value ? "1" : "0");
  } catch (error) {
    console.error("Unable to store Mewi mute setting", error);
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    audioContext = new AudioContextCtor();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  storeMuted(value);
}

export function playPurr(): void {
  if (muted) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  gain.connect(context.destination);

  for (let index = 0; index < 3; index += 1) {
    const start = now + index * 0.18;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, start);
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(58 + index * 4, start);
    oscillator.frequency.exponentialRampToValueAtTime(44 + index * 3, start + 0.16);
    oscillator.connect(filter);
    filter.connect(gain);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  }
}

export function playHappyMeow(): void {
  if (muted) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  gain.connect(context.destination);

  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(760, now);
  filter.Q.setValueAtTime(4, now);
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(520, now);
  oscillator.frequency.exponentialRampToValueAtTime(920, now + 0.12);
  oscillator.frequency.exponentialRampToValueAtTime(680, now + 0.34);
  oscillator.connect(filter);
  filter.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + 0.4);
}

export function playTypeTap(): void {
  if (muted) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  gain.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(880 + Math.random() * 220, now);
  oscillator.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + 0.07);
}

export function playDrumBeat(): void {
  if (muted) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  gain.connect(context.destination);

  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(240, now);
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(120, now);
  oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.12);
  oscillator.connect(filter);
  filter.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + 0.14);
}

export function playFishSplash(): void {
  if (muted) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  gain.connect(context.destination);

  const noise = context.createOscillator();
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(420, now);
  filter.Q.setValueAtTime(0.8, now);
  noise.type = "triangle";
  noise.frequency.setValueAtTime(180, now);
  noise.frequency.exponentialRampToValueAtTime(90, now + 0.2);
  noise.connect(filter);
  filter.connect(gain);
  noise.start(now);
  noise.stop(now + 0.22);
}

export function playFishCatch(): void {
  if (muted) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  gain.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(520, now);
  oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.12);
  oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.36);
  oscillator.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + 0.42);
}
