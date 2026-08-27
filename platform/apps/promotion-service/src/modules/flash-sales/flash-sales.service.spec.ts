import { FlashSalesService } from './flash-sales.service';
import { FlashSaleStatus } from './dto/flash-sale.dto';

describe('FlashSalesService', () => {
  const mockPrisma = {
    flashSale: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    flashSaleItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new FlashSalesService(mockPrisma as any);

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create flash sale with valid dates', async () => {
      const dto = {
        name: 'Summer Sale',
        description: 'Great discounts',
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 86400000).toISOString(),
      };

      mockPrisma.flashSale.create.mockResolvedValue({ id: 'flash-1', ...dto, status: 'ACTIVE' });

      const result = await service.create(dto);

      expect(result.id).toBe('flash-1');
    });

    it('should throw when endsAt before startsAt', async () => {
      const dto = {
        name: 'Invalid Sale',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date().toISOString(),
      };

      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated flash sales', async () => {
      const mockSales = [{ id: 'flash-1', name: 'Sale 1' }, { id: 'flash-2', name: 'Sale 2' }];
      mockPrisma.$transaction.mockResolvedValue([mockSales, 2]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toEqual(mockSales);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return flash sale with items', async () => {
      const mockSale = { id: 'flash-1', name: 'Sale', items: [{ id: 'item-1' }] };
      mockPrisma.flashSale.findUnique.mockResolvedValue(mockSale);

      const result = await service.findOne('flash-1');

      expect(result).toEqual(mockSale);
      expect(mockPrisma.flashSale.findUnique).toHaveBeenCalledWith({
        where: { id: 'flash-1' },
        include: { items: true },
      });
    });

    it('should throw NotFound when flash sale not found', async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow();
    });
  });

  describe('addItem', () => {
    it('should add item to flash sale', async () => {
      const dto = {
        flashSaleId: 'flash-1',
        bookId: 'book-1',
        originalPrice: 100000,
        salePrice: 80000,
        stock: 100,
      };

      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: 'flash-1' });
      mockPrisma.flashSaleItem.findFirst.mockResolvedValue(null);
      mockPrisma.flashSaleItem.create.mockResolvedValue({ id: 'item-1', ...dto, sold: 0 });

      const result = await service.addItem(dto);

      expect(result.id).toBe('item-1');
    });

    it('should throw when sale price >= original price', async () => {
      const dto = {
        flashSaleId: 'flash-1',
        bookId: 'book-1',
        originalPrice: 80000,
        salePrice: 100000,
        stock: 100,
      };

      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: 'flash-1' });

      await expect(service.addItem(dto)).rejects.toThrow();
    });

    it('should throw when book already in flash sale', async () => {
      const dto = {
        flashSaleId: 'flash-1',
        bookId: 'book-1',
        originalPrice: 100000,
        salePrice: 80000,
        stock: 100,
      };

      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: 'flash-1' });
      mockPrisma.flashSaleItem.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.addItem(dto)).rejects.toThrow();
    });
  });

  describe('getActiveFlashSales', () => {
    it('should return active flash sales', async () => {
      const mockSales = [{ id: 'flash-1', status: 'ACTIVE', items: [] }];
      mockPrisma.flashSale.findMany.mockResolvedValue(mockSales);

      const result = await service.getActiveFlashSales();

      expect(result).toEqual(mockSales);
      expect(mockPrisma.flashSale.findMany).toHaveBeenCalledWith({
        where: {
          status: FlashSaleStatus.ACTIVE,
          startsAt: { lte: expect.any(Date) },
          endsAt: { gte: expect.any(Date) },
        },
        include: { items: { where: { stock: { gt: 0 } } } },
      });
    });
  });

  describe('getBookFlashSalePrice', () => {
    it('should return flash sale price for book', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'item-1',
        flashSaleId: 'flash-1',
        bookId: 'book-1',
        originalPrice: 100000,
        salePrice: 80000,
        stock: 50,
        flashSale: { name: 'Summer Sale', endsAt: futureDate },
      });

      const result = await service.getBookFlashSalePrice('book-1');

      expect(result).not.toBeNull();
      expect(result!.originalPrice).toBe(100000);
      expect(result!.salePrice).toBe(80000);
      expect(result!.discount).toBe(20000);
    });

    it('should return null when no active flash sale', async () => {
      mockPrisma.flashSaleItem.findFirst.mockResolvedValue(null);

      const result = await service.getBookFlashSalePrice('book-1');

      expect(result).toBeNull();
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      mockPrisma.flashSaleItem.findUnique.mockResolvedValue({ id: 'item-1', stock: 100 });
      mockPrisma.flashSaleItem.update.mockResolvedValue({ id: 'item-1', stock: 90 });

      const result = await service.reserveStock('item-1', 10);

      expect(result.stock).toBe(90);
    });

    it('should throw when insufficient stock', async () => {
      mockPrisma.flashSaleItem.findUnique.mockResolvedValue({ id: 'item-1', stock: 5 });

      await expect(service.reserveStock('item-1', 10)).rejects.toThrow();
    });
  });

  describe('releaseStock', () => {
    it('should release stock', async () => {
      mockPrisma.flashSaleItem.update.mockResolvedValue({ id: 'item-1', stock: 110 });

      const result = await service.releaseStock('item-1', 10);

      expect(result.stock).toBe(110);
    });
  });

  describe('confirmPurchase', () => {
    it('should increment sold count', async () => {
      mockPrisma.flashSaleItem.update.mockResolvedValue({ id: 'item-1', sold: 15 });

      const result = await service.confirmPurchase('item-1', 5);

      expect(result.sold).toBe(15);
    });
  });

  describe('delete', () => {
    it('should delete flash sale and its items', async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: 'flash-1' });
      mockPrisma.flashSaleItem.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.flashSale.delete.mockResolvedValue({ id: 'flash-1' });

      const result = await service.delete('flash-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.flashSaleItem.deleteMany).toHaveBeenCalledWith({
        where: { flashSaleId: 'flash-1' },
      });
    });
  });
});
