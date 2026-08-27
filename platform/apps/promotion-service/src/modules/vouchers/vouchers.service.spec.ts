import { VouchersService } from './vouchers.service';
import { VoucherType, VoucherScope, VoucherStatus } from './dto/voucher.dto';

describe('VouchersService', () => {
  const mockPrisma = {
    voucher: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    voucherUsage: {
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new VouchersService(mockPrisma as any);

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create voucher with valid data', async () => {
      const dto = {
        code: 'DISCOUNT10',
        name: '10% Discount',
        description: 'Get 10% off',
        type: VoucherType.PERCENTAGE,
        value: 10,
        scope: VoucherScope.PLATFORM,
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      mockPrisma.voucher.findUnique.mockResolvedValue(null);
      mockPrisma.voucher.create.mockResolvedValue({ id: 'voucher-1', ...dto, currentUsage: 0 });

      const result = await service.create(dto);

      expect(result.id).toBe('voucher-1');
      expect(mockPrisma.voucher.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: 'DISCOUNT10' }),
      });
    });

    it('should throw conflict when code exists', async () => {
      const dto = {
        code: 'EXISTING',
        name: 'Test',
        type: VoucherType.PERCENTAGE,
        value: 10,
        scope: VoucherScope.PLATFORM,
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      mockPrisma.voucher.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto)).rejects.toThrow();
    });

    it('should throw bad request when expiresAt before startsAt', async () => {
      const dto = {
        code: 'INVALID',
        name: 'Test',
        type: VoucherType.PERCENTAGE,
        value: 10,
        scope: VoucherScope.PLATFORM,
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        expiresAt: new Date().toISOString(),
      };
      mockPrisma.voucher.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated vouchers', async () => {
      const mockVouchers = [{ id: 'voucher-1', code: 'CODE1' }, { id: 'voucher-2', code: 'CODE2' }];
      mockPrisma.$transaction.mockResolvedValue([mockVouchers, 2]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toEqual(mockVouchers);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return voucher when found', async () => {
      const mockVoucher = { id: 'voucher-1', code: 'DISCOUNT10' };
      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher);

      const result = await service.findOne('voucher-1');

      expect(result).toEqual(mockVoucher);
    });

    it('should throw NotFound when voucher not found', async () => {
      mockPrisma.voucher.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow();
    });
  });

  describe('findByCode', () => {
    it('should return voucher by code (case insensitive)', async () => {
      const mockVoucher = { id: 'voucher-1', code: 'DISCOUNT10' };
      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher);

      const result = await service.findByCode('discount10');

      expect(result!.code).toBe('DISCOUNT10');
    });
  });

  describe('validate', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();

    it('should return valid for active voucher', async () => {
      mockPrisma.voucher.findUnique.mockResolvedValue({
        id: 'voucher-1',
        code: 'DISCOUNT10',
        status: VoucherStatus.ACTIVE,
        type: VoucherType.PERCENTAGE,
        value: 10,
        startsAt: pastDate,
        expiresAt: futureDate,
        totalUsage: 0,
        currentUsage: 0,
        minOrderAmount: 0,
        scope: VoucherScope.PLATFORM,
      });

      const result = await service.validate('user-1', { code: 'DISCOUNT10', orderSubtotal: 100000 });

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(10000); // 10% of 100000
    });

    it('should return invalid for inactive voucher', async () => {
      mockPrisma.voucher.findUnique.mockResolvedValue({
        id: 'voucher-1',
        status: VoucherStatus.INACTIVE,
        startsAt: pastDate,
        expiresAt: futureDate,
      });

      const result = await service.validate('user-1', { code: 'DISCOUNT10', orderSubtotal: 100000 });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('inactive');
    });

    it('should return invalid for voucher not started yet', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      mockPrisma.voucher.findUnique.mockResolvedValue({
        id: 'voucher-1',
        status: VoucherStatus.ACTIVE,
        startsAt: tomorrow,
        expiresAt: nextWeek,
        totalUsage: 0,
        currentUsage: 0,
        minOrderAmount: 0,
        scope: VoucherScope.PLATFORM,
      });

      const result = await service.validate('user-1', { code: 'DISCOUNT10', orderSubtotal: 100000 });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not started');
    });

    it('should apply max discount cap for percentage voucher', async () => {
      mockPrisma.voucher.findUnique.mockResolvedValue({
        id: 'voucher-1',
        status: VoucherStatus.ACTIVE,
        type: VoucherType.PERCENTAGE,
        value: 50,
        startsAt: pastDate,
        expiresAt: futureDate,
        totalUsage: 0,
        currentUsage: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 20000,
        scope: VoucherScope.PLATFORM,
      });

      const result = await service.validate('user-1', { code: 'DISCOUNT50', orderSubtotal: 100000 });

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(20000); // capped at maxDiscountAmount
    });

    it('should return invalid when order below minimum amount', async () => {
      mockPrisma.voucher.findUnique.mockResolvedValue({
        id: 'voucher-1',
        status: VoucherStatus.ACTIVE,
        startsAt: pastDate,
        expiresAt: futureDate,
        totalUsage: 0,
        currentUsage: 0,
        minOrderAmount: 200000,
        scope: VoucherScope.PLATFORM,
      });

      const result = await service.validate('user-1', { code: 'DISCOUNT10', orderSubtotal: 100000 });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Minimum');
    });
  });

  describe('delete', () => {
    it('should delete voucher with no usage', async () => {
      mockPrisma.voucher.findUnique.mockResolvedValue({ id: 'voucher-1', currentUsage: 0 });
      mockPrisma.voucher.delete.mockResolvedValue({ id: 'voucher-1' });

      const result = await service.delete('voucher-1');

      expect(result.success).toBe(true);
    });

    it('should throw when voucher has usage', async () => {
      mockPrisma.voucher.findUnique.mockResolvedValue({ id: 'voucher-1', currentUsage: 5 });

      await expect(service.delete('voucher-1')).rejects.toThrow();
    });
  });
});
