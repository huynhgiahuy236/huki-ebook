import { BannersService } from './banners.service';
import { BannerScope } from './dto/banner.dto';

describe('BannersService', () => {
  const mockPrisma = {
    banner: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new BannersService(mockPrisma as any);

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create banner with default values', async () => {
      const dto = {
        title: 'Summer Banner',
        image: 'https://example.com/banner.jpg',
        link: 'https://example.com/promo',
      };

      mockPrisma.banner.create.mockResolvedValue({ id: 'banner-1', ...dto, isActive: true });

      const result = await service.create(dto);

      expect(result.id).toBe('banner-1');
      expect(mockPrisma.banner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Summer Banner',
          isActive: true,
          position: 0,
          scope: BannerScope.HOMEPAGE,
        }),
      });
    });

    it('should create banner with custom scope', async () => {
      const dto = {
        title: 'Store Banner',
        image: 'https://example.com/store.jpg',
        scope: BannerScope.STORE,
        storeId: 'store-1',
      };

      mockPrisma.banner.create.mockResolvedValue({ id: 'banner-1', ...dto });

      const result = await service.create(dto);

      expect(result.storeId).toBe('store-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated banners', async () => {
      const mockBanners = [{ id: 'banner-1', title: 'Banner 1' }, { id: 'banner-2', title: 'Banner 2' }];
      mockPrisma.$transaction = jest.fn().mockResolvedValue([mockBanners, 2]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toEqual(mockBanners);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by active status', async () => {
      mockPrisma.$transaction = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll({ isActive: true, page: 1, limit: 20 });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return banner when found', async () => {
      const mockBanner = { id: 'banner-1', title: 'Test Banner' };
      mockPrisma.banner.findUnique.mockResolvedValue(mockBanner);

      const result = await service.findOne('banner-1');

      expect(result).toEqual(mockBanner);
    });

    it('should throw NotFound when banner not found', async () => {
      mockPrisma.banner.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update banner fields', async () => {
      const mockBanner = { id: 'banner-1', title: 'Old Title' };
      const updatedBanner = { id: 'banner-1', title: 'New Title' };

      mockPrisma.banner.findUnique.mockResolvedValue(mockBanner);
      mockPrisma.banner.update.mockResolvedValue(updatedBanner);

      const result = await service.update('banner-1', { title: 'New Title' });

      expect(result.title).toBe('New Title');
    });

    it('should throw NotFound when updating non-existent banner', async () => {
      mockPrisma.banner.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'New' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete banner', async () => {
      mockPrisma.banner.findUnique.mockResolvedValue({ id: 'banner-1' });
      mockPrisma.banner.delete.mockResolvedValue({ id: 'banner-1' });

      const result = await service.delete('banner-1');

      expect(result.success).toBe(true);
    });

    it('should throw NotFound when deleting non-existent banner', async () => {
      mockPrisma.banner.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow();
    });
  });

  describe('getActiveBanners', () => {
    it('should return active banners', async () => {
      const mockBanners = [
        { id: 'banner-1', title: 'Banner 1', isActive: true },
        { id: 'banner-2', title: 'Banner 2', isActive: true },
      ];
      mockPrisma.banner.findMany.mockResolvedValue(mockBanners);

      const result = await service.getActiveBanners();

      expect(result).toEqual(mockBanners);
      expect(mockPrisma.banner.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { startDate: null, endDate: null },
            {
              startDate: { lte: expect.any(Date) },
              endDate: { gte: expect.any(Date) },
            },
          ],
        },
        orderBy: { position: 'asc' },
      });
    });

    it('should filter by scope', async () => {
      mockPrisma.banner.findMany.mockResolvedValue([]);

      await service.getActiveBanners(BannerScope.HOMEPAGE);

      expect(mockPrisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scope: BannerScope.HOMEPAGE }),
        }),
      );
    });

    it('should filter by storeId', async () => {
      mockPrisma.banner.findMany.mockResolvedValue([]);

      await service.getActiveBanners(undefined, 'store-1');

      expect(mockPrisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ storeId: 'store-1' }),
        }),
      );
    });
  });
});
