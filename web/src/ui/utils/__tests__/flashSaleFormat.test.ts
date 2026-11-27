import { describe, it, expect } from 'vitest';
import {
  doesFlashSaleMatchPurchaseFormat,
  formatTargetFormatLabel,
  getDefaultFlashSaleTargetFormat,
  resolveBookOriginalPriceByFormat,
} from '../flashSaleFormat';

describe('flashSaleFormat helpers (BUG-29, BUG-30)', () => {
  const hybridBook = {
    id: 'book-hybrid',
    format: 'BOTH',
    price: 68000,
    pricePaper: 51000,
    priceEbook: 30600,
  };

  it('resolves original price by selected targetFormat for Hybrid books', () => {
    expect(getDefaultFlashSaleTargetFormat(hybridBook)).toBe('BOTH');
    expect(resolveBookOriginalPriceByFormat(hybridBook, 'BOTH')).toBe(68000);
    expect(resolveBookOriginalPriceByFormat(hybridBook, 'PHYSICAL')).toBe(51000);
    expect(resolveBookOriginalPriceByFormat(hybridBook, 'DIGITAL')).toBe(30600);
  });

  it('matches Flash Sale ONLY for the registered targetFormat', () => {
    const physicalFlashSale = {
      salePrice: 35000,
      targetFormat: 'PHYSICAL',
      discountPercent: 31,
    };

    expect(doesFlashSaleMatchPurchaseFormat(physicalFlashSale, 'physical', 'BOTH')).toBe(true);
    expect(doesFlashSaleMatchPurchaseFormat(physicalFlashSale, 'ebook', 'BOTH')).toBe(false);
    expect(doesFlashSaleMatchPurchaseFormat(physicalFlashSale, 'hybrid', 'BOTH')).toBe(false);

    const ebookFlashSale = {
      salePrice: 20000,
      targetFormat: 'DIGITAL',
      discountPercent: 35,
    };
    expect(doesFlashSaleMatchPurchaseFormat(ebookFlashSale, 'ebook', 'BOTH')).toBe(true);
    expect(doesFlashSaleMatchPurchaseFormat(ebookFlashSale, 'physical', 'BOTH')).toBe(false);
    expect(doesFlashSaleMatchPurchaseFormat(ebookFlashSale, 'hybrid', 'BOTH')).toBe(false);
  });

  it('formats Vietnamese labels cleanly', () => {
    expect(formatTargetFormatLabel('PHYSICAL')).toBe('Sách Giấy');
    expect(formatTargetFormatLabel('DIGITAL')).toBe('Ebook DRM');
    expect(formatTargetFormatLabel('BOTH')).toBe('Combo (Giấy + Ebook)');
  });
});
