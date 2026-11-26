/**
 * Taskora Audio Utility
 * Synthesizes a pleasant completion chime using the standard Web Audio API.
 * Requires zero external audio files, works completely offline.
 */

export function playCompletionChime() {
    try {
        if (typeof window === 'undefined') return;
        const enabled = localStorage.getItem('taskora_sound_effects');
        if (enabled !== 'true') return;

        playChimeAudio();
    } catch {
        // Silently catch audio policy blocks or unsupported browsers
    }
}

export function previewChime() {
    try {
        if (typeof window === 'undefined') return;
        playChimeAudio();
    } catch {
        // Silently catch
    }
}

function playChimeAudio() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const now = ctx.currentTime;

    // Primary bell tone: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Harmonic fifth chime: B5 (987.77 Hz), starts slightly staggered (+70ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.07);
    gain2.gain.setValueAtTime(0.14, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.55);
}
