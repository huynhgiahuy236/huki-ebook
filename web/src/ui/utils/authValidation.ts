import { z } from 'zod';

/**
 * Regex kiểm tra số điện thoại chuẩn các nhà mạng Việt Nam:
 * - Viettel: 086, 096, 097, 098, 032, 033, 034, 035, 036, 037, 038, 039
 * - Vinaphone: 088, 091, 094, 081, 082, 083, 084, 085
 * - Mobifone: 089, 090, 093, 070, 079, 077, 076, 078
 * - Vietnamobile: 092, 056, 058
 * - Gmobile: 099, 059
 * - Itelecom: 087
 * - Wintel: 055
 * - FPT: 0775
 */
export const VN_PHONE_REGEX = /^(03[2-9]|05[25689]|07[06-9]|08[1-9]|09[0-9])[0-9]{7}$/;

/**
 * Regex kiểm tra độ mạnh mật khẩu chuẩn quốc tế:
 * Tối thiểu 8 ký tự, ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,}$/;

/**
 * Schema Validation cho Đăng ký tài khoản mới
 */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập họ và tên.')
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
      .max(60, 'Họ và tên không được vượt quá 60 ký tự.'),
    email: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập địa chỉ email.')
      .email('Email không đúng định dạng (VD: name@domain.com).'),
    phone: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập số điện thoại.')
      .regex(
        VN_PHONE_REGEX,
        'Số điện thoại không hợp lệ (gồm 10 số nhà mạng VN).',
      ),
    password: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu.')
      .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự.')
      .regex(
        PASSWORD_REGEX,
        'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt.',
      ),
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng nhập lại mật khẩu.'),
    agreeTerms: z
      .boolean()
      .refine((val) => val === true, 'Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Schema Validation cho Đăng nhập
 */
export const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập Email hoặc Số điện thoại')
    .refine(
      (val) => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const isPhone = VN_PHONE_REGEX.test(val.replace(/\s+/g, ''));
        return isEmail || isPhone;
      },
      {
        message: 'Vui lòng nhập đúng định dạng Email (name@domain.com) hoặc Số điện thoại Việt Nam 10 số',
      },
    ),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Schema Validation cho Quên mật khẩu
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email không được để trống')
    .email('Email không đúng định dạng (Ví dụ: name@domain.com)'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema Validation cho Đặt lại mật khẩu mới (Reset Password)
 */
export const resetPasswordSchema = z
  .object({
    otp: z
      .string()
      .trim()
      .min(1, 'Mã xác thực OTP không được để trống')
      .regex(/^\d{6}$/, 'Mã OTP phải gồm chính xác 6 chữ số'),
    newPassword: z
      .string()
      .min(1, 'Mật khẩu mới không được để trống')
      .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự')
      .regex(
        PASSWORD_REGEX,
        'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (VD: HuKi@2026)',
      ),
    confirmNewPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Mật khẩu xác nhận không khớp với mật khẩu mới',
    path: ['confirmNewPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
