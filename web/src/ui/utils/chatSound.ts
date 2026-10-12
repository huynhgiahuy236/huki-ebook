/**
 * HUKI EBOOK - Realtime Chat Audio Synthesizer
 * Uses Web Audio API to produce clean, zero-dependency notification sounds
 */

export function playChatPopSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Quick dual-frequency gentle pop tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.07); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Autoplay policy or unsupported audio context
  }
}

export function playChatChimeSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two melodic bell notes (G5 -> C6)
    const playNote = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    playNote(783.99, 0, 0.25); // G5
    playNote(1046.5, 0.1, 0.4); // C6
  } catch {
    // Ignore autoplay restrictions
  }
}

export function playMessageSentSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.05); // E5

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore
  }
}

/**
 * 1. BUYER SOUND: Tiếng chuông nhẹ nhàng, trong trẻo khi cập nhật trạng thái đơn hàng hoặc hoàn tiền
 */
export function playBuyerNotificationSound() {
  playChatChimeSound();
}

/**
 * 2. SELLER SOUND: Tiếng ting-ting rộn ràng "tiền về" / "đơn hàng mới" quầy thu ngân
 */
export function playSellerOrderChimeSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playNote = (freq: number, startOffset: number, duration: number, volume: number = 0.15) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(volume, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // Bright E major arpeggio: E5 -> G#5 -> B5 -> E6 (Cash register style)
    playNote(659.25, 0.00, 0.15, 0.14); // E5
    playNote(830.61, 0.08, 0.18, 0.15); // G#5
    playNote(987.77, 0.16, 0.22, 0.16); // B5
    playNote(1318.51, 0.24, 0.35, 0.18); // E6
  } catch {
    // Ignore
  }
}

/**
 * 3. SHIPPER SOUND: Còi bưu tá nhận cuốc giao hoặc đơn thu hồi khẩn cấp
 */
export function playShipperDispatchSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playBeep = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // Dual horn alert (A5 -> D6)
    playBeep(880, 0.00, 0.10); // A5
    playBeep(1174.66, 0.12, 0.18); // D6
  } catch {
    // Ignore
  }
}

/**
 * 4. ADMIN SOUND: Chuông trầm 3 âm uy quyền, trang trọng đối soát ký quỹ / trọng tài tranh chấp
 */
export function playAdminAlertSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // Resonant authority chime: C4 -> G4 -> C5
    playTone(261.63, 0.00, 0.35); // C4
    playTone(392.00, 0.12, 0.40); // G4
    playTone(523.25, 0.24, 0.50); // C5
  } catch {
    // Ignore
  }
}

/**
 * 5. SUB-ADMIN / CSKH STAFF SOUND: Âm gõ xác nhận tác vụ soát xét khiếu nại
 */
export function playSubAdminStaffSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playClick = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // Subtle two-step prompt: D5 -> A5
    playClick(587.33, 0.00, 0.12);
    playClick(880.00, 0.09, 0.22);
  } catch {
    // Ignore
  }
}
