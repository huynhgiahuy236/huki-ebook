export interface OrderConfirmationItem {
  title: string;
  quantity: number;
  price: number | string;
}

export interface OrderConfirmationInput {
  to: string;
  orderCode: string;
  orderId?: string;
  customerName?: string;
  totalAmount: number | string;
  items?: OrderConfirmationItem[];
  shippingAddress?: string;
}

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  sendVerificationEmail(to: string, token: string) {
    const url = this.frontendUrl("/verify-email", token);
    return this.send({
      to,
      subject: "Verify your HUKI EBOOK email",
      text: `Verify your email by opening this link: ${url}`,
      html: this.template(
        "Verify your email",
        "Confirm your email address to activate your HUKI EBOOK account.",
        "Verify email",
        url,
      ),
    });
  }

  sendPasswordResetEmail(to: string, token: string) {
    const url = this.frontendUrl("/reset-password", token);
    return this.send({
      to,
      subject: "Reset your HUKI EBOOK password",
      text: `Reset your password by opening this link: ${url}`,
      html: this.template(
        "Reset your password",
        "This link expires in one hour. Ignore this email if you did not request a reset.",
        "Reset password",
        url,
      ),
    });
  }

    sendOrderConfirmationEmail(input: OrderConfirmationInput) {
    const formattedTotal = Number(input.totalAmount).toLocaleString('vi-VN') + ' đ';
    const orderUrl = this.frontendUrl('/orders/' + (input.orderId || input.orderCode), '');

    const itemsHtml = (input.items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155;">${item.title}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">x${item.quantity}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #0f172a;">${Number(item.price).toLocaleString('vi-VN')} đ</td>
        </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; }
    .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
    .logo { font-size: 22px; font-weight: 800; color: #4f46e5; }
    .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 8px; }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; font-weight: 600; padding: 4px 12px; border-radius: 9999px; font-size: 12px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .table th { text-align: left; padding: 8px 0; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; }
    .total-box { background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; text-align: center; margin-top: 16px; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">HUKI EBOOK</div>
      <div class="title">Xác nhận đơn hàng thành công</div>
      <span class="badge">Mã đơn: #${input.orderCode}</span>
    </div>
    <p style="margin-top: 20px; font-size: 15px; color: #334155;">
      Xin chào <strong>${input.customerName || 'Quý khách'}</strong>,<br>
      Cảm ơn bạn đã mua sắm tại HUKI EBOOK! Đơn hàng của bạn đã được tiếp nhận và đang được xử lý.
    </p>
    ${
      input.items && input.items.length
        ? `<table class="table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th style="text-align: center;">SL</th>
                <th style="text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>`
        : ''
    }
    <div class="total-box">
      <span style="font-size: 15px; font-weight: 600; color: #334155;">Tổng thanh toán:</span>
      <span style="font-size: 18px; font-weight: 800; color: #4f46e5;">${formattedTotal}</span>
    </div>
    ${
      input.shippingAddress
        ? `<p style="font-size: 13px; color: #64748b; margin: 12px 0;"><strong>Địa chỉ giao hàng:</strong> ${input.shippingAddress}</p>`
        : ''
    }
    <div style="text-align: center;">
      <a href="${orderUrl}" class="btn">Xem chi tiết đơn hàng</a>
    </div>
    <div class="footer">
      Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ support@huki.vn.<br>
      © 2026 HUKI EBOOK Platform. All rights reserved.
    </div>
  </div>
</body>
</html>`;

    return this.send({
      to: input.to,
      subject: `[HUKI EBOOK] Xác nhận đơn hàng #${input.orderCode}`,
      text: `Xin chào ${input.customerName || 'Quý khách'},\n\nĐơn hàng #${input.orderCode} của bạn đã được tạo thành công.\nTổng thanh toán: ${formattedTotal}\nXem chi tiết đơn hàng tại: ${orderUrl}\n\nCảm ơn bạn đã tin tưởng HUKI EBOOK!`,
      html,
    });
  }

  sendInvitationEmail(to: string, token: string) {
    const url = this.frontendUrl("/invitations/accept", token);
    return this.send({
      to,
      subject: "You are invited to a HUKI EBOOK business",
      text: `Accept the invitation by opening this link: ${url}`,
      html: this.template(
        "Business invitation",
        "You have been invited to join a business on HUKI EBOOK.",
        "Accept invitation",
        url,
      ),
    });
  }

  private frontendUrl(path: string, token: string) {
    const baseUrl = (
      this.config.get<string>("FRONTEND_URL") || "http://localhost:3000"
    ).replace(/\/$/, "");
    return token ? `${baseUrl}${path}?token=${encodeURIComponent(token)}` : `${baseUrl}${path}`;
  }

  private async send(input: SendEmailInput): Promise<void> {
    const apiKey = this.config.get<string>("SENDGRID_API_KEY");
    const from = this.config.get<string>("SENDGRID_FROM_EMAIL");
    const production = this.config.get<string>("NODE_ENV") === "production";
    const configured = apiKey && from && !apiKey.startsWith("your-");

    if (!configured) {
      if (production) {
        throw new ServiceUnavailableException(
          "Email delivery is not configured",
        );
      }
      this.logger.warn(
        `Email delivery skipped in non-production for ${input.to}`,
      );
      return;
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: from },
        subject: input.subject,
        content: [
          { type: "text/plain", value: input.text },
          { type: "text/html", value: input.html },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      this.logger.error(
        `SendGrid rejected email (${response.status}): ${detail}`,
      );
      throw new ServiceUnavailableException("Email delivery failed");
    }
  }

  private template(
    title: string,
    message: string,
    action: string,
    url: string,
  ) {
    return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033"><h1>${title}</h1><p>${message}</p><p><a href="${url}" style="background:#4f46e5;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">${action}</a></p><p>If the button does not work, open:<br>${url}</p></body></html>`;
  }
}
