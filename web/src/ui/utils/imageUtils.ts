/**
 * Image URL sanitization & client-side canvas compression helpers.
 * Prevents saving transient `blob:` URLs to the database and avoids broken images
 * when external or malformed URLs fail to load.
 */

// Known external Goodreads/Amazon URLs returning HTTP 403 upstream (avoid console 403 spam)
const BLOCKED_EXTERNAL_COVER_IDS = [
  'compressed.photo.goodreads.com/books/1398863674i/1362193.jpg',
  'compressed.photo.goodreads.com/books/1327914902i/10706212.jpg',
  'compressed.photo.goodreads.com/books/1700180941i/23692271.jpg',
  'compressed.photo.goodreads.com/books/1360697241i/17351659.jpg',
  'compressed.photo.goodreads.com/books/1608620242i/56379564.jpg',
];

export function sanitizeImageUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return undefined;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('blob:')) return undefined;
  if (BLOCKED_EXTERNAL_COVER_IDS.some((sig) => lower.includes(sig))) return undefined;
  return trimmed;
}

export async function compressImageToDataUrl(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
