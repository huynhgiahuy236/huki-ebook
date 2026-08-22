import { FirebaseMessagingService } from "./firebase-messaging.service";

describe("FirebaseMessagingService", () => {
  it("stays disabled for placeholder local credentials", async () => {
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            "firebase.projectId": "your-project-id",
            "firebase.clientEmail": "your-client-email",
            "firebase.privateKey": "your-private-key",
          })[key],
      ),
    };
    const service = new FirebaseMessagingService(config as any);
    await expect(
      service.send(["device-token"], {
        title: "Title",
        body: "Body",
        data: {},
      }),
    ).resolves.toEqual([]);
  });
});
