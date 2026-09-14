import { MemberService } from "./member.service";

describe("MemberService", () => {
  const mockPrisma = {
    business: {
      findFirst: jest.fn().mockImplementation(({ where }: any) =>
        where?.ownerId === "owner-1" || where?.id === "business-1" && !where?.ownerId
          ? { id: "business-1", ownerId: "owner-1" }
          : where?.ownerId && where?.ownerId !== "owner-1"
          ? null
          : { id: "business-1", ownerId: "owner-1" }
      ),
      findUnique: jest.fn().mockResolvedValue({ id: "business-1", ownerId: "owner-1" }),
    },
    invitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const email = { sendInvitationEmail: jest.fn() };
  const service = new MemberService(mockPrisma as any, email as any);

  beforeEach(() => jest.clearAllMocks());

  describe("inviteMember", () => {
    it("normalizes the email and sends an invitation link", async () => {
      mockPrisma.member.findUnique.mockResolvedValue({
        role: "OWNER",
        status: "ACTIVE",
      });
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.create.mockResolvedValue({
        id: "invite-1",
        email: "member@example.com",
        token: "invite-token",
        role: "ORDER_STAFF",
        expiresAt: new Date("2026-09-01T00:00:00.000Z"),
      });

      await service.inviteMember("business-1", "owner-1", {
        email: " Member@Example.com ",
        role: "ORDER_STAFF" as any,
      });

      expect(mockPrisma.invitation.create).toHaveBeenCalledWith({
        data: {
          businessId: "business-1",
          email: "member@example.com",
          expiresAt: expect.any(Date),
          invitedBy: "owner-1",
          role: "ORDER_STAFF",
          status: "PENDING",
        },
      });
      expect(email.sendInvitationEmail).toHaveBeenCalledWith(
        "member@example.com",
        "invite-token",
      );
    });
  });

  describe("getMembers", () => {
    it("should return members for business", async () => {
      const mockMembers = [
        { id: "member-1", role: "OWNER", status: "ACTIVE" },
        { id: "member-2", role: "ORDER_STAFF", status: "ACTIVE" },
      ];
      mockPrisma.member.findUnique.mockResolvedValue({
        role: "OWNER",
        status: "ACTIVE",
      });
      mockPrisma.member.findMany.mockResolvedValue(mockMembers);

      const result = await service.getMembers("business-1", "owner-1");

      expect(result.data).toMatchObject(mockMembers);
    });
  });

  describe("getMember", () => {
    it("should return member when found", async () => {
      const mockMember = { id: "member-1", role: "ORDER_STAFF", status: "ACTIVE" };
      mockPrisma.member.findFirst.mockResolvedValue(mockMember);

      const result = await service.getMember("business-1", "member-1");

      expect(result).toMatchObject(mockMember);
    });

    it("should throw NotFound when member not found", async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null);

      await expect(
        service.getMember("business-1", "non-existent"),
      ).rejects.toThrow();
    });
  });

  describe("updateMemberRole", () => {
    it("should update member role when owner makes change", async () => {
      const mockMember = { id: "member-1", role: "ORDER_STAFF", status: "ACTIVE" };
      mockPrisma.member.findUnique.mockResolvedValueOnce({
        role: "OWNER",
        status: "ACTIVE",
      });
      mockPrisma.member.findFirst.mockResolvedValue(mockMember);
      mockPrisma.member.update.mockResolvedValue({
        ...mockMember,
        role: "FINANCE_STAFF",
      });

      const result = await service.updateMemberRole(
        "business-1",
        "member-1",
        "owner-1",
        "FINANCE_STAFF",
      );

      expect(result.role).toBe("FINANCE_STAFF");
    });
  });

  describe("removeMember", () => {
    it("should remove member when owner requests", async () => {
      mockPrisma.member.findUnique.mockResolvedValueOnce({
        role: "OWNER",
        status: "ACTIVE",
      }); // admin
      mockPrisma.member.findFirst.mockResolvedValue({
        id: "member-1",
        role: "MANAGER",
        status: "ACTIVE",
      });
      mockPrisma.member.update.mockResolvedValue({
        id: "member-1",
        deletedAt: new Date(),
      });

      const result = await service.removeMember(
        "business-1",
        "member-1",
        "owner-id",
      );

      expect(mockPrisma.member.update).toHaveBeenCalledWith({
        where: { id: "member-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should throw when trying to remove owner", async () => {
      mockPrisma.member.findUnique.mockResolvedValue({
        role: "OWNER",
        status: "ACTIVE",
      });
      mockPrisma.member.findFirst.mockResolvedValue({
        id: "owner-1",
        role: "OWNER",
      });

      await expect(
        service.removeMember("business-1", "owner-1", "owner-id"),
      ).rejects.toThrow();
    });
  });

  describe("leaveBusiness", () => {
    it("should allow member to leave", async () => {
      mockPrisma.member.findUnique.mockResolvedValue({
        id: "member-1",
        role: "MANAGER",
        status: "ACTIVE",
      });
      mockPrisma.member.update.mockResolvedValue({
        id: "member-1",
        deletedAt: new Date(),
      });

      const result = await service.leaveBusiness("business-1", "user-1");

      expect(mockPrisma.member.update).toHaveBeenCalledWith({
        where: { id: "member-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should throw when owner tries to leave", async () => {
      mockPrisma.member.findUnique.mockResolvedValue({
        id: "owner-1",
        role: "OWNER",
      });

      await expect(
        service.leaveBusiness("business-1", "owner-id"),
      ).rejects.toThrow();
    });
  });
});
