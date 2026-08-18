import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatalogSearchService } from './catalog-search.service';

describe('CatalogSearchService', () => {
  const dataSource = { query: jest.fn() } as unknown as DataSource;
  const service = new CatalogSearchService(dataSource);

  beforeEach(() => jest.clearAllMocks());

  it('normalizes Vietnamese input and returns pagination', async () => {
    (dataSource.query as jest.Mock).mockResolvedValue([
      {
        type: 'AUTHOR',
        id: 'author-id',
        name: 'Nguyễn Nhật Ánh',
        slug: 'nguyen-nhat-anh',
        score: '2.5',
        total_count: '1',
      },
    ]);

    const result = await service.search({ q: 'Nguyễn Nhật', page: 1, limit: 20 });
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.any(String),
      ['nguyen nhat', ['CATEGORY', 'AUTHOR', 'PUBLISHER'], 20, 0],
    );
    expect(result.pagination.total).toBe(1);
    expect(result.data[0].score).toBe(2.5);
  });

  it('rejects input without searchable characters', async () => {
    await expect(service.search({ q: '  ', page: 1, limit: 20 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
