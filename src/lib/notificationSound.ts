/**
 * A short, pleasant two-tone notification chime played with the Web Audio API.
 *
 * Synthesised (no audio asset to ship / cache) so it works offline and in the
 * PWA. Autoplay policies require a prior user gesture to produce sound; by the
 * time a notification arrives the user has almost always interacted with the
 * app, so the shared AudioContext resumes cleanly. Everything is wrapped in
 * try/catch — if audio is unavailable the badge still updates silently.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function playNotificationChime(): void {
  try {
    const audio = getContext();
    if (!audio) return;
    if (audio.state === "suspended") void audio.resume().catch(() => {});

    const now = audio.currentTime;
    // A5 → D6: a gentle rising two-tone, like a calendar alert.
    const notes = [880, 1174.66];
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.14;
      const end = start + 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
  } catch {
    /* audio unavailable — stay silent, the badge still updates */
  }
}
