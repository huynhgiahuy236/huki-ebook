/**
 * HUKI EBOOK - Anti-Tamper & DevTools Detection Utilities (Task 54)
 * Focuses on client-side deterrence, DevTools detection, and shortcut prevention.
 */

export interface AntiTamperOptions {
  onDevToolsOpen?: () => void;
  onDevToolsClose?: () => void;
  checkIntervalMs?: number;
  threshold?: number;
}

export class AntiTamperService {
  private isDevToolsOpen = false;
  private intervalId: NodeJS.Timeout | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onOpenCallbacks: Set<() => void> = new Set();
  private onCloseCallbacks: Set<() => void> = new Set();
  private threshold: number;

  constructor(options: AntiTamperOptions = {}) {
    this.threshold = options.threshold || 160;
    if (options.onDevToolsOpen) this.onOpenCallbacks.add(options.onDevToolsOpen);
    if (options.onDevToolsClose) this.onCloseCallbacks.add(options.onDevToolsClose);
  }

  /**
   * Check if DevTools is currently open using viewport delta and timing checks
   */
  public checkDevTools(): boolean {
    if (typeof window === 'undefined') return false;

    const widthDiff = window.outerWidth - window.innerWidth > this.threshold;
    const heightDiff = window.outerHeight - window.innerHeight > this.threshold;

    let detected = widthDiff || heightDiff;

    // Check with console timing method (non-destructive)
    if (!detected) {
      const start = performance.now();
      // debugger timing measurement (disabled in standard tests/builds)
      const diff = performance.now() - start;
      if (diff > 100) {
        detected = true;
      }
    }

    if (detected !== this.isDevToolsOpen) {
      this.isDevToolsOpen = detected;
      if (detected) {
        this.notifyOpen();
      } else {
        this.notifyClose();
      }
    }

    return this.isDevToolsOpen;
  }

  public onDevToolsOpen(cb: () => void): () => void {
    this.onOpenCallbacks.add(cb);
    return () => this.onOpenCallbacks.delete(cb);
  }

  public onDevToolsClose(cb: () => void): () => void {
    this.onCloseCallbacks.add(cb);
    return () => this.onCloseCallbacks.delete(cb);
  }

  private notifyOpen() {
    this.onOpenCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('AntiTamper onOpen callback error:', e);
      }
    });
  }

  private notifyClose() {
    this.onCloseCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('AntiTamper onClose callback error:', e);
      }
    });
  }

  /**
   * Setup global keyboard shortcut and right-click interceptors
   */
  public setupEventListeners(): () => void {
    if (typeof window === 'undefined') return () => {};

    // 1. Intercept keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        this.notifyOpen();
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta) {
        const key = e.key.toLowerCase();

        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
        if (e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
          e.preventDefault();
          e.stopPropagation();
          this.notifyOpen();
          return;
        }

        // Ctrl+U (View Source), Ctrl+S (Save Page), Ctrl+P (Print)
        if (key === 'u' || key === 's' || key === 'p') {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    };

    // 2. Intercept context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 3. Intercept print events
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('beforeprint', handleBeforePrint, { capture: true });

    // 4. Polling check
    this.intervalId = setInterval(() => {
      this.checkDevTools();
    }, 1000);

    // 5. ResizeObserver check
    try {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.checkDevTools();
        });
        this.resizeObserver.observe(document.body);
      }
    } catch {
      // ignore
    }

    // Return cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('beforeprint', handleBeforePrint, { capture: true });

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    };
  }
}

export const defaultAntiTamper = new AntiTamperService();
