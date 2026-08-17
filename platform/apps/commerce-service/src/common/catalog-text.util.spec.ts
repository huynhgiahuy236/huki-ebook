import { normalizeCatalogText, toCatalogSlug } from './catalog-text.util';

describe('catalog text utilities', () => {
  it('normalizes Vietnamese text for search', () => {
    expect(normalizeCatalogText('  Nhà Xuất Bản Trẻ  ')).toBe('nha xuat ban tre');
  });

  it('creates a stable URL slug', () => {
    expect(toCatalogSlug('Nguyễn Nhật Ánh')).toBe('nguyen-nhat-anh');
  });
});
