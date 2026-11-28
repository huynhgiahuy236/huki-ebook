export interface BookPricingInput {
  format: 'PHYSICAL' | 'DIGITAL' | 'BOTH' | string;
  price?: number | string;
  physicalPrice?: number | string;
  ebookPrice?: number | string;
  comboPrice?: number | string;
}

/**
 * Validate 3-tier pricing rules for Physical, Digital (Ebook), and Hybrid Combo books.
 * Returns a field-keyed error map (empty object when valid).
 */
export function validateBookPricing(input: BookPricingInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const fmt = input.format;

  if (fmt === 'PHYSICAL') {
    const phys = Number(input.physicalPrice || input.price) || 0;
    if (phys <= 0) {
      errors.physicalPrice = 'Vui lòng nhập giá sách in lớn hơn 0 ₫.';
    }
    return errors;
  }

  if (fmt === 'DIGITAL') {
    const eb = Number(input.ebookPrice || input.price) || 0;
    if (eb <= 0) {
      errors.ebookPrice = 'Vui lòng nhập giá Ebook DRM lớn hơn 0 ₫.';
    }
    return errors;
  }

  if (fmt === 'BOTH') {
    const phys = Number(input.physicalPrice) || 0;
    const eb = Number(input.ebookPrice) || 0;
    const combo = Number(input.comboPrice) || 0;

    if (phys <= 0) {
      errors.physicalPrice = 'Vui lòng nhập giá sách in riêng lẻ lớn hơn 0 ₫.';
    }
    if (eb <= 0) {
      errors.ebookPrice = 'Vui lòng nhập giá Ebook DRM riêng lẻ lớn hơn 0 ₫.';
    } else if (phys > 0 && eb > phys) {
      errors.ebookPrice = `Giá Ebook DRM (${eb.toLocaleString('vi-VN')} ₫) không được cao hơn giá Sách giấy (${phys.toLocaleString('vi-VN')} ₫).`;
    }

    if (combo <= 0) {
      errors.comboPrice = 'Vui lòng nhập giá bán Combo Hybrid lớn hơn 0 ₫.';
    } else if (phys > 0 && eb > 0) {
      const minCombo = Math.max(phys, eb);
      const maxCombo = phys + eb;
      if (combo < minCombo) {
        errors.comboPrice = `Giá Combo Hybrid (${combo.toLocaleString('vi-VN')} ₫) không được thấp hơn giá mua lẻ một ấn phẩm (${minCombo.toLocaleString('vi-VN')} ₫).`;
      } else if (combo > maxCombo) {
        errors.comboPrice = `Giá Combo Hybrid (${combo.toLocaleString('vi-VN')} ₫) không được vượt quá tổng giá sách giấy và ebook (${maxCombo.toLocaleString('vi-VN')} ₫).`;
      }
    }
  }

  return errors;
}
