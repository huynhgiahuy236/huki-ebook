import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, unknown>;
}

@Injectable()
export class FirebaseMessagingService {
  private readonly logger = new Logger(FirebaseMessagingService.name);
  private readonly messaging?: Messaging;

  constructor(config: ConfigService) {
    const projectId = config.get<string>("firebase.projectId");
    const clientEmail = config.get<string>("firebase.clientEmail");
    const privateKey = config
      .get<string>("firebase.privateKey")
      ?.replace(/\\n/g, "\n");
    if (
      !projectId ||
      !clientEmail ||
      !privateKey ||
      [projectId, clientEmail, privateKey].some((value) =>
        this.isPlaceholder(value),
      )
    ) {
      this.logger.log(
        "Firebase credentials are not configured; push delivery is disabled",
      );
      return;
    }
    try {
      const name = "huki-community-notifications";
      const app: App =
        getApps().find((candidate) => candidate.name === name) ??
        initializeApp(
          { credential: cert({ projectId, clientEmail, privateKey }) },
          name,
        );
      this.messaging = getMessaging(app);
    } catch (error) {
      this.logger.error(
        `Firebase initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async send(tokens: string[], message: PushMessage): Promise<string[]> {
    if (!this.messaging || !tokens.length) return [];
    const invalid = new Set<string>();
    for (let offset = 0; offset < tokens.length; offset += 500) {
      const batch = tokens.slice(offset, offset + 500);
      try {
        const result = await this.messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title: message.title, body: message.body },
          data: this.stringData(message.data),
          android: { priority: "high", notification: { sound: "default" } },
          apns: { payload: { aps: { sound: "default" } } },
        });
        result.responses.forEach((response, index) => {
          const code = response.error?.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            invalid.add(batch[index]);
          }
        });
      } catch (error) {
        this.logger.warn(
          `FCM delivery failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return [...invalid];
  }

  private stringData(data: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
    );
  }

  private isPlaceholder(value: string) {
    const normalized = value.toLowerCase();
    return (
      normalized.startsWith("your-") ||
      normalized === "xxx" ||
      normalized.includes("replace-with")
    );
  }
}
