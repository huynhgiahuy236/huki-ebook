import { ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService (Prisma)', () => {
  const prisma = { category: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() }, $transaction: jest.fn() };
  const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const service = new CategoriesService(prisma as any, redis as any);
  beforeEach(() => jest.clearAllMocks());

  it('creates a normalized root category with Prisma', async () => {
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.create.mockImplementation(async ({ data }: any) => ({ id: 'category-1', ...data }));
    const result = await service.create({ name: 'Lập trình Web' } as any);
    expect(result).toMatchObject({ name: 'Lập trình Web', normalizedName: 'lap trinh web', slug: 'lap-trinh-web', parentId: null });
    expect(prisma.category.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ normalizedName: 'lap trinh web' }) }));
  });

  it('rejects a duplicate slug before writing', async () => {
    prisma.category.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.create({ name: 'Duplicate' } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('builds a nested tree from Prisma records', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'root', parentId: null, name: 'Root' }, { id: 'child', parentId: 'root', name: 'Child' }]);
    const result = await service.findTree();
    expect(result).toHaveLength(1);
    expect(result[0].children[0].id).toBe('child');
  });

  it('normalizes API sort direction for Prisma', async () => {
    prisma.category.findMany.mockReturnValue('categories-query');
    prisma.category.count.mockReturnValue('count-query');
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.findAll({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      order: 'DESC',
      includeInactive: false,
      rootOnly: false,
    } as any);

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      }),
    );
  });
});
