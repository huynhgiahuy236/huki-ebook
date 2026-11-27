export type FlashSaleTargetFormat = 'PHYSICAL' | 'DIGITAL' | 'BOTH';

export function normalizeFlashSaleTargetFormat(
  raw?: string | null,
): FlashSaleTargetFormat | undefined {
  if (!raw) return undefined;
  const upper = String(raw).trim().toUpperCase();
  if (upper === 'PHYSICAL' || upper === 'PAPER') return 'PHYSICAL';
  if (upper === 'DIGITAL' || upper === 'EBOOK') return 'DIGITAL';
  if (upper === 'BOTH' || upper === 'HYBRID' || upper === 'COMBO') return 'BOTH';
  return undefined;
}

export function getDefaultFlashSaleTargetFormat(book: any): FlashSaleTargetFormat {
  const fmt = String(book?.format || 'PHYSICAL').toUpperCase();
  if (fmt === 'DIGITAL') return 'DIGITAL';
  if (fmt === 'BOTH') return 'BOTH';
  return 'PHYSICAL';
}

export function resolveBookOriginalPriceByFormat(
  book: any,
  targetFormat?: string | null,
): number {
  const bookFmt = String(book?.format || 'PHYSICAL').toUpperCase();
  const comboPrice = Number(book?.priceCombo ?? book?.price ?? 0);
  const resolved = normalizeFlashSaleTargetFormat(targetFormat) || getDefaultFlashSaleTargetFormat(book);

  if (resolved === 'PHYSICAL') {
    const paper = Number(book?.pricePaper ?? book?.physicalPrice ?? 0);
    if (paper > 0) return paper;
    if (bookFmt === 'BOTH' && comboPrice > 0) return Math.round(comboPrice * 0.75);
    return comboPrice;
  }

  if (resolved === 'DIGITAL') {
    const ebook = Number(book?.priceEbook ?? book?.ebookPrice ?? 0);
    if (ebook > 0) return ebook;
    if (bookFmt === 'BOTH' && comboPrice > 0) return Math.round(comboPrice * 0.45);
    return comboPrice;
  }

  return comboPrice;
}

export function formatTargetFormatLabel(targetFormat?: string | null): string {
  const fmt = normalizeFlashSaleTargetFormat(targetFormat);
  if (fmt === 'DIGITAL') return 'Ebook DRM';
  if (fmt === 'BOTH') return 'Combo (Giấy + Ebook)';
  return 'Sách Giấy';
}

export function mapPurchaseKeyToTargetFormat(
  purchaseKey?: string | null,
): FlashSaleTargetFormat {
  const key = String(purchaseKey || '').trim().toLowerCase();
  if (key === 'ebook' || key === 'digital') return 'DIGITAL';
  if (key === 'hybrid' || key === 'combo' || key === 'both') return 'BOTH';
  return 'PHYSICAL';
}

export function doesFlashSaleMatchPurchaseFormat(
  flashSaleInfo: any,
  purchaseKey?: string | null,
  bookFormat?: string | null,
): boolean {
  if (!flashSaleInfo || !flashSaleInfo.salePrice) return false;
  const flashTarget =
    normalizeFlashSaleTargetFormat(flashSaleInfo.targetFormat || flashSaleInfo.format) ||
    normalizeFlashSaleTargetFormat(bookFormat) ||
    'PHYSICAL';
  const purchaseTarget = mapPurchaseKeyToTargetFormat(purchaseKey);
  return flashTarget === purchaseTarget;
}
