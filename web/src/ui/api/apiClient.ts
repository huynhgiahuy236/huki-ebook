import { tokenStorage } from './tokenStorage';
import type { ApiResponse, AuthTokens } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

let refreshPromise: Promise<string | null> | null = null;

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth = false, headers: customHeaders, ...restOptions } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const isFormData = typeof FormData !== 'undefined' && restOptions.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    'x-correlation-id': correlationId,
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers,
    });

    // Handle 401 Unauthorized & Token Refresh
    if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-correlation-id': correlationId,
                },
                body: JSON.stringify({ refreshToken }),
              });

              if (refreshRes.ok) {
                const refreshBody = await refreshRes.json();
                const refreshData = refreshBody.data || refreshBody;
                const newTokens: AuthTokens = refreshData.tokens || refreshData;
                const newAccessToken = newTokens?.accessToken || refreshData?.accessToken;
                const newRefreshToken = newTokens?.refreshToken || refreshData?.refreshToken;

                if (newAccessToken && newRefreshToken) {
                  tokenStorage.setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
                  return newAccessToken;
                } else {
                  throw new Error('Invalid refresh response');
                }
              } else {
                throw new Error('Refresh failed');
              }
            } catch {
              tokenStorage.clearTokens();
              return null;
            }
          })().finally(() => {
            refreshPromise = null;
          });
        }

        const retryToken = await refreshPromise;

        if (retryToken) {
          headers['Authorization'] = `Bearer ${retryToken}`;
          const retryRes = await fetch(url, { ...restOptions, headers });
          return await parseResponse<T>(retryRes);
        } else {
          return {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
              statusCode: 401,
            },
          };
        }
      }
    }

    return await parseResponse<T>(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ API Gateway.';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message,
        statusCode: 0,
      },
    };
  }
}

// ============================================================================
// HUKI EBOOK - HUMAN-CENTRIC ERROR TRANSLATOR ENGINE
// ============================================================================

const HTTP_STATUS_TRANSLATIONS: Record<number, { title: string; message: string; code: string }> = {
  400: {
    title: 'Dữ liệu chưa hợp lệ',
    message: 'Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc theo đúng định dạng.',
    code: 'BAD_REQUEST',
  },
  401: {
    title: 'Phiên đăng nhập hết hạn',
    message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục.',
    code: 'UNAUTHORIZED',
  },
  403: {
    title: 'Truy cập bị từ chối',
    message: 'Bạn không có quyền thực hiện thao tác này trên hệ thống.',
    code: 'FORBIDDEN',
  },
  404: {
    title: 'Không tìm thấy dữ liệu',
    message: 'Nội dung hoặc tài nguyên bạn yêu cầu không tồn tại hoặc đã bị gỡ bỏ.',
    code: 'NOT_FOUND',
  },
  409: {
    title: 'Dữ liệu đã tồn tại',
    message: 'Thông tin này đã tồn tại trên hệ thống hoặc đang xảy ra xung đột trạng thái.',
    code: 'CONFLICT',
  },
  422: {
    title: 'Dữ liệu không đáp ứng quy định',
    message: 'Thông tin gửi lên không đáp ứng các quy chuẩn xử lý. Vui lòng kiểm tra lại.',
    code: 'UNPROCESSABLE_ENTITY',
  },
  429: {
    title: 'Thao tác quá nhanh',
    message: 'Hệ thống nhận nhiều yêu cầu liên tiếp. Vui lòng đợi vài giây và thử lại.',
    code: 'TOO_MANY_REQUESTS',
  },
  500: {
    title: 'Máy chủ đang bận xử lý',
    message: 'Hệ thống máy chủ đang gặp trục trặc tạm thời khi xử lý. Vui lòng thử lại sau giây lát hoặc liên hệ CSKH.',
    code: 'INTERNAL_SERVER_ERROR',
  },
  502: {
    title: 'Dịch vụ tạm gián đoạn',
    message: 'Không thể kết nối đến cụm máy chủ nội bộ. Vui lòng thử lại sau ít phút.',
    code: 'BAD_GATEWAY',
  },
  503: {
    title: 'Dịch vụ đang bảo trì',
    message: 'Hệ thống đang được nâng cấp bảo trì định kỳ. Vui lòng quay lại sau.',
    code: 'SERVICE_UNAVAILABLE',
  },
  504: {
    title: 'Hết thời gian phản hồi',
    message: 'Máy chủ xử lý quá thời gian quy định. Vui lòng kiểm tra lại đường truyền mạng và thử lại.',
    code: 'GATEWAY_TIMEOUT',
  },
};

const BUSINESS_ERROR_TRANSLATIONS: Record<string, { title: string; message: string }> = {
  // Auth & Account
  AUTH_INVALID_CREDENTIALS: {
    title: 'Đăng nhập không thành công',
    message: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
  },
  AUTH_USER_NOT_FOUND: {
    title: 'Không tìm thấy tài khoản',
    message: 'Email này chưa được đăng ký trong hệ thống HUKI.',
  },
  AUTH_USER_ALREADY_EXISTS: {
    title: 'Email đã được sử dụng',
    message: 'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc sử dụng email khác.',
  },
  AUTH_ACCOUNT_LOCKED: {
    title: 'Tài khoản tạm khóa',
    message: 'Tài khoản của bạn tạm thời bị khóa do chính sách bảo mật. Vui lòng liên hệ ban quản trị.',
  },
  AUTH_UNVERIFIED_EMAIL: {
    title: 'Chưa xác thực email',
    message: 'Tài khoản chưa được kích hoạt. Vui lòng nhập mã OTP đã gửi tới email của bạn.',
  },
  AUTH_OTP_INVALID: {
    title: 'Mã xác thực không đúng',
    message: 'Mã OTP bạn vừa nhập không chính xác. Vui lòng kiểm tra kỹ và nhập lại.',
  },
  AUTH_OTP_EXPIRED: {
    title: 'Mã xác thực đã hết hạn',
    message: 'Mã OTP đã hết hiệu lực. Vui lòng bấm "Gửi lại mã OTP" để nhận mã mới.',
  },
  AUTH_PASSWORD_TOO_WEAK: {
    title: 'Mật khẩu chưa đủ mạnh',
    message: 'Mật khẩu cần tối thiểu 8 ký tự, bao gồm cả chữ và chữ số.',
  },
  AUTH_SAME_OLD_PASSWORD: {
    title: 'Mật khẩu không đổi',
    message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại của bạn.',
  },

  // Business & Stores
  BUSINESS_ALREADY_EXISTS: {
    title: 'Doanh nghiệp đã tồn tại',
    message: 'Tài khoản của bạn đã có một hồ sơ doanh nghiệp trên hệ thống.',
  },
  BUSINESS_TAX_CODE_EXISTS: {
    title: 'Mã số thuế đã tồn tại',
    message: 'Mã số thuế này đã được đăng ký bởi một đơn vị đối tác khác trên hệ thống HUKI.',
  },
  BUSINESS_NOT_FOUND: {
    title: 'Không tìm thấy doanh nghiệp',
    message: 'Không tìm thấy thông tin đơn vị đối tác yêu cầu.',
  },
  BUSINESS_NOT_APPROVED: {
    title: 'Hồ sơ đang chờ duyệt',
    message: 'Doanh nghiệp của bạn đang trong quy trình thẩm định bởi ban quản trị HUKI.',
  },
  STORE_SLUG_EXISTS: {
    title: 'Tên đường dẫn đã tồn tại',
    message: 'Tên gian hàng hoặc đường dẫn này đã được sử dụng. Vui lòng chọn tên khác.',
  },
  STORE_NOT_FOUND: {
    title: 'Gian hàng không tồn tại',
    message: 'Gian hàng bạn đang tìm kiếm không tồn tại hoặc tạm thời ngừng hoạt động.',
  },

  // Catalog & Books
  BOOK_NOT_FOUND: {
    title: 'Không tìm thấy sách',
    message: 'Cuốn sách bạn đang tìm không tồn tại hoặc đã ngừng phát hành.',
  },
  BOOK_OUT_OF_STOCK: {
    title: 'Sản phẩm đã hết hàng',
    message: 'Cuốn sách này tạm thời đã hết hàng trong kho. Vui lòng chọn tác phẩm khác.',
  },
  INSUFFICIENT_STOCK: {
    title: 'Số lượng trong kho không đủ',
    message: 'Số lượng sách trong kho không đủ đáp ứng số lượng bạn đã chọn.',
  },
  CATEGORY_NOT_FOUND: {
    title: 'Danh mục không tồn tại',
    message: 'Thể loại sách yêu cầu không tồn tại trong hệ thống.',
  },

  // Orders & Cart
  CART_ITEM_NOT_FOUND: {
    title: 'Sản phẩm không có trong giỏ',
    message: 'Món hàng này không còn tồn tại trong giỏ hàng của bạn.',
  },
  ORDER_NOT_FOUND: {
    title: 'Không tìm thấy đơn hàng',
    message: 'Mã đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
  },
  ORDER_CANNOT_BE_CANCELLED: {
    title: 'Không thể hủy đơn',
    message: 'Đơn hàng đang được đóng gói hoặc giao vận nên không thể hủy vào lúc này.',
  },
  IDEMPOTENCY_CONFLICT: {
    title: 'Đơn hàng đang được xử lý',
    message: 'Hệ thống đang tiến hành tạo đơn. Vui lòng không nhấn liên tục.',
  },

  // System
  SYSTEM_INTERNAL_ERROR: {
    title: 'Lỗi máy chủ tạm thời',
    message: 'Hệ thống gặp sự cố trong quá trình xử lý. Đội ngũ kỹ thuật đã được thông báo. Vui lòng thử lại sau.',
  },
  SYSTEM_UNAVAILABLE: {
    title: 'Dịch vụ tạm thời bận',
    message: 'Dịch vụ máy chủ tạm thời phản hồi chậm. Vui lòng thử lại sau giây lát.',
  },
  NETWORK_ERROR: {
    title: 'Lỗi kết nối mạng',
    message: 'Không thể kết nối đến máy chủ HUKI. Vui lòng kiểm tra đường truyền internet của bạn.',
  },
};

function translateValidationRule(msg: string): string {
  if (!msg || typeof msg !== 'string') return '';
  const trimmed = msg.trim();
  
  if (/categoryId.*UUID/i.test(trimmed)) return 'Vui lòng chọn Thể loại sách hợp lệ trong danh mục';
  if (/authorId.*UUID/i.test(trimmed)) return 'Vui lòng chọn Tác giả hợp lệ';
  if (/publisherId.*UUID/i.test(trimmed)) return 'Vui lòng chọn Nhà xuất bản hợp lệ';
  if (/businessId.*UUID/i.test(trimmed)) return 'Doanh nghiệp chưa được cấp phép hoặc không hợp lệ';
  if (/storeId.*UUID/i.test(trimmed)) return 'Cửa hàng không hợp lệ';
  if (/title.*(empty|string|length)/i.test(trimmed)) return 'Tên tác phẩm không được để trống';
  if (/price.*(number|min|less than)/i.test(trimmed)) return 'Giá bán phải là số hợp lệ (tối thiểu 0đ)';
  if (/isbn.*(string|length)/i.test(trimmed)) return 'Mã ISBN không đúng định dạng';
  if (/stock.*(int|number|min)/i.test(trimmed)) return 'Số lượng tồn kho phải là số nguyên lớn hơn hoặc bằng 0';
  if (/weight.*(number|min)/i.test(trimmed)) return 'Trọng lượng sách phải là số hợp lệ';
  if (/email.*email/i.test(trimmed)) return 'Email không đúng định dạng';
  if (/phone/i.test(trimmed)) return 'Số điện thoại không hợp lệ';
  if (/tax.*code/i.test(trimmed)) return 'Mã số thuế không hợp lệ';
  
  return trimmed;
}

function extractHumanErrorMessage(body: unknown, status: number): { title?: string; message: string; code: string } {
  const defaultHttp = HTTP_STATUS_TRANSLATIONS[status] || {
    title: 'Thông báo',
    message: `Hệ thống gặp sự cố khi xử lý yêu cầu (Mã: ${status}). Vui lòng thử lại sau.`,
    code: `HTTP_${status}`,
  };

  if (!body || typeof body !== 'object') {
    return defaultHttp;
  }

  const obj = body as Record<string, unknown>;
  const nestedError = obj.error && typeof obj.error === 'object'
    ? obj.error as Record<string, unknown>
    : null;
  const rawCode = typeof obj.code === 'string'
    ? obj.code
    : typeof nestedError?.code === 'string'
      ? nestedError.code
      : defaultHttp.code;

  // 1. Kiểm tra từ điển mã lỗi nghiệp vụ
  if (rawCode && BUSINESS_ERROR_TRANSLATIONS[rawCode]) {
    return {
      title: BUSINESS_ERROR_TRANSLATIONS[rawCode].title,
      message: BUSINESS_ERROR_TRANSLATIONS[rawCode].message,
      code: rawCode,
    };
  }

  // 2. Xử lý mảng validation errors từ NestJS (Class Validator)
  if (Array.isArray(obj.message) && obj.message.length > 0) {
    const cleanItems = obj.message.map((m: unknown) => {
      let raw = '';
      if (typeof m === 'string') raw = m;
      else if (m && typeof m === 'object' && 'message' in m && typeof m.message === 'string') {
        raw = m.message;
      } else {
        raw = JSON.stringify(m);
      }
      return translateValidationRule(raw);
    });
    return {
      title: 'Thông tin chưa hợp lệ',
      message: cleanItems.join('. '),
      code: 'VALIDATION_ERROR',
    };
  }

  // 3. Xử lý chi tiết lỗi validation P3 (details: [{ field, message }])
  if (Array.isArray(obj.details) && obj.details.length > 0) {
    const detailList = obj.details
      .map((detail: unknown) => {
        if (!detail || typeof detail !== 'object') return null;
        const item = detail as Record<string, unknown>;
        const raw = typeof item.message === 'string'
          ? item.message
          : typeof item.field === 'string'
            ? item.field
            : null;
        return raw ? translateValidationRule(raw) : null;
      })
      .filter((detail): detail is string => Boolean(detail));
    if (detailList.length > 0) {
      return {
        title: 'Thông tin chưa hợp lệ',
        message: detailList.join('. '),
        code: rawCode || 'VALIDATION_ERROR',
      };
    }
  }

  // 4. Lấy chuỗi message thô nếu có và làm sạch
  const rawMessage = obj.message
    || nestedError?.message
    || (typeof obj.error === 'string' ? obj.error : null);
  if (typeof rawMessage === 'string' && rawMessage.trim()) {
    const trimmed = rawMessage.trim();

    if (BUSINESS_ERROR_TRANSLATIONS[trimmed]) {
      return {
        title: BUSINESS_ERROR_TRANSLATIONS[trimmed].title,
        message: BUSINESS_ERROR_TRANSLATIONS[trimmed].message,
        code: rawCode,
      };
    }

    if (trimmed.toLowerCase() === 'internal server error' || trimmed.toLowerCase() === 'bad request') {
      return defaultHttp;
    }

    return {
      title: defaultHttp.title,
      message: translateValidationRule(trimmed),
      code: rawCode || defaultHttp.code,
    };
  }

  return defaultHttp;
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let body: unknown = null;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (response.ok) {
    if (body && typeof body === 'object' && 'data' in body) {
      const respObj = body as { success?: boolean; data: T; meta?: Record<string, unknown> };
      return {
        success: respObj.success !== undefined ? respObj.success : true,
        data: respObj.data,
        meta: respObj.meta,
      };
    }

    return {
      success: true,
      data: body as T,
    };
  }

  const human = extractHumanErrorMessage(body, response.status);

  return {
    success: false,
    error: {
      code: human.code,
      message: human.message,
      statusCode: response.status,
    },
  };
}
