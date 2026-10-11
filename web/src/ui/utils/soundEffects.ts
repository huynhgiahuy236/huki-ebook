// Web Audio API Sound Generator for Realtime Notifications
// Zero-dependency, zero-network, works 100% offline and cross-browser!

class SoundEffectsManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('huki_notifications_muted');
      this.isMuted = saved === 'true';
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('huki_notifications_muted', String(muted));
      window.dispatchEvent(new CustomEvent('huki_mute_toggled', { detail: muted }));
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Phát tiếng chuông ding/chime êm ái, thanh tao (Dual-tone Bell)
   */
  public playChime(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Tone 1: E6 (1318.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.5, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Tone 2: G#6 (1661.2 Hz) - trễ 0.07s
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1661.2, now + 0.07);
      gain2.gain.setValueAtTime(0.22, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.6);
    } catch {
      // AudioContext autoplay restriction fallback
    }
  }

  /**
   * Tiếng chuông nổ đơn hàng (Triple chord "ting-ting-ting" sang trọng)
   */
  public playOrderChime(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.09;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch {
      // ignore
    }
  }
}

export const soundEffects = new SoundEffectsManager();
