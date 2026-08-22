import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { CommunityActor } from "../../common/community-auth.guard";

type AuthenticatedSocket = Socket & { data: { actor?: CommunityActor } };

@WebSocketGateway({
  namespace: "/notifications",
  cors: { origin: process.env.SOCKET_CORS_ORIGIN ?? "*" },
})
export class NotificationGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  private server?: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const authToken = client.handshake.auth?.token;
      const [type, headerToken] =
        client.handshake.headers.authorization?.split(" ") ?? [];
      const token =
        typeof authToken === "string" && authToken
          ? authToken
          : type === "Bearer"
            ? headerToken
            : undefined;
      if (!token) throw new Error("Bearer token is required");
      const actor = await this.jwt.verifyAsync<CommunityActor>(token);
      if (!actor.sub) throw new Error("Invalid access token");
      client.data.actor = actor;
      await client.join(this.room(actor.sub));
    } catch (error) {
      this.logger.warn(
        `Notification socket authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.disconnect(true);
    }
  }

  notification(recipientId: string, data: Record<string, unknown>) {
    this.server?.to(this.room(recipientId)).emit("notification", data);
  }

  read(recipientId: string, notificationId: string) {
    this.server
      ?.to(this.room(recipientId))
      .emit("notification_read", { notificationId });
  }

  readAll(recipientId: string) {
    this.server
      ?.to(this.room(recipientId))
      .emit("notification_read_all", { unreadCount: 0 });
  }

  private room(recipientId: string) {
    return `user:${recipientId}`;
  }
}
