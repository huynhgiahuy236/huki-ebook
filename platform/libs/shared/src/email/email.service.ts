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
    return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
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
