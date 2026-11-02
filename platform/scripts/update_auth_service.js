const fs = require('fs');
const path = require('path');

const authServicePath = path.resolve(__dirname, '../apps/identity-service/src/modules/auth/auth.service.ts');
let content = fs.readFileSync(authServicePath, 'utf8');

// 1. Update register logic for PENDING_DELETION and DELETED
const oldRegisterCheck = `    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.status === UserStatus.DELETED || existingUser.deletedAt) {
        // Tài khoản cũ đã bị xóa: giải phóng email cũ để cho phép đăng ký mới
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: 'deleted_' + Date.now() + '_' + existingUser.id.substring(0, 8) + '_' + existingUser.email,
            fullName: 'Người dùng đã xóa',
            phone: null,
            avatar: null,
          },
        });
      } else if (existingUser.status !== UserStatus.PENDING) {
        throwConflict(ErrorCode.AUTH_EMAIL_EXISTS);
      }

      // Tài khoản đang ở trạng thái PENDING (chưa kích hoạt OTP) -> cho phép đăng ký lại / cập nhật OTP mới`;

const newRegisterCheck = `    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.status === UserStatus.PENDING_DELETION) {
        throwBadRequest(
          ErrorCode.AUTH_EMAIL_EXISTS,
          'Email này đang thuộc một tài khoản đang trong thời gian chờ xóa (7 ngày). Hệ thống không cho phép tạo tài khoản mới. Vui lòng đăng nhập để Hủy yêu cầu xóa hoặc khôi phục tài khoản.',
        );
      }

      if (existingUser.status === UserStatus.DELETED || existingUser.deletedAt) {
        // Tài khoản cũ đã bị xóa: giải phóng email cũ và lưu originalEmail để cho phép đăng ký mới với dữ liệu clean 100%
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: 'deleted_' + Date.now() + '_' + existingUser.id.substring(0, 8) + '_' + existingUser.email,
            originalEmail: existingUser.originalEmail || email,
            fullName: 'Người dùng đã xóa',
            phone: null,
            avatar: null,
          },
        });
        // Không return ở đây mà tiếp tục xuống dưới để tạo tài khoản mới tinh từ đầu
      } else if (existingUser.status !== UserStatus.PENDING) {
        throwConflict(ErrorCode.AUTH_EMAIL_EXISTS);
      } else {
        // Tài khoản đang ở trạng thái PENDING (chưa kích hoạt OTP) -> cho phép đăng ký lại / cập nhật OTP mới
        const emailVerificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExpiresAt = new Date(Date.now() + 15 * 60_1000);

        const updatedPendingUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash: await bcrypt.hash(dto.password, 12),
            fullName: dto.fullName,
            phone: dto.phone,
            emailVerificationToken,
            emailVerificationExpiresAt,
          },
        });

        this.logger.log(\`[AUTH OTP] Email verification code for \${updatedPendingUser.email}: \${emailVerificationToken}\`);
        try {
          await this.emailService.sendVerificationEmail(
            updatedPendingUser.email,
            emailVerificationToken,
          );
        } catch (err: any) {
          this.logger.warn(\`Could not send verification email to \${updatedPendingUser.email}: \${err?.message || err}\`);
        }

        return {
          user: this.sanitizeUser(updatedPendingUser),
          message: "Đăng ký thành công. Vui lòng kiểm tra email để nhận mã xác thực OTP.",
          requiresVerification: true,
        };
      }
    }`;

// Replace the block up to `return {`
const oldBlockToReplace = `    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.status === UserStatus.DELETED || existingUser.deletedAt) {
        // Tài khoản cũ đã bị xóa: giải phóng email cũ để cho phép đăng ký mới
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: 'deleted_' + Date.now() + '_' + existingUser.id.substring(0, 8) + '_' + existingUser.email,
            fullName: 'Người dùng đã xóa',
            phone: null,
            avatar: null,
          },
        });
      } else if (existingUser.status !== UserStatus.PENDING) {
        throwConflict(ErrorCode.AUTH_EMAIL_EXISTS);
      }

      // Tài khoản đang ở trạng thái PENDING (chưa kích hoạt OTP) -> cho phép đăng ký lại / cập nhật OTP mới
      const emailVerificationToken = Math.floor(100000 + Math.random() * 900000).toString();
      const emailVerificationExpiresAt = new Date(Date.now() + 15 * 60_1000);

      const updatedPendingUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: await bcrypt.hash(dto.password, 12),
          fullName: dto.fullName,
          phone: dto.phone,
          emailVerificationToken,
          emailVerificationExpiresAt,
        },
      });

      this.logger.log(\`[AUTH OTP] Email verification code for \${updatedPendingUser.email}: \${emailVerificationToken}\`);
      try {
        await this.emailService.sendVerificationEmail(
          updatedPendingUser.email,
          emailVerificationToken,
        );
      } catch (err: any) {
        this.logger.warn(\`Could not send verification email to \${updatedPendingUser.email}: \${err?.message || err}\`);
      }

      return {
        user: this.sanitizeUser(updatedPendingUser),
        message: "Đăng ký thành công. Vui lòng kiểm tra email để nhận mã xác thực OTP.",
        requiresVerification: true,
      };
    }`;

content = content.replace(oldBlockToReplace, newRegisterCheck);

// 2. Update validateUser to allow PENDING_DELETION
const oldValidateUser = `  async validateUser(userId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null },
    });
  }`;

const newValidateUser = `  async validateUser(userId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_DELETION] },
        deletedAt: null,
      },
    });
  }`;

content = content.replace(oldValidateUser, newValidateUser);

// 3. Update sanitizeUser to include deletion status fields
const oldSanitizeUser = `  private sanitizeUser(user: User) {
    const isMustChangePassword = Boolean(
      (user as any).mustChangePassword === true ||
      (user as any).must_change_password === true
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      emailVerified: Boolean(user.emailVerifiedAt),
      mustChangePassword: isMustChangePassword,
      hasCompletedOnboarding: Boolean((user as any).hasCompletedOnboarding),
      createdAt: user.createdAt,
    };
  }`;

const newSanitizeUser = `  private sanitizeUser(user: User) {
    const isMustChangePassword = Boolean(
      (user as any).mustChangePassword === true ||
      (user as any).must_change_password === true
    );

    const remainingDays =
      user.status === UserStatus.PENDING_DELETION && (user as any).deletionScheduledAt
        ? Math.max(0, Math.ceil((new Date((user as any).deletionScheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      deletionScheduledAt: (user as any).deletionScheduledAt || null,
      deletionRequestedAt: (user as any).deletionRequestedAt || null,
      deletionCount: (user as any).deletionCount || 0,
      remainingDays,
      avatar: user.avatar,
      emailVerified: Boolean(user.emailVerifiedAt),
      mustChangePassword: isMustChangePassword,
      hasCompletedOnboarding: Boolean((user as any).hasCompletedOnboarding),
      createdAt: user.createdAt,
    };
  }`;

content = content.replace(oldSanitizeUser, newSanitizeUser);

fs.writeFileSync(authServicePath, content, 'utf8');
console.log('Successfully updated auth.service.ts');

