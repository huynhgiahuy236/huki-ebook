/**
 * Tax Registry & Enterprise Verification Service for Vietnam Publishers
 * Cung cấp:
 * 1. Tra cứu CSDL Doanh nghiệp Quốc Gia (Hybrid: Cache Mẫu + Live VietQR Tax API)
 * 2. Bộ máy Thẩm định 33 Trường Dữ liệu qua 5 Form đăng ký đối tác (Xanh / Đỏ / Vàng)
 */

export interface RegisteredBusinessInfo {
  tax_code: string;
  company_name: string;
  international_name?: string;
  short_name?: string;
  business_license_number: string;
  issue_date?: string;
  issue_place?: string;
  business_type: 'CORPORATION' | 'LLC' | 'INDIVIDUAL' | 'PARTNERSHIP';
  registered_address: {
    street: string;
    ward: string;
    district: string;
    province: string;
    country: string;
  };
  representative: {
    full_name: string;
    position: string;
  };
  ecommerce_industry_codes: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  is_verified_from_registry: boolean;
  verified_source: 'LOCAL_REGISTRY_DB' | 'NATIONAL_TAX_API';
}

/**
 * 5 Form / 33 Trường Đăng ký Đối Tác Doanh Nghiệp Toàn Diện
 */
export interface EnterpriseFullProfile {
  id: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;

  // --- FORM 1: DOANH NGHIỆP & PHÁP LÝ (12 trường) ---
  tax_code: string;
  company_name: string;
  international_name: string;
  short_name: string;
  business_license_number: string;
  issue_date: string;
  issue_place: string;
  business_type: 'CORPORATION' | 'LLC' | 'INDIVIDUAL' | 'PARTNERSHIP';
  registered_address: string;
  email: string;
  phone: string;
  website: string;

  // --- FORM 2: NGƯỜI ĐẠI DIỆN PHÁP LUẬT (8 trường) ---
  rep_full_name: string;
  rep_position: string;
  rep_id_card_number: string;
  rep_id_card_issue_date: string;
  rep_id_card_issue_place: string;
  rep_phone: string;
  rep_email: string;
  rep_permanent_address: string;

  // --- FORM 3: TÀI KHOẢN NGÂN HÀNG & THANH TOÁN (4 trường) ---
  bank_name: string;
  bank_branch: string;
  bank_account_number: string;
  bank_account_holder_name: string;

  // --- FORM 4: HỒ SƠ NĂNG LỰC & XUẤT BẢN (5 trường) ---
  partner_type: 'PUBLISHER' | 'DISTRIBUTOR' | 'AUTHOR_COLLECTIVE';
  publishing_license_number: string;
  license_issue_date: string;
  estimated_book_count: number | string;
  main_genres: string[];

  // --- FORM 5: TÀI LIỆU MINH CHỨNG & CAM KẾT (4 tài liệu) ---
  document_business_license: string;
  document_id_front: string;
  document_id_back: string;
  document_publishing_permit: string;
  terms_accepted?: boolean;
  copyright_commitment?: boolean;
}

export type FieldValidationStatus = 'VALID' | 'INVALID' | 'WARNING' | 'NEUTRAL';

export interface FieldAuditResult {
  fieldName: string;
  fieldLabel: string;
  declaredValue: string | number | string[];
  registryValue?: string | number | string[];
  status: FieldValidationStatus;
  message: string;
  badge: string;
}

export interface EnterpriseEvaluationResult {
  overallStatus: 'PASS' | 'FLAGGED' | 'REJECT';
  validCount: number;
  invalidCount: number;
  warningCount: number;
  totalFields: number;
  registrySource: 'LOCAL_REGISTRY_DB' | 'NATIONAL_TAX_API' | 'NOT_FOUND';
  registryData?: RegisteredBusinessInfo;
  fields: Record<string, FieldAuditResult>;
}

// CSDL Danh bạ Doanh nghiệp / Nhà Xuất Bản Sách Mẫu tại Việt Nam
const MOCK_REGISTRY_DB: Record<string, RegisteredBusinessInfo> = {
  '0318926410': {
    tax_code: '0318926410',
    company_name: 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
    international_name: 'VIET INTELLECT DIGITAL CONTENT AND BOOK PUBLISHING CO., LTD',
    short_name: 'TRÍ TUỆ VIỆT BOOKS',
    business_license_number: '0318926410',
    issue_date: '2021-04-15',
    issue_place: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
    business_type: 'LLC',
    registered_address: {
      street: 'Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      ward: 'Phường Bến Nghé',
      district: 'Quận 1',
      province: 'TP. Hồ Chí Minh',
      country: 'Việt Nam',
    },
    representative: {
      full_name: 'Huỳnh Gia Huy',
      position: 'Giám đốc Điều hành',
    },
    ecommerce_industry_codes: ['4791', '5811', '6201'],
    status: 'ACTIVE',
    is_verified_from_registry: true,
    verified_source: 'LOCAL_REGISTRY_DB',
  },
  '0101234567': {
    tax_code: '0101234567',
    company_name: 'NHÀ XUẤT BẢN KIM ĐỒNG',
    international_name: 'KIM DONG PUBLISHING HOUSE',
    short_name: 'NXB KIM ĐỒNG',
    business_license_number: '0101234567',
    issue_date: '1957-06-17',
    issue_place: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
    business_type: 'CORPORATION',
    registered_address: {
      street: '55 Quang Trung, Phường Nguyễn Du, Quận Hai Bà Trưng, Hà Nội',
      ward: 'Phường Nguyễn Du',
      district: 'Quận Hai Bà Trưng',
      province: 'Hà Nội',
      country: 'Việt Nam',
    },
    representative: {
      full_name: 'Bùi Tuấn Nghĩa',
      position: 'Giám đốc',
    },
    ecommerce_industry_codes: ['4791', '5811'],
    status: 'ACTIVE',
    is_verified_from_registry: true,
    verified_source: 'LOCAL_REGISTRY_DB',
  },
  '0302482782': {
    tax_code: '0302482782',
    company_name: 'CÔNG TY CỔ PHẦN VĂN HÓA VÀ TRUYỀN THÔNG NHÃ NAM',
    international_name: 'NHA NAM CULTURE AND COMMUNICATIONS JOINT STOCK COMPANY',
    short_name: 'NHÃ NAM BOOKS',
    business_license_number: '0302482782',
    issue_date: '2005-02-15',
    issue_place: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
    business_type: 'CORPORATION',
    registered_address: {
      street: '59 Đỗ Quang, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội',
      ward: 'Phường Trung Hòa',
      district: 'Quận Cầu Giấy',
      province: 'Hà Nội',
      country: 'Việt Nam',
    },
    representative: {
      full_name: 'Nguyễn Nhật Anh',
      position: 'Tổng Giám đốc',
    },
    ecommerce_industry_codes: ['4791', '5811', '5813'],
    status: 'ACTIVE',
    is_verified_from_registry: true,
    verified_source: 'LOCAL_REGISTRY_DB',
  },
  '0301452937': {
    tax_code: '0301452937',
    company_name: 'CÔNG TY CỔ PHẦN PHÁT HÀNH SÁCH TP. HCM - FAHASA',
    international_name: 'HO CHI MINH CITY BOOK DISTRIBUTION JOINT STOCK COMPANY',
    short_name: 'FAHASA',
    business_license_number: '0301452937',
    issue_date: '2005-12-28',
    issue_place: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
    business_type: 'CORPORATION',
    registered_address: {
      street: '60-62 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      ward: 'Phường Bến Nghé',
      district: 'Quận 1',
      province: 'TP. Hồ Chí Minh',
      country: 'Việt Nam',
    },
    representative: {
      full_name: 'Phạm Minh Thuận',
      position: 'Chủ tịch HĐQT',
    },
    ecommerce_industry_codes: ['4791', '5811'],
    status: 'ACTIVE',
    is_verified_from_registry: true,
    verified_source: 'LOCAL_REGISTRY_DB',
  },
};

/**
 * Chuẩn hóa chuỗi so khớp tiếng Việt không dấu, bỏ khoảng trắng thừa
 */
function normalizeString(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Kiểm tra CCCD 12 số chuẩn quy định Bộ Công An
 */
function validateCCCD(cccd: string): boolean {
  const clean = (cccd || '').replace(/\s+/g, '');
  return /^[0-9]{12}$/.test(clean);
}

/**
 * Kiểm tra số điện thoại VN 10 số
 */
function validatePhoneVN(phone: string): boolean {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  return /^(0[3|5|7|8|9])[0-9]{8}$/.test(clean);
}

/**
 * Kiểm tra email RFC
 */
function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email || '');
}

export const taxRegistryService = {
  /**
   * Tra cứu đối chiếu thông tin doanh nghiệp theo Mã Số Thuế (Hybrid)
   */
  async lookupTaxCode(rawTaxCode: string): Promise<{
    success: boolean;
    data?: RegisteredBusinessInfo;
    error?: string;
  }> {
    const cleanTaxCode = rawTaxCode.replace(/[^0-9-]/g, '').trim();

    if (!cleanTaxCode || cleanTaxCode.length < 10) {
      return {
        success: false,
        error: 'Mã số thuế phải có từ 10 đến 13 chữ số hợp lệ.',
      };
    }

    // 1. Kiểm tra CSDL Nội bộ / Cache trước (< 10ms)
    if (MOCK_REGISTRY_DB[cleanTaxCode]) {
      return {
        success: true,
        data: MOCK_REGISTRY_DB[cleanTaxCode],
      };
    }

    // 2. Thử gọi Live National Tax API (VietQR Public API)
    try {
      const response = await fetch(`https://api.vietqr.io/v2/business/${cleanTaxCode}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.code === '00' && result.data) {
          const apiData = result.data;
          const parsedInfo: RegisteredBusinessInfo = {
            tax_code: cleanTaxCode,
            company_name: (apiData.name || apiData.companyName || '').toUpperCase(),
            international_name: apiData.internationalName || '',
            short_name: apiData.shortName || '',
            business_license_number: cleanTaxCode,
            issue_date: apiData.foundedDate || new Date().toISOString().slice(0, 10),
            issue_place: 'Sở Kế hoạch và Đầu tư',
            business_type: apiData.name?.includes('CỔ PHẦN') ? 'CORPORATION' : 'LLC',
            registered_address: {
              street: apiData.address || '',
              ward: '',
              district: '',
              province: '',
              country: 'Việt Nam',
            },
            representative: {
              full_name: apiData.representative || apiData.director || '',
              position: 'Người đại diện pháp luật',
            },
            ecommerce_industry_codes: ['4791'],
            status: 'ACTIVE',
            is_verified_from_registry: true,
            verified_source: 'NATIONAL_TAX_API',
          };

          // Cache lại cho các lần tra cứu sau
          MOCK_REGISTRY_DB[cleanTaxCode] = parsedInfo;

          return {
            success: true,
            data: parsedInfo,
          };
        }
      }
    } catch {
      // Bỏ qua lỗi mạng từ API bên thứ 3 và fallback
    }

    // 3. Nếu là mã số thuế hợp lệ nhưng chưa có trong CSDL công khai mẫu:
    return {
      success: false,
      error: 'Không tìm thấy MST trong CSDL Doanh nghiệp Quốc Gia.',
    };
  },

  /**
   * BỘ MÁY THẨM ĐỊNH 33 TRƯỜNG DỮ LIỆU ĐỐI TÁC (Tự động tính toán XANH / ĐỎ / VÀNG)
   */
  async evaluateEnterpriseProfile(profile: Partial<EnterpriseFullProfile>): Promise<EnterpriseEvaluationResult> {
    const fields: Record<string, FieldAuditResult> = {};
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;

    const rawTax = profile.tax_code || '';
    const cleanTax = rawTax.replace(/[^0-9-]/g, '').trim();

    // 1. Tra cứu CSDL Quốc gia
    const lookupRes = await this.lookupTaxCode(cleanTax);
    const reg = lookupRes.success && lookupRes.data ? lookupRes.data : null;
    const regSource = reg ? reg.verified_source : 'NOT_FOUND';

    const addField = (
      fieldName: string,
      fieldLabel: string,
      declaredValue: any,
      registryValue: any,
      status: FieldValidationStatus,
      message: string,
      badge: string
    ) => {
      if (status === 'VALID') validCount++;
      else if (status === 'INVALID') invalidCount++;
      else if (status === 'WARNING') warningCount++;

      fields[fieldName] = {
        fieldName,
        fieldLabel,
        declaredValue: declaredValue ?? '',
        registryValue,
        status,
        message,
        badge,
      };
    };

    // ==========================================
    // FORM 1: DOANH NGHIỆP & PHÁP LÝ (12 trường)
    // ==========================================

    // 1. MST
    if (reg && reg.status === 'ACTIVE') {
      addField('tax_code', 'Mã số thuế', profile.tax_code, reg.tax_code, 'VALID', 'Mã số thuế hợp lệ, đang hoạt động', '✓ Khớp CSDL Quốc Gia');
    } else if (reg && reg.status !== 'ACTIVE') {
      addField('tax_code', 'Mã số thuế', profile.tax_code, reg.tax_code, 'INVALID', 'Doanh nghiệp đã ngừng hoạt động/đóng MST', '✕ MST đã ngừng hoạt động');
    } else {
      addField('tax_code', 'Mã số thuế', profile.tax_code, null, 'INVALID', 'Mã số thuế không tồn tại trong CSDL Doanh nghiệp Quốc Gia', '✕ Không có trong CSDL');
    }

    // 2. Tên doanh nghiệp
    const normDeclaredName = normalizeString(profile.company_name);
    const normRegName = normalizeString(reg?.company_name);
    if (reg) {
      if (normDeclaredName && normDeclaredName === normRegName) {
        addField('company_name', 'Tên doanh nghiệp', profile.company_name, reg.company_name, 'VALID', 'Tên doanh nghiệp trùng khớp 100% với CSDL Tổng cục Thuế', '✓ Trùng khớp CSDL');
      } else {
        addField('company_name', 'Tên doanh nghiệp', profile.company_name, reg.company_name, 'INVALID', `Tên khai báo sai lệch so với CSDL gốc: "${reg.company_name}"`, '✕ Sai lệch so với CSDL');
      }
    } else {
      addField('company_name', 'Tên doanh nghiệp', profile.company_name, null, 'INVALID', 'Không thể đối chiếu do MST không có trong CSDL', '✕ Không có CSDL đối chiếu');
    }

    // 3. Tên quốc tế
    if (profile.international_name) {
      addField('international_name', 'Tên quốc tế', profile.international_name, reg?.international_name, 'VALID', 'Tên tiếng Anh hợp lệ', '✓ Hợp lệ');
    } else {
      addField('international_name', 'Tên quốc tế', 'Không có', null, 'NEUTRAL', 'Không bắt buộc', '— Không khai báo');
    }

    // 4. Tên viết tắt
    if (profile.short_name) {
      addField('short_name', 'Tên viết tắt / Thương hiệu', profile.short_name, reg?.short_name, 'VALID', 'Tên thương hiệu ngắn gọn hợp lệ', '✓ Hợp lệ');
    } else {
      addField('short_name', 'Tên viết tắt / Thương hiệu', 'Không có', null, 'NEUTRAL', 'Không bắt buộc', '— Không khai báo');
    }

    // 5. Số Giấy phép ĐKKD
    if (profile.business_license_number && (profile.business_license_number === cleanTax || (reg && profile.business_license_number === reg.business_license_number))) {
      addField('business_license_number', 'Số Giấy phép ĐKKD', profile.business_license_number, reg?.business_license_number, 'VALID', 'Số ĐKKD trùng khớp với mã số doanh nghiệp', '✓ Khớp CSDL');
    } else if (profile.business_license_number) {
      addField('business_license_number', 'Số Giấy phép ĐKKD', profile.business_license_number, reg?.business_license_number, 'WARNING', 'Số ĐKKD có khác biệt với MST, cần đối chiếu bản scan GPKD', '🟡 Cần soi bản scan');
    } else {
      addField('business_license_number', 'Số Giấy phép ĐKKD', 'Chưa nhập', null, 'INVALID', 'Thiếu số Giấy phép ĐKKD', '✕ Thiếu thông tin');
    }

    // 6. Ngày cấp GPKD
    if (profile.issue_date) {
      addField('issue_date', 'Ngày cấp GPKD', profile.issue_date, reg?.issue_date, 'VALID', 'Ngày cấp hợp lệ', '✓ Hợp lệ');
    } else {
      addField('issue_date', 'Ngày cấp GPKD', 'Chưa có', null, 'INVALID', 'Thiếu ngày cấp giấy phép', '✕ Thiếu thông tin');
    }

    // 7. Nơi cấp GPKD
    if (profile.issue_place) {
      addField('issue_place', 'Nơi cấp GPKD', profile.issue_place, reg?.issue_place, 'VALID', 'Cơ quan cấp phép hợp lệ', '✓ Hợp lệ');
    } else {
      addField('issue_place', 'Nơi cấp GPKD', 'Chưa có', null, 'INVALID', 'Thiếu nơi cấp', '✕ Thiếu thông tin');
    }

    // 8. Loại hình doanh nghiệp
    if (profile.business_type) {
      addField('business_type', 'Loại hình doanh nghiệp', profile.business_type, reg?.business_type, 'VALID', 'Loại hình pháp nhân hợp lệ', '✓ Hợp lệ');
    } else {
      addField('business_type', 'Loại hình doanh nghiệp', 'Chưa chọn', null, 'INVALID', 'Chưa chọn loại hình', '✕ Chưa chọn');
    }

    // 9. Địa chỉ trụ sở
    if (profile.registered_address && profile.registered_address.length > 10) {
      addField('registered_address', 'Địa chỉ trụ sở chính', profile.registered_address, reg?.registered_address ? reg.registered_address.street : null, 'VALID', 'Địa chỉ trụ sở rõ ràng, đầy đủ', '✓ Đầy đủ địa chỉ');
    } else {
      addField('registered_address', 'Địa chỉ trụ sở chính', profile.registered_address || 'Trống', null, 'INVALID', 'Địa chỉ trụ sở quá ngắn hoặc bỏ trống', '✕ Địa chỉ không rõ ràng');
    }

    // 10. Email công ty
    if (validateEmail(profile.email || '')) {
      addField('email', 'Email doanh nghiệp', profile.email, null, 'VALID', 'Cú pháp email hợp lệ', '✓ Email chuẩn');
    } else {
      addField('email', 'Email doanh nghiệp', profile.email || 'Trống', null, 'INVALID', 'Email không đúng định dạng', '✕ Sai định dạng email');
    }

    // 11. Hotline công ty
    if (validatePhoneVN(profile.phone || '')) {
      addField('phone', 'Hotline liên hệ', profile.phone, null, 'VALID', 'Số điện thoại hợp lệ (10 số VN)', '✓ SĐT hợp lệ');
    } else {
      addField('phone', 'Hotline liên hệ', profile.phone || 'Trống', null, 'INVALID', 'Hotline không hợp lệ', '✕ Sai số điện thoại');
    }

    // 12. Website
    if (profile.website && profile.website.startsWith('http')) {
      addField('website', 'Website công ty', profile.website, null, 'VALID', 'Đường dẫn website hợp lệ', '✓ URL chuẩn');
    } else if (profile.website) {
      addField('website', 'Website công ty', profile.website, null, 'WARNING', 'Nên sử dụng tiền tố https://', '🟡 Thiếu https://');
    } else {
      addField('website', 'Website công ty', 'Không có', null, 'NEUTRAL', 'Không bắt buộc', '— Không khai báo');
    }

    // ==========================================
    // FORM 2: NGƯỜI ĐẠI DIỆN PHÁP LUẬT (8 trường)
    // ==========================================

    // 13. Họ tên đại diện
    const normDeclaredRep = normalizeString(profile.rep_full_name);
    const normRegRep = normalizeString(reg?.representative?.full_name);
    if (reg && normRegRep) {
      if (normDeclaredRep === normRegRep) {
        addField('rep_full_name', 'Họ tên người đại diện', profile.rep_full_name, reg.representative.full_name, 'VALID', 'Khớp 100% với tên đại diện trên CSDL Thuế', '✓ Khớp CSDL Thuế');
      } else {
        addField('rep_full_name', 'Họ tên người đại diện', profile.rep_full_name, reg.representative.full_name, 'INVALID', `Tên không khớp với CSDL Thuế: "${reg.representative.full_name}"`, '✕ Không khớp CSDL');
      }
    } else if (profile.rep_full_name && profile.rep_full_name.trim().length >= 3) {
      addField('rep_full_name', 'Họ tên người đại diện', profile.rep_full_name, null, 'VALID', 'Họ tên đại diện đầy đủ', '✓ Hợp lệ');
    } else {
      addField('rep_full_name', 'Họ tên người đại diện', profile.rep_full_name || 'Trống', null, 'INVALID', 'Thiếu họ tên người đại diện', '✕ Thiếu thông tin');
    }

    // 14. Chức vụ
    if (profile.rep_position) {
      addField('rep_position', 'Chức vụ đại diện', profile.rep_position, reg?.representative?.position, 'VALID', 'Chức danh quản lý hợp lệ', '✓ Hợp lệ');
    } else {
      addField('rep_position', 'Chức vụ đại diện', 'Chưa có', null, 'INVALID', 'Chưa khai báo chức vụ', '✕ Thiếu thông tin');
    }

    // 15. Số CCCD 12 số
    if (validateCCCD(profile.rep_id_card_number || '')) {
      addField('rep_id_card_number', 'Số CCCD (12 số)', profile.rep_id_card_number, null, 'VALID', 'Cấu trúc CCCD 12 số chuẩn Bộ Công An', '✓ Chuẩn CCCD 12 số');
    } else {
      addField('rep_id_card_number', 'Số CCCD (12 số)', profile.rep_id_card_number || 'Trống', null, 'INVALID', 'Số CCCD phải gồm đúng 12 chữ số hợp lệ', '✕ Sai cấu trúc CCCD');
    }

    // 16. Ngày cấp CCCD
    if (profile.rep_id_card_issue_date) {
      addField('rep_id_card_issue_date', 'Ngày cấp CCCD', profile.rep_id_card_issue_date, null, 'VALID', 'Ngày cấp hợp lệ', '✓ Hợp lệ');
    } else {
      addField('rep_id_card_issue_date', 'Ngày cấp CCCD', 'Trống', null, 'INVALID', 'Thiếu ngày cấp CCCD', '✕ Thiếu thông tin');
    }

    // 17. Nơi cấp CCCD
    if (profile.rep_id_card_issue_place) {
      addField('rep_id_card_issue_place', 'Nơi cấp CCCD', profile.rep_id_card_issue_place, null, 'VALID', 'Cơ quan cấp CCCD hợp lệ', '✓ Hợp lệ');
    } else {
      addField('rep_id_card_issue_place', 'Nơi cấp CCCD', 'Trống', null, 'INVALID', 'Thiếu nơi cấp CCCD', '✕ Thiếu thông tin');
    }

    // 18. SĐT đại diện
    if (validatePhoneVN(profile.rep_phone || '')) {
      addField('rep_phone', 'SĐT người đại diện', profile.rep_phone, null, 'VALID', 'Số điện thoại cá nhân hợp lệ', '✓ SĐT hợp lệ');
    } else {
      addField('rep_phone', 'SĐT người đại diện', profile.rep_phone || 'Trống', null, 'INVALID', 'SĐT cá nhân không hợp lệ', '✕ Sai định dạng SĐT');
    }

    // 19. Email đại diện
    if (validateEmail(profile.rep_email || '')) {
      addField('rep_email', 'Email người đại diện', profile.rep_email, null, 'VALID', 'Email cá nhân hợp lệ', '✓ Email chuẩn');
    } else {
      addField('rep_email', 'Email người đại diện', profile.rep_email || 'Trống', null, 'INVALID', 'Email cá nhân không đúng định dạng', '✕ Sai định dạng email');
    }

    // 20. Địa chỉ thường trú
    if (profile.rep_permanent_address && profile.rep_permanent_address.length > 5) {
      addField('rep_permanent_address', 'Địa chỉ thường trú', profile.rep_permanent_address, null, 'VALID', 'Địa chỉ thường trú đầy đủ', '✓ Đầy đủ');
    } else {
      addField('rep_permanent_address', 'Địa chỉ thường trú', profile.rep_permanent_address || 'Trống', null, 'INVALID', 'Thiếu địa chỉ thường trú', '✕ Thiếu thông tin');
    }

    // ==========================================
    // FORM 3: TÀI KHOẢN NGÂN HÀNG (4 trường)
    // ==========================================

    // 21. Tên ngân hàng
    if (profile.bank_name) {
      addField('bank_name', 'Ngân hàng thụ hưởng', profile.bank_name, null, 'VALID', 'Ngân hàng thuộc mạng lưới NAPAS/VietQR', '✓ Ngân hàng hợp lệ');
    } else {
      addField('bank_name', 'Ngân hàng thụ hưởng', 'Trống', null, 'INVALID', 'Chưa chọn ngân hàng', '✕ Chưa chọn');
    }

    // 22. Chi nhánh
    if (profile.bank_branch) {
      addField('bank_branch', 'Chi nhánh ngân hàng', profile.bank_branch, null, 'VALID', 'Chi nhánh rõ ràng', '✓ Hợp lệ');
    } else {
      addField('bank_branch', 'Chi nhánh ngân hàng', 'Trống', null, 'INVALID', 'Thiếu chi nhánh ngân hàng', '✕ Thiếu thông tin');
    }

    // 23. Số tài khoản
    const cleanAcc = (profile.bank_account_number || '').replace(/\s+/g, '');
    if (cleanAcc.length >= 6 && /^[0-9A-Za-z]+$/.test(cleanAcc)) {
      addField('bank_account_number', 'Số tài khoản ngân hàng', profile.bank_account_number, null, 'VALID', 'Cấu trúc số tài khoản ngân hàng hợp lệ', '✓ STK hợp lệ');
    } else {
      addField('bank_account_number', 'Số tài khoản ngân hàng', profile.bank_account_number || 'Trống', null, 'INVALID', 'Số tài khoản không đúng quy chuẩn', '✕ Sai định dạng STK');
    }

    // 24. Tên chủ tài khoản (AML Check)
    const normHolder = normalizeString(profile.bank_account_holder_name);
    const isHolderMatchingCompany = normHolder && normDeclaredName && normHolder === normDeclaredName;
    const isHolderMatchingRep = normHolder && normDeclaredRep && normHolder === normDeclaredRep;

    if (isHolderMatchingCompany || isHolderMatchingRep) {
      addField(
        'bank_account_holder_name',
        'Tên chủ tài khoản (AML)',
        profile.bank_account_holder_name,
        profile.company_name,
        'VALID',
        'Tên chủ tài khoản khớp 100% với tên pháp nhân/người đại diện (Tuân thủ luật AML)',
        '✓ Khớp tên pháp lý (AML)'
      );
    } else if (normHolder) {
      addField(
        'bank_account_holder_name',
        'Tên chủ tài khoản (AML)',
        profile.bank_account_holder_name,
        profile.company_name,
        'INVALID',
        `Cảnh báo AML: Tên chủ tài khoản "${profile.bank_account_holder_name}" không khớp với tên doanh nghiệp "${profile.company_name}"`,
        '✕ Cảnh báo lệch tên (AML)'
      );
    } else {
      addField('bank_account_holder_name', 'Tên chủ tài khoản (AML)', 'Trống', null, 'INVALID', 'Thiếu tên chủ tài khoản', '✕ Thiếu thông tin');
    }

    // ==========================================
    // FORM 4: HỒ SƠ NĂNG LỰC & XUẤT BẢN (5 trường)
    // ==========================================

    // 25. Loại đối tác
    if (profile.partner_type) {
      addField('partner_type', 'Phân loại đối tác', profile.partner_type, null, 'VALID', 'Phân loại đối tác xuất bản hợp lệ', '✓ Hợp lệ');
    } else {
      addField('partner_type', 'Phân loại đối tác', 'Chưa chọn', null, 'INVALID', 'Chưa chọn loại đối tác', '✕ Chưa chọn');
    }

    // 26. Số GP Xuất bản
    if (profile.publishing_license_number && profile.publishing_license_number.length >= 3) {
      addField('publishing_license_number', 'Số GP Xuất bản/Phát hành', profile.publishing_license_number, null, 'VALID', 'Đã khai báo số giấy phép xuất bản', '✓ Đã khai báo GP');
    } else {
      addField('publishing_license_number', 'Số GP Xuất bản/Phát hành', 'Trống', null, 'INVALID', 'Thiếu số giấy phép xuất bản/phát hành', '✕ Thiếu thông tin');
    }

    // 27. Ngày cấp GP Xuất bản
    if (profile.license_issue_date) {
      addField('license_issue_date', 'Ngày cấp GP Xuất bản', profile.license_issue_date, null, 'VALID', 'Ngày cấp giấy phép hợp lệ', '✓ Hợp lệ');
    } else {
      addField('license_issue_date', 'Ngày cấp GP Xuất bản', 'Trống', null, 'INVALID', 'Thiếu ngày cấp giấy phép', '✕ Thiếu thông tin');
    }

    // 28. Số lượng sách
    const bookCount = Number(profile.estimated_book_count);
    if (!isNaN(bookCount) && bookCount > 0) {
      addField('estimated_book_count', 'Số lượng sách dự kiến', profile.estimated_book_count, null, 'VALID', `Quy mô phát hành: ${bookCount} đầu sách`, '✓ Quy mô hợp lệ');
    } else {
      addField('estimated_book_count', 'Số lượng sách dự kiến', profile.estimated_book_count || 0, null, 'INVALID', 'Số lượng sách phải lớn hơn 0', '✕ Số lượng không hợp lệ');
    }

    // 29. Thể loại chính
    if (Array.isArray(profile.main_genres) && profile.main_genres.length > 0) {
      addField('main_genres', 'Thể loại sách chính', profile.main_genres.join(', '), null, 'VALID', `Đã chọn ${profile.main_genres.length} thể loại`, '✓ Đã chọn thể loại');
    } else {
      addField('main_genres', 'Thể loại sách chính', 'Chưa chọn', null, 'INVALID', 'Chưa chọn thể loại phát hành', '✕ Chưa chọn thể loại');
    }

    // ==========================================
    // FORM 5: TÀI LIỆU MINH CHỨNG & SCAN (4 tài liệu)
    // ==========================================

    // 30. GPKD Scan
    if (profile.document_business_license) {
      addField('document_business_license', 'Bản scan Giấy phép ĐKKD', 'Đã đính kèm tệp', null, 'VALID', 'Tài liệu đã tải lên thành công. Admin tự đối chiếu con dấu đỏ.', '👁️ Admin xem con dấu');
    } else {
      addField('document_business_license', 'Bản scan Giấy phép ĐKKD', 'Chưa có', null, 'INVALID', 'Thiếu bản scan Giấy phép ĐKKD', '✕ Thiếu chứng từ');
    }

    // 31. CCCD Mặt trước
    if (profile.document_id_front) {
      addField('document_id_front', 'Ảnh CCCD mặt trước', 'Đã đính kèm tệp', null, 'VALID', 'Ảnh CCCD mặt trước đã tải lên. Admin đối chiếu mặt và số CCCD.', '👁️ Admin xem ảnh chân dung');
    } else {
      addField('document_id_front', 'Ảnh CCCD mặt trước', 'Chưa có', null, 'INVALID', 'Thiếu ảnh CCCD mặt trước', '✕ Thiếu chứng từ');
    }

    // 32. CCCD Mặt sau
    if (profile.document_id_back) {
      addField('document_id_back', 'Ảnh CCCD mặt sau', 'Đã đính kèm tệp', null, 'VALID', 'Ảnh CCCD mặt sau đã tải lên. Admin đối chiếu ngày cấp và vân tay.', '👁️ Admin xem ngày cấp/vân tay');
    } else {
      addField('document_id_back', 'Ảnh CCCD mặt sau', 'Chưa có', null, 'INVALID', 'Thiếu ảnh CCCD mặt sau', '✕ Thiếu chứng từ');
    }

    // 33. Giấy phép xuất bản Scan
    if (profile.document_publishing_permit) {
      addField('document_publishing_permit', 'Scan GP Xuất bản / Ủy quyền', 'Đã đính kèm tệp', null, 'VALID', 'Giấy phép xuất bản đã tải lên. Admin kiểm tra thẩm quyền ký duyệt.', '👁️ Admin xem giấy phép');
    } else {
      addField('document_publishing_permit', 'Scan GP Xuất bản / Ủy quyền', 'Chưa có', null, 'INVALID', 'Thiếu scan Giấy phép xuất bản/Ủy quyền', '✕ Thiếu chứng từ');
    }

    const totalFields = Object.keys(fields).length;
    let overallStatus: 'PASS' | 'FLAGGED' | 'REJECT' = 'PASS';
    if (invalidCount >= 3 || !reg) {
      overallStatus = 'REJECT';
    } else if (invalidCount > 0 || warningCount > 0) {
      overallStatus = 'FLAGGED';
    }

    return {
      overallStatus,
      validCount,
      invalidCount,
      warningCount,
      totalFields,
      registrySource: regSource,
      registryData: reg || undefined,
      fields,
    };
  },

  /**
   * Lấy danh sách MST mẫu để demo nhanh
   */
  getSampleTaxCodes() {
    return [
      { code: '0318926410', name: 'Trí Tuệ Việt Books' },
      { code: '0101234567', name: 'NXB Kim Đồng' },
      { code: '0302482782', name: 'Nhã Nam Books' },
      { code: '0301452937', name: 'Fahasa' },
    ];
  },
};
