import { StoreService } from './store.service';

describe('StoreService', () => {
  const mockPrisma = {
    store: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    member: {
      findUnique: jest.fn(),
    },
    business: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const service = new StoreService(mockPrisma as any, mockEventEmitter as any);

  beforeEach(() => jest.clearAllMocks());

  describe('getStoreById', () => {
    it('should return store when found', async () => {
      const mockStore = { id: 'store-1', name: 'Test Store', slug: 'test-store' };
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      const result = await service.getStoreById('store-1');

      expect(result).toEqual(mockStore);
      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        include: { business: { select: { id: true, name: true, status: true } } },
      });
    });

    it('should throw NotFound when store not found', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.getStoreById('non-existent')).rejects.toThrow();
    });
  });

  describe('getStoreBySlug', () => {
    it('should return store by slug', async () => {
      const mockStore = { id: 'store-1', name: 'Test Store', slug: 'test-store' };
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      const result = await service.getStoreBySlug('test-store');

      expect(result).toEqual(mockStore);
      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-store' },
        include: { business: { select: { id: true, name: true, status: true } } },
      });
    });
  });

  describe('getStoresByBusiness', () => {
    it('should return stores for business member', async () => {
      const mockStores = [{ id: 'store-1', name: 'Store 1' }, { id: 'store-2', name: 'Store 2' }];
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' });
      mockPrisma.store.findMany.mockResolvedValue(mockStores);

      const result = await service.getStoresByBusiness('business-1', 'user-1');

      expect(result).toEqual(mockStores);
    });

    it('should verify permission check is called', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      mockPrisma.store.findMany.mockResolvedValue([]);

      await service.getStoresByBusiness('business-1', 'user-1');

      expect(mockPrisma.member.findUnique).toHaveBeenCalled();
    });
  });

  describe('getAllStores', () => {
    it('should return paginated stores', async () => {
      const mockStores = [{ id: 'store-1', name: 'Store 1' }];
      mockPrisma.store.findMany.mockResolvedValue(mockStores);
      mockPrisma.store.count.mockResolvedValue(1);

      const result = await service.getAllStores({ page: 1, limit: 20 });

      expect(result.data).toEqual(mockStores);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      mockPrisma.store.findMany.mockResolvedValue([]);
      mockPrisma.store.count.mockResolvedValue(0);

      await service.getAllStores({ status: 'APPROVED' as any, page: 1, limit: 20 });

      expect(mockPrisma.store.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });
  });

  describe('approveStore', () => {
    it('should approve store', async () => {
      const mockStore = { id: 'store-1', status: 'APPROVED' };
      mockPrisma.store.update.mockResolvedValue(mockStore);

      const result = await service.approveStore('store-1', 'admin-1');

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { status: 'APPROVED' },
      });
    });
  });

  describe('rejectStore', () => {
    it('should reject store', async () => {
      const mockStore = { id: 'store-1', status: 'REJECTED' };
      mockPrisma.store.update.mockResolvedValue(mockStore);

      const result = await service.rejectStore('store-1', 'admin-1');

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('suspendStore', () => {
    it('should suspend store', async () => {
      const mockStore = { id: 'store-1', status: 'SUSPENDED' };
      mockPrisma.store.update.mockResolvedValue(mockStore);

      const result = await service.suspendStore('store-1');

      expect(result.status).toBe('SUSPENDED');
    });
  });
});
