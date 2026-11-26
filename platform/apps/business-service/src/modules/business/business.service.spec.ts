import { BusinessService } from './business.service';

describe('BusinessService', () => {
  const mockPrisma = {
    business: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    member: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    store: {
      updateMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockIdentity = {
    setBusinessRole: jest.fn(),
    getProfiles: jest.fn().mockResolvedValue([]),
  };

  const service = new BusinessService(mockPrisma as any, mockEventEmitter as any, mockIdentity as any);

  beforeEach(() => jest.clearAllMocks());

  describe('getBusinessById', () => {
    it('should return business when found', async () => {
      const mockBusiness = { id: 'business-1', name: 'Test Business', ownerId: 'user-1' };
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);

      const result = await service.getBusinessById('business-1');

      expect(result).toEqual(mockBusiness);
    });

    it('should throw NotFound when business not found', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(service.getBusinessById('non-existent')).rejects.toThrow();
    });
  });

  describe('getAllBusinesses', () => {
    it('should return paginated businesses', async () => {
      const mockBusinesses = [{ id: 'business-1', name: 'Business 1' }];
      mockPrisma.business.findMany.mockResolvedValue(mockBusinesses);
      mockPrisma.business.count.mockResolvedValue(1);

      const result = await service.getAllBusinesses({ page: 1, limit: 20 });

      expect(result.data).toEqual(mockBusinesses);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by search term', async () => {
      mockPrisma.business.findMany.mockResolvedValue([]);
      mockPrisma.business.count.mockResolvedValue(0);

      await service.getAllBusinesses({ search: 'test', page: 1, limit: 20 });

      expect(mockPrisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('updateBusiness', () => {
    it('should update business when user is owner', async () => {
      const mockBusiness = { id: 'business-1', ownerId: 'user-1' };
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.business.update.mockResolvedValue({ ...mockBusiness, name: 'Updated Name' });

      const result = await service.updateBusiness('business-1', 'user-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw when non-owner tries to update', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ id: 'business-1', ownerId: 'owner-id' });

      await expect(
        service.updateBusiness('business-1', 'other-user', { name: 'New Name' }),
      ).rejects.toThrow();
    });
  });

  describe('approveBusiness', () => {
    it('should approve business with valid tax code', async () => {
      const mockBusiness = {
        id: 'business-1',
        status: 'PENDING_APPROVAL',
        taxCode: '123456789',
        ownerId: 'user-1',
      };
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.business.update.mockResolvedValue({ ...mockBusiness, status: 'APPROVED' });

      const result = await service.approveBusiness('business-1', 'admin-1');

      expect(result.status).toBe('APPROVED');
    });

    it('should throw when business not in pending status', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'business-1',
        status: 'APPROVED',
        taxCode: '123456789',
      });

      await expect(service.approveBusiness('business-1', 'admin-1')).rejects.toThrow();
    });
  });

  describe('rejectBusiness', () => {
    it('should reject business', async () => {
      mockPrisma.business.update.mockResolvedValue({ id: 'business-1', status: 'REJECTED' });

      const result = await service.rejectBusiness('business-1', 'admin-1', 'Invalid info');

      expect(result.status).toBe('REJECTED');
      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: 'business-1' },
        data: {
          status: 'REJECTED',
          rejectedAt: expect.any(Date),
          rejectedBy: 'admin-1',
          rejectionReason: 'Invalid info',
        },
      });
    });
  });

  describe('suspendBusiness', () => {
    it('should suspend business', async () => {
      mockPrisma.business.update.mockResolvedValue({ id: 'business-1', status: 'SUSPENDED' });

      const result = await service.suspendBusiness('business-1');

      expect(result.status).toBe('SUSPENDED');
    });
  });

  describe('isBusinessMember', () => {
    it('should return true for active member with allowed role', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' });

      const result = await service.isBusinessMember('business-1', 'user-1', ['OWNER']);

      expect(result).toBe(true);
    });

    it('should return false for inactive member', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'OWNER', status: 'INACTIVE' });

      const result = await service.isBusinessMember('business-1', 'user-1', ['OWNER']);

      expect(result).toBe(false);
    });

    it('should return false for non-member', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);

      const result = await service.isBusinessMember('business-1', 'user-1', ['OWNER']);

      expect(result).toBe(false);
    });
  });

  describe('withFlattenedStoreAssets (BUG-042)', () => {
    it('flattens logo/banner from stores[0] and strips dead blob: URLs in getAllBusinesses', async () => {
      mockPrisma.business.findMany.mockResolvedValue([
        {
          id: 'biz-1',
          name: 'HuKi Store',
          stores: [
            {
              id: 'store-1',
              name: 'HuKi Official',
              slug: 'huki-official',
              logo: 'https://cdn.example.com/logo.webp',
              banner: 'blob:https://huki-uat.duckdns.org/dead-uuid',
            },
          ],
        },
      ]);
      mockPrisma.business.count.mockResolvedValue(1);

      const res = await service.getAllBusinesses({ page: 1, limit: 20 });
      expect(res.data[0].logo).toBe('https://cdn.example.com/logo.webp');
      expect(res.data[0].banner).toBeNull();
      expect(res.data[0].stores[0].banner).toBeNull();
    });
  });

  describe('Business Update Request OTP + Snapshot + Outbox (BUG-14, BUG-15, BUG-16)', () => {
    it('sends 6-digit OTP via EmailService, rejects wrong OTP, accepts valid OTP once, captures snapshot & outbox event', async () => {
      const sendEmailMock = jest.fn().mockResolvedValue(undefined);
      const addToOutboxMock = jest.fn().mockResolvedValue(undefined);
      const mockAuditRecords: any[] = [];

      const otpPrisma: any = {
        ...mockPrisma,
        business: {
          ...mockPrisma.business,
          findFirst: jest.fn().mockResolvedValue({
            id: 'biz-otp-1',
            ownerId: 'seller-u1',
            name: 'Nhà Sách HuKi Official',
            email: 'seller@huki.com',
            phone: '0901234567',
            taxCode: '0123456789',
            businessType: 'INDIVIDUAL',
            address: '["TP. Hồ Chí Minh"]',
            stores: [{ id: 'st-1', name: 'Nhà Sách HuKi Official', description: 'Shop chính hãng' }],
          }),
        },
        businessUpdateRequest: {
          findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
            if (where?.status === 'APPROVED') {
              return {
                id: 'req-prev-1',
                requestedData: { repName: 'Nguyễn Phương Thúy (Nhà Sách HuKi)' },
              };
            }
            return null;
          }),
          create: jest.fn().mockImplementation(async ({ data }: any) => ({
            id: 'req-new-1',
            businessId: data.businessId,
            requestedBy: data.requestedBy,
            requestedData: data.requestedData,
            status: 'PENDING',
            createdAt: new Date(),
          })),
        },
        auditLog: {
          findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
            return (
              mockAuditRecords.find(
                (r) =>
                  r.resource === where.resource &&
                  r.action === where.action &&
                  r.resourceId === where.resourceId,
              ) || null
            );
          }),
          create: jest.fn().mockImplementation(async ({ data }: any) => {
            const row = { ...data, createdAt: new Date() };
            mockAuditRecords.push(row);
            return row;
          }),
        },
      };

      const svc = new BusinessService(
        otpPrisma,
        mockEventEmitter as any,
        mockIdentity as any,
        undefined,
        { addToOutbox: addToOutboxMock } as any,
        { sendBusinessUpdateOtpEmail: sendEmailMock } as any,
      );

      const otpChallenge = await svc.sendUpdateRequestOtp('seller-u1', 'seller@huki.com');
      expect(sendEmailMock).toHaveBeenCalledWith(
        'seller@huki.com',
        expect.stringMatching(/^\d{6}$/),
        'Nhà Sách HuKi Official',
      );
      const sentOtpCode = sendEmailMock.mock.calls[0][1];

      // Wrong OTP must throw
      await expect(
        svc.createUpdateRequest('seller-u1', {
          repName: 'Nguyễn Phương Thùy (Nhà Sách HuKi)',
          otpCode: '000000',
          otpToken: otpChallenge!.otpToken,
        }),
      ).rejects.toThrow();

      // Valid OTP creates request with snapshot & emits outbox event
      const created = await svc.createUpdateRequest('seller-u1', {
        repName: 'Nguyễn Phương Thùy (Nhà Sách HuKi)',
        otpCode: sentOtpCode,
        otpToken: otpChallenge!.otpToken,
      });

      expect(created.currentSnapshot.repName).toBe('Nguyễn Phương Thúy (Nhà Sách HuKi)');
      expect(created.changedFields).toContain('Người đại diện / Chủ hộ');
      expect(addToOutboxMock).toHaveBeenCalledWith(
        'business.update_requested',
        'req-new-1',
        expect.objectContaining({
          businessId: 'biz-otp-1',
          changedFields: expect.arrayContaining(['Người đại diện / Chủ hộ']),
        }),
      );

      // Replay with same OTP must be rejected
      await expect(
        svc.createUpdateRequest('seller-u1', {
          repName: 'Nguyễn Phương Thùy (Nhà Sách HuKi)',
          otpCode: sentOtpCode,
          otpToken: otpChallenge!.otpToken,
        }),
      ).rejects.toThrow();
    });
  });
});
