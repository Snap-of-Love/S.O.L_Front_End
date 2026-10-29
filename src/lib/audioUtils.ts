/**
 * Web Audio API synthesizer utilities for S.O.L (Snap of Love) photobooth feedback.
 * Synthesizes countdown ticks, mechanical shutter clicks, completion chimes, and boot sequences
 * without requiring external audio asset downloads.
 */

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let audioCtx: AudioContext | null = null;

/**
 * Returns or lazily initializes the shared browser `AudioContext`.
 *
 * @returns {AudioContext} Active or resumed AudioContext instance
 */
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextCtor =
      window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }
    audioCtx = new AudioContextCtor();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a short retro beep/tick for countdown timers (`800Hz` -> `400Hz` sine sweep).
 *
 * @returns {void}
 */
export function playTick(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

/**
 * Plays a realistic camera shutter click (white noise mechanical burst + metallic spring click).
 *
 * @returns {void}
 */
export function playShutter(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 1. White noise burst for the mechanical shutter slice
    const duration = 0.15;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 2.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 2. High-pitch oscillator click
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);

    oscGain.gain.setValueAtTime(0.12, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);

    noise.stop(now + duration);
    osc.stop(now + 0.06);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

/**
 * Plays a crystal clean retro harmonic chime (`C5` + `E5`) for export completion.
 *
 * @returns {void}
 */
export function playDing(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Harmonic chime note (C5 & E5)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

/**
 * Plays a retro booting/loading sound sequence (capacitor charge hum + warm synth sweep).
 *
 * @returns {void}
 */
export function playBootSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 1. Low power-up hum (110Hz triangle oscillator)
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();

    humOsc.type = 'triangle';
    humOsc.frequency.setValueAtTime(110, now);
    humOsc.frequency.linearRampToValueAtTime(220, now + 3.0);

    // Pass hum through lowpass filter to sound muffled and warm
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 3.0);

    humGain.gain.setValueAtTime(0.001, now);
    humGain.gain.linearRampToValueAtTime(0.08, now + 1.2);
    humGain.gain.setValueAtTime(0.08, now + 3.0);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 3.4);

    humOsc.connect(filter);
    filter.connect(humGain);
    humGain.connect(ctx.destination);

    // 2. High frequency capacitor charging sweep (vintage flash charge)
    const chargeOsc = ctx.createOscillator();
    const chargeGain = ctx.createGain();

    chargeOsc.type = 'sine';
    chargeOsc.frequency.setValueAtTime(400, now + 0.5);
    chargeOsc.frequency.exponentialRampToValueAtTime(4000, now + 3.0);

    chargeGain.gain.setValueAtTime(0.001, now + 0.5);
    chargeGain.gain.exponentialRampToValueAtTime(0.015, now + 2.0);
    chargeGain.gain.setValueAtTime(0.015, now + 3.0);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

    chargeOsc.connect(chargeGain);
    chargeGain.connect(ctx.destination);

    // 3. Final shutter click and developed chime when overlay slides up
    const finalDelay = 3.3;

    setTimeout(() => {
      playShutter();

      // Developed chime chord (Cmajor7 C4 E4 G4 B4)
      const chimeGain = ctx.createGain();
      chimeGain.gain.setValueAtTime(0.001, ctx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      chimeGain.connect(ctx.destination);

      [261.63, 329.63, 392.0, 493.88].forEach((freq) => {
        const chimeOsc = ctx.createOscillator();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.value = freq;
        chimeOsc.connect(chimeGain);
        chimeOsc.start();
        chimeOsc.stop(ctx.currentTime + 1.5);
      });
    }, finalDelay * 1000);

    humOsc.start(now);
    humOsc.stop(now + 3.5);

    chargeOsc.start(now + 0.5);
    chargeOsc.stop(now + 3.3);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}
