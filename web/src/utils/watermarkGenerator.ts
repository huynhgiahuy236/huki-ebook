/**
 * HUKI EBOOK - Forensic Watermark Generator (Task 55 / POL-04 DRM-002)
 * Generates dynamic, per-page forensic watermark signatures with clear user identification.
 */

export interface WatermarkPayload {
  userId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  orderId?: string;
  bookId?: string;
  bookTitle?: string;
  pageNum?: number;
  timestamp?: string;
}

/**
 * Format readable user identifier for forensic DRM watermark
 * Clearly displays the authenticated user's name and contact
 */
export function formatUserIdentifier(payload: WatermarkPayload): string {
  const name = payload.fullName?.trim();
  const email = payload.email?.trim();
  const phone = payload.phone?.trim();
  const uid = payload.userId ? `UID: ${payload.userId.substring(0, 8)}` : '';

  if (name && email) {
    return `${name} • ${email}`;
  }
  if (name && phone) {
    return `${name} • ${phone}`;
  }
  if (name) {
    return name;
  }
  if (email) {
    return email;
  }
  return uid ? `Độc giả ${uid}` : 'Độc giả HUKI • reader@huki.vn';
}

/**
 * Partially mask email address if requested for fallback
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
 * Mask user identifier for compact display
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
 * Shows clear user information without aggressive masking
 */
export function generateWatermarkText(payload: WatermarkPayload): string {
  const userInfo = formatUserIdentifier(payload);
  const pageStr = payload.pageNum ? ` • Trang ${payload.pageNum}` : '';
  const ts = payload.timestamp || formatUtcTimestamp();

  return `HUKI DRM • ${userInfo}${pageStr} • ${ts}`;
}

export interface WatermarkGridItem {
  id: string;
  text: string;
  topPercent: number;
  leftPercent: number;
  angle: number;
}

/**
 * Generate a distributed diagonal grid of watermark items across a page.
 * Distributes 3 subtle, crisp, non-intrusive diagonal lines (24%, 50%, 76%) for complete forensic DRM protection.
 */
export function generateWatermarkGrid(
  payload: WatermarkPayload,
  rows: number = 3,
  cols: number = 1
): WatermarkGridItem[] {
  const items: WatermarkGridItem[] = [];
  const baseText = generateWatermarkText(payload);

  // If 3 rows and 1 col (default recommended), place cleanly across the page
  if (rows <= 3 && cols <= 1) {
    items.push({
      id: `wm_${payload.pageNum || 1}_top`,
      text: baseText,
      topPercent: 24,
      leftPercent: 50,
      angle: -22
    });
    items.push({
      id: `wm_${payload.pageNum || 1}_mid`,
      text: baseText,
      topPercent: 50,
      leftPercent: 50,
      angle: -22
    });
    items.push({
      id: `wm_${payload.pageNum || 1}_bottom`,
      text: baseText,
      topPercent: 76,
      leftPercent: 50,
      angle: -22
    });
    return items;
  }

  const rowStep = 100 / (rows + 1);
  const colStep = 100 / (cols + 1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top = Math.max(10, Math.min(90, (r + 1) * rowStep));
      const left = Math.max(10, Math.min(90, (c + 1) * colStep));

      items.push({
        id: `wm_${payload.pageNum || 1}_${r}_${c}`,
        text: baseText,
        topPercent: top,
        leftPercent: left,
        angle: -22
      });
    }
  }

  return items;
}
