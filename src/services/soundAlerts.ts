// ─── Quantitative Intelligence High Volatility Spike Sound & Voice Alert Engine ────────

let sharedAudioCtx: AudioContext | null = null;
let activeHtml5Audio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let countdownIntervalId: any = null;
let sirenTimeoutId: any = null;
let sequenceTimerId: any = null;
let is30SecDemoActive: boolean = false;

let activeMasterGain: GainNode | null = null;
let activeOscSaw: OscillatorNode | null = null;
let activeOscSquare: OscillatorNode | null = null;
let activeOscSub: OscillatorNode | null = null;
let activeLfo: OscillatorNode | null = null;

let sirenPulseIntervalId: any = null;

export const getOrCreateAudioContext = (): AudioContext | null => {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    console.warn('AudioContext error:', e);
    return null;
  }
};

/**
 * Cleanly stops all active alarms, siren oscillators, intervals, and speech synthesis.
 */
export const stopVolatilityAlertSound = (stopVoice: boolean = true) => {
  is30SecDemoActive = false;

  if (sirenPulseIntervalId) {
    clearInterval(sirenPulseIntervalId);
    sirenPulseIntervalId = null;
  }
  if (sequenceTimerId) {
    clearInterval(sequenceTimerId);
    clearTimeout(sequenceTimerId);
    sequenceTimerId = null;
  }
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  if (sirenTimeoutId) {
    clearTimeout(sirenTimeoutId);
    sirenTimeoutId = null;
  }

  // Stop Web Audio Master Gain
  if (activeMasterGain && sharedAudioCtx) {
    try {
      activeMasterGain.gain.cancelScheduledValues(sharedAudioCtx.currentTime);
      activeMasterGain.gain.setValueAtTime(0, sharedAudioCtx.currentTime);
    } catch (e) {}
    activeMasterGain = null;
  }

  // Stop HTML5 Audio
  if (activeHtml5Audio) {
    try {
      activeHtml5Audio.pause();
      activeHtml5Audio.currentTime = 0;
    } catch (e) {}
    activeHtml5Audio = null;
  }

  // Stop Speech Synthesis
  if (stopVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    } catch (e) {}
  }
};

export interface DemoSequenceCallbacks {
  onPhaseChange?: (phase: 'voice' | 'siren' | 'idle', label?: string) => void;
  onTick?: (secondsLeft: number) => void;
  onEnd?: () => void;
}

/**
 * Helper to generate an active piercing ambulance tone burst (WEE-WOO)
 */
const triggerAmbulancePulse = (ctx: AudioContext, master: GainNode, isHighTone: boolean, vol: number) => {
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const freq = isHighTone ? 960 : 740;

    // Primary Penetrating Sawtooth Horn
    const oscSaw = ctx.createOscillator();
    oscSaw.type = 'sawtooth';
    oscSaw.frequency.setValueAtTime(freq, now);

    // Harmonic Square Wave
    const oscSq = ctx.createOscillator();
    oscSq.type = 'square';
    oscSq.frequency.setValueAtTime(freq * 1.5, now);

    // Deep Sub undertone
    const oscSub = ctx.createOscillator();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(freq * 0.5, now);

    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(0.001, now);
    burstGain.gain.linearRampToValueAtTime(vol * 0.9, now + 0.03);
    burstGain.gain.setValueAtTime(vol * 0.9, now + 0.32);
    burstGain.gain.linearRampToValueAtTime(0.001, now + 0.37);

    oscSaw.connect(burstGain);
    oscSq.connect(burstGain);
    oscSub.connect(burstGain);
    burstGain.connect(master);

    oscSaw.start(now);
    oscSq.start(now);
    oscSub.start(now);

    oscSaw.stop(now + 0.38);
    oscSq.stop(now + 0.38);
    oscSub.stop(now + 0.38);
  } catch (err) {
    console.warn('Ambulance pulse error:', err);
  }
};

/**
 * 🚨 LOUD CONTINUOUS 30-SECOND AMBULANCE EMERGENCY SIREN ENGINE
 * Repeats actively every 380ms (Wee-Woo-Wee-Woo) continuously for the entire 30 seconds without stopping.
 */
export const play30SecondAmbulanceSiren = (
  volume: number = 1.0,
  onTick?: (secondsLeft: number) => void,
  onEnd?: () => void,
  stopVoiceOnStart: boolean = true
) => {
  stopVolatilityAlertSound(stopVoiceOnStart);
  is30SecDemoActive = true;

  const safeVol = Math.min(Math.max(volume, 0.05), 1.0);

  // 1. Primary Engine: Active Web Audio Real-Time Pulsing Generator (Repeats Wee-Woo every 380ms)
  const ctx = getOrCreateAudioContext();
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const master = ctx.createGain();
      master.gain.setValueAtTime(safeVol, ctx.currentTime);
      master.connect(ctx.destination);
      activeMasterGain = master;

      let isHigh = true;
      // Fire first pulse immediately
      triggerAmbulancePulse(ctx, master, isHigh, safeVol);

      // Continuously fire alternating Wee-Woo pulses every 380ms for 30s
      sirenPulseIntervalId = setInterval(() => {
        if (!is30SecDemoActive) {
          clearInterval(sirenPulseIntervalId);
          return;
        }
        isHigh = !isHigh;
        triggerAmbulancePulse(ctx, master, isHigh, safeVol);
      }, 380);
    } catch (err) {
      console.warn('Web Audio siren generator notice:', err);
    }
  }

  // 2. Secondary Engine: Background HTML5 Audio looping track
  try {
    const audio = new Audio('/sounds/ambulance_siren_30s.wav');
    audio.volume = safeVol * 0.6;
    audio.loop = true;
    audio.play().catch(() => {});
    activeHtml5Audio = audio;
  } catch (err) {}

  // 3. Exact 30-Second Continuous Countdown Timer
  let secondsLeft = 30;
  if (onTick) onTick(secondsLeft);

  countdownIntervalId = setInterval(() => {
    secondsLeft -= 1;
    if (onTick) onTick(Math.max(secondsLeft, 0));
    if (secondsLeft <= 0) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
  }, 1000);

  sirenTimeoutId = setTimeout(() => {
    stopVolatilityAlertSound(true);
    if (onEnd) onEnd();
  }, 30000);
};

/**
 * 🚨 COMPLETE 30-SECOND LIVE DEMO SEQUENCE:
 * - Starts LOUD Continuous Ambulance Siren IMMEDIATELY in user click event (0ms delay, 100% browser autoplay authorized).
 * - Broadcasts clear voice warning "High Volatility Spike Alert! High Volatility Spike Alert!" (2 times).
 * - Siren plays CONTINUOUSLY for the full 30 seconds without interruption.
 */
export const start30SecondAmbulanceDemoSequence = (
  volume: number = 1.0,
  voiceEnabled: boolean = true,
  soundEnabled: boolean = true,
  callbacks?: DemoSequenceCallbacks
) => {
  stopVolatilityAlertSound(true);
  is30SecDemoActive = true;

  const safeVol = Math.min(Math.max(volume, 0.05), 1.0);

  if (callbacks?.onPhaseChange) {
    callbacks.onPhaseChange('siren', '🚨 LOUD AMBULANCE EMERGENCY SIREN ACTIVE (30s)');
  }

  // 1. START 30-SECOND AMBULANCE SIREN IMMEDIATELY (In user click frame for 100% autoplay clearance)
  if (soundEnabled) {
    play30SecondAmbulanceSiren(
      safeVol,
      (secLeft) => {
        if (callbacks?.onTick) callbacks.onTick(secLeft);
      },
      () => {
        if (callbacks?.onPhaseChange) callbacks.onPhaseChange('idle');
        if (callbacks?.onEnd) callbacks.onEnd();
      },
      false // Do not cancel voice
    );
  } else {
    let secLeft = 30;
    if (callbacks?.onTick) callbacks.onTick(secLeft);
    countdownIntervalId = setInterval(() => {
      secLeft -= 1;
      if (callbacks?.onTick) callbacks.onTick(Math.max(secLeft, 0));
      if (secLeft <= 0) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
      }
    }, 1000);

    sirenTimeoutId = setTimeout(() => {
      stopVolatilityAlertSound(true);
      if (callbacks?.onPhaseChange) callbacks.onPhaseChange('idle');
      if (callbacks?.onEnd) callbacks.onEnd();
    }, 30000);
  }

  // 2. BROADCAST VOICE WARNING (Repeated continuously every 7 seconds throughout 30s)
  if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const speakAlert = () => {
      if (!is30SecDemoActive) return;
      try {
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('David') ||
              v.name.includes('Zira') ||
              v.name.includes('Jenny') ||
              v.name.includes('English'))
        );

        const utterance = new SpeechSynthesisUtterance('High Volatility Spike Alert! High Volatility Spike Alert!');
        activeUtterance = utterance;
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.volume = safeVol;
        if (englishVoice) utterance.voice = englishVoice;

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis notice:', e);
      }
    };

    // First announcement immediately
    speakAlert();

    // Repeat voice alert every 7 seconds during the 30-second siren
    const voiceInterval = setInterval(() => {
      if (!is30SecDemoActive) {
        clearInterval(voiceInterval);
        return;
      }
      speakAlert();
    }, 7000);

    // Store interval to clear on stop
    sequenceTimerId = voiceInterval;
  }
};

/**
 * 🚨 WINDOWS EMERGENCY ALERT - CONTINUOUS SIREN UNTIL DISMISSED
 * Starts ambulance siren that plays continuously without stopping until the user closes the Windows Alert modal.
 */
export const startWindowsEmergencyAlertUntilClosed = (
  volume: number = 1.0,
  voiceEnabled: boolean = true,
  soundEnabled: boolean = true,
  callbacks?: DemoSequenceCallbacks
) => {
  stopVolatilityAlertSound(true);
  is30SecDemoActive = true;

  const safeVol = Math.min(Math.max(volume, 0.05), 1.0);

  if (callbacks?.onPhaseChange) {
    callbacks.onPhaseChange('siren', '🚨 WINDOWS EMERGENCY ALERT ACTIVE (Continuous Siren)');
  }

  // 1. Continuous Siren Pulse Generator (Endless until closed)
  if (soundEnabled) {
    const ctx = getOrCreateAudioContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const master = ctx.createGain();
        master.gain.setValueAtTime(safeVol, ctx.currentTime);
        master.connect(ctx.destination);
        activeMasterGain = master;

        let isHigh = true;
        triggerAmbulancePulse(ctx, master, isHigh, safeVol);

        sirenPulseIntervalId = setInterval(() => {
          if (!is30SecDemoActive) {
            clearInterval(sirenPulseIntervalId);
            return;
          }
          isHigh = !isHigh;
          triggerAmbulancePulse(ctx, master, isHigh, safeVol);
        }, 380);
      } catch (err) {
        console.warn('Continuous siren pulse generator error:', err);
      }
    }

    // Looping WAV backup
    try {
      const audio = new Audio('/sounds/ambulance_siren_30s.wav');
      audio.volume = safeVol * 0.6;
      audio.loop = true;
      audio.play().catch(() => {});
      activeHtml5Audio = audio;
    } catch (err) {}
  }

  // Count elapsed seconds continuously
  let elapsed = 0;
  if (callbacks?.onTick) callbacks.onTick(elapsed);

  countdownIntervalId = setInterval(() => {
    elapsed += 1;
    if (callbacks?.onTick) callbacks.onTick(elapsed);
  }, 1000);

  // 2. Broadcast Voice Alert
  if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const speakAlert = () => {
      if (!is30SecDemoActive) return;
      try {
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('David') ||
              v.name.includes('Zira') ||
              v.name.includes('Jenny') ||
              v.name.includes('English'))
        );

        const utterance = new SpeechSynthesisUtterance('Critical Volatility Spike Alert! Windows Emergency Alert Activated.');
        activeUtterance = utterance;
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.volume = safeVol;
        if (englishVoice) utterance.voice = englishVoice;

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis notice:', e);
      }
    };

    speakAlert();

    const voiceInterval = setInterval(() => {
      if (!is30SecDemoActive) {
        clearInterval(voiceInterval);
        return;
      }
      speakAlert();
    }, 7000);

    sequenceTimerId = voiceInterval;
  }
};

/** Short tactical warning pings (HIGH / CRITICAL) */
export const playVolatilityAlarmSound = (
  severity: 'HIGH' | 'CRITICAL',
  volume: number = 1.0,
  onEnd?: () => void
) => {
  // Never interrupt active 30s judge demo
  if (is30SecDemoActive) {
    if (onEnd) onEnd();
    return;
  }

  stopVolatilityAlertSound();
  if (volume <= 0) {
    if (onEnd) onEnd();
    return;
  }

  const safeVol = Math.min(Math.max(volume, 0.05), 1.0);
  const soundPath = severity === 'CRITICAL' ? '/sounds/alert_critical.wav' : '/sounds/alert_high.wav';

  try {
    const audio = new Audio(soundPath);
    audio.volume = safeVol;
    audio.play().catch(() => {});
    activeHtml5Audio = audio;
    setTimeout(() => { if (onEnd) onEnd(); }, severity === 'CRITICAL' ? 2100 : 1000);
  } catch (err) {
    if (onEnd) onEnd();
  }
};

/** Real-time voice alert for individual asset spikes */
export const playVolatilityVoiceAlert = (
  severity: 'HIGH' | 'CRITICAL' | 'DEMO_30S',
  assetName: string = 'Multi-Asset Portfolio',
  volume: number = 1.0
) => {
  if (is30SecDemoActive) return; // Do not interrupt active 30s demo

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (volume <= 0) return;

  const safeVol = Math.min(Math.max(volume, 0.05), 1.0);

  try {
    window.speechSynthesis.cancel();

    let message = '';
    if (severity === 'DEMO_30S') {
      message = 'High Volatility Spike Alert! High Volatility Spike Alert!';
    } else if (severity === 'CRITICAL') {
      message = `High Volatility Spike Alert! Critical warning. Extreme market volatility detected for ${assetName}. Please review your position immediately.`;
    } else {
      message = `High Volatility Spike Alert! Warning. High market volatility detected for ${assetName}. Please review current market conditions.`;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    activeUtterance = utterance;
    utterance.rate = 1.0; // Normal natural speaking rate
    utterance.pitch = 1.05;
    utterance.volume = safeVol;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('David') ||
          v.name.includes('Zira') ||
          v.name.includes('Jenny'))
    );
    if (englishVoice) utterance.voice = englishVoice;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis alert warning:', err);
  }
};
