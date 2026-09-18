/**
 * HUKI EBOOK - Forensic Watermark Generator (Task 55 / POL-04 DRM-002)
 * Generates dynamic, per-page forensic watermark signatures with data minimization.
 */

export interface WatermarkPayload {
  userId?: string;
  email?: string;
  phone?: string;
  orderId?: string;
  bookId?: string;
  bookTitle?: string;
  pageNum?: number;
  timestamp?: string;
}

/**
 * Partially mask email address for privacy and forensic identification
 * Example: "reader.user@gmail.com" -> "r***r@gmail.com"
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'reader@huki.vn';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Mask user identifier
 * Example: "usr_94b8e21a" -> "UID: 94b8...e21a"
 */
export function maskUserId(userId?: string): string {
  if (!userId) return 'UID: HUKI_GUEST';
  const clean = userId.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length > 8) {
    return `UID: ${clean.substring(0, 4)}...${clean.substring(clean.length - 4)}`;
  }
  return `UID: ${clean}`;
}

/**
 * Format UTC timestamp string for forensic tracing
 */
export function formatUtcTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = pad(date.getUTCDate());
  const m = pad(date.getUTCMonth() + 1);
  const y = date.getUTCFullYear();
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  return `${y}-${m}-${d} ${h}:${min} UTC`;
}

/**
 * Generate full watermark forensic label according to POL-04 DRM-002
 */
export function generateWatermarkText(payload: WatermarkPayload): string {
  const identifier = payload.email
    ? maskEmail(payload.email)
    : payload.userId
    ? maskUserId(payload.userId)
    : 'HUKI READER';

  const ts = payload.timestamp || formatUtcTimestamp();
  const pageStr = payload.pageNum ? ` • P.${payload.pageNum}` : '';

  return `HUKI • ${identifier}${pageStr} • ${ts}`;
}

export interface WatermarkGridItem {
  id: string;
  text: string;
  topPercent: number;
  leftPercent: number;
  angle: number;
}

/**
 * Generate a distributed diagonal grid of watermark items across a page
 */
export function generateWatermarkGrid(
  payload: WatermarkPayload,
  rows: number = 4,
  cols: number = 3
): WatermarkGridItem[] {
  const items: WatermarkGridItem[] = [];
  const baseText = generateWatermarkText(payload);
  const seed = (payload.pageNum || 1) * 7;

  const rowStep = 100 / (rows + 1);
  const colStep = 100 / (cols + 1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Add slight deterministic per-page offset to resist batch-subtraction algorithms
      const offsetTop = ((seed + r * 13 + c * 7) % 8) - 4;
      const offsetLeft = ((seed + r * 11 + c * 17) % 8) - 4;

      const top = Math.max(5, Math.min(95, (r + 1) * rowStep + offsetTop));
      const left = Math.max(5, Math.min(95, (c + 1) * colStep + offsetLeft));

      items.push({
        id: `wm_${payload.pageNum || 1}_${r}_${c}`,
        text: baseText,
        topPercent: top,
        leftPercent: left,
        angle: -30
      });
    }
  }

  return items;
}
