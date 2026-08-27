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
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const service = new BusinessService(mockPrisma as any, mockEventEmitter as any);

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
});
