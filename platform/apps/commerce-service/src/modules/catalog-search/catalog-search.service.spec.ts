import { BadRequestException } from '@nestjs/common';
import { CatalogSearchService } from './catalog-search.service';

describe('CatalogSearchService (Prisma)', () => {
  const prisma = { category: { findMany: jest.fn() }, author: { findMany: jest.fn() }, publisher: { findMany: jest.fn() } };
  const service = new CatalogSearchService(prisma as any);
  beforeEach(() => jest.clearAllMocks());

  it('normalizes input and combines Prisma catalog results', async () => {
    prisma.category.findMany.mockResolvedValue([]);
    prisma.author.findMany.mockResolvedValue([{ id: 'author-1', name: 'Nguyễn Nhật Ánh' }]);
    prisma.publisher.findMany.mockResolvedValue([]);
    const result = await service.search({ q: 'Nguyễn Nhật', page: 1, limit: 20 } as any);
    expect(result.pagination.total).toBe(1);
    expect(result.data[0]).toMatchObject({ type: 'AUTHOR', id: 'author-1' });
  });

  it('rejects input without searchable characters', async () => {
    await expect(service.search({ q: '  ', page: 1, limit: 20 } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
