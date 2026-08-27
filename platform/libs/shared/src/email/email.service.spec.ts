import { ServiceUnavailableException } from "@nestjs/common";
import { EmailService } from "./email.service";

describe("EmailService", () => {
  const values: Record<string, string | undefined> = {
    SENDGRID_API_KEY: "SG.test",
    SENDGRID_FROM_EMAIL: "noreply@huki.test",
    FRONTEND_URL: "https://app.huki.test/",
    NODE_ENV: "test",
  };
  const config = { get: jest.fn((key: string) => values[key]) };
  const service = new EmailService(config as any);

  beforeEach(() => {
    jest.restoreAllMocks();
    config.get.mockImplementation((key: string) => values[key]);
  });

  it("sends a verification link through SendGrid", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true } as Response);

    await service.sendVerificationEmail("user@example.com", "a token");

    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.sendgrid.com/v3/mail/send",
    );
    expect(body.personalizations[0].to[0].email).toBe("user@example.com");
    expect(body.content[0].value).toContain(
      "https://app.huki.test/verify-email?token=a%20token",
    );
  });

  it("fails closed when production email configuration is missing", async () => {
    config.get.mockImplementation((key: string) =>
      key === "NODE_ENV" ? "production" : undefined,
    );

    await expect(
      service.sendPasswordResetEmail("user@example.com", "token"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
