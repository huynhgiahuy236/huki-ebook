/**
 * Danh sách Ngân hàng Việt Nam
 * Dùng cho Seller Registration - chọn ngân hàng đối soát
 */

export interface VietnamBank {
  code: string;        // Mã ngân hàng (VietQR)
  name: string;        // Tên đầy đủ
  shortName: string;   // Tên viết tắt
  logo?: string;       // Logo URL (optional)
}

export const VIETNAM_BANKS: VietnamBank[] = [
  // Ngân hàng thương mại nhà nước
  { code: 'ICB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank' },
  { code: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank' },
  { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', shortName: 'BIDV' },
  { code: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam', shortName: 'VietinBank' },
  { code: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', shortName: 'Agribank' },

  // Ngân hàng TMCP lớn
  { code: 'TCB', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', shortName: 'Techcombank' },
  { code: 'CTG', name: 'Ngân hàng TMCP Công Thương Việt Nam', shortName: 'VietinBank' },
  { code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank' },
  { code: 'ACB', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB' },
  { code: 'MB', name: 'Ngân hàng TMCP Quân đội', shortName: 'MB Bank' },
  { code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank' },
  { code: 'HDB', name: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh', shortName: 'HDBank' },
  { code: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', shortName: 'MSB' },
  { code: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', shortName: 'SHB' },
  { code: 'OJB', name: 'Ngân hàng TMCP Đại Dương', shortName: 'OceanBank' },
  { code: 'NCB', name: 'Ngân hàng TMCP Quốc Dân', shortName: 'NCB' },
  { code: 'PGB', name: 'Ngân hàng TMCP Xăng dầu Petrolimex', shortName: 'PGBank' },
  { code: 'VAB', name: 'Ngân hàng TMCP Việt Á', shortName: 'VietABank' },
  { code: 'EIB', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam', shortName: 'Eximbank' },
  { code: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', shortName: 'VIB' },
  { code: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', shortName: 'SCB' },
  { code: 'KLB', name: 'Ngân hàng TMCP Bảo Việt', shortName: 'BaoVietBank' },
  { code: 'ABB', name: 'Ngân hàng TMCP An Bình', shortName: 'ABB' },
  { code: 'BAB', name: 'Ngân hàng TMCP Bắc Á', shortName: 'BacABank' },
  { code: 'SGB', name: 'Ngân hàng TMCP Sài Gòn Công Thương', shortName: 'Saigonbank' },
  { code: 'KBank', name: 'Ngân hàng KBank (Việt Nam)', shortName: 'KBank' },
  { code: 'UOB', name: 'Ngân hàng UOB (Việt Nam)', shortName: 'UOB' },
  { code: 'StandardChartered', name: 'Ngân hàng Standard Chartered Việt Nam', shortName: 'Standard Chartered' },

  // Ngân hàng 100% vốn nước ngoài
  { code: 'HSBC', name: 'Ngân hàng HSBC Việt Nam', shortName: 'HSBC' },
  { code: 'Citibank', name: 'Ngân hàng Citibank Việt Nam', shortName: 'CitiBank' },
  { code: 'DBS', name: 'Ngân hàng DBS Việt Nam', shortName: 'DBS' },
  { code: 'PublicBank', name: 'Ngân hàng Public Bank Việt Nam', shortName: 'Public Bank' },

  // Ngân hàng số / Fintech
  { code: 'VPBankNeo', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng - VPBank NEO', shortName: 'VPBank NEO' },
  { code: 'Shinhan', name: 'Ngân hàng Shinhan Việt Nam', shortName: 'Shinhan Bank' },
  { code: 'Kookmin', name: 'Ngân hàng Kookmin Việt Nam', shortName: 'KBank' },
  { code: 'WOORI', name: 'Ngân hàng Woori Việt Nam', shortName: 'Woori Bank' },

  // Ngân hàng liên doanh
  { code: 'VietCapital', name: 'Ngân hàng TMCP Bản Việt - VietCapital Bank', shortName: 'VietCapital Bank' },
  { code: 'LienVietPostBank', name: 'Ngân hàng TMCP Bưu điện Liên Việt', shortName: 'LienVietPostBank' },
  { code: 'BacABank', name: 'Ngân hàng TMCP Bắc Á', shortName: 'Bac A Bank' },
];

/**
 * Lấy danh sách ngân hàng, loại bỏ trùng lặp theo shortName
 */
export function getUniqueBanks(): VietnamBank[] {
  const seen = new Set<string>();
  return VIETNAM_BANKS.filter((bank) => {
    const key = bank.shortName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Tìm ngân hàng theo mã
 */
export function getBankByCode(code: string): VietnamBank | undefined {
  return VIETNAM_BANKS.find((b) => b.code.toLowerCase() === code.toLowerCase());
}

/**
 * Tìm ngân hàng theo tên
 */
export function findBankByName(name: string): VietnamBank | undefined {
  const q = name.toLowerCase();
  return VIETNAM_BANKS.find(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.shortName.toLowerCase().includes(q) ||
      b.code.toLowerCase() === q
  );
}
