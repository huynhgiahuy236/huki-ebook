import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Category } from '../../entities';
import { CategoriesService } from './categories.service';

function category(id: string, parentId: string | null, depth: number): Category {
  return {
    id,
    name: id,
    normalizedName: id,
    slug: id,
    description: null,
    parentId,
    parent: null,
    children: [],
    depth,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe('CategoriesService', () => {
  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getExists: jest.fn().mockResolvedValue(false),
  };
  const repository = {
    create: jest.fn((value: Partial<Category>) => value),
    save: jest.fn(async (value: Partial<Category>) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  } as unknown as Repository<Category>;
  const service = new CategoriesService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('creates a normalized root category', async () => {
    const result = await service.create({ name: 'Lập trình Web' });
    expect(result).toMatchObject({
      name: 'Lập trình Web',
      normalizedName: 'lap trinh web',
      slug: 'lap-trinh-web',
      parentId: null,
      depth: 0,
    });
  });

  it('rejects a child beyond the maximum depth', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(category('parent', null, 4));
    await expect(
      service.create({ name: 'Too deep', parentId: 'parent' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('builds a nested tree from a flat result', async () => {
    const root = category('root', null, 0);
    const child = category('child', 'root', 1);
    (repository.find as jest.Mock).mockResolvedValue([root, child]);

    const result = await service.findTree();
    expect(result).toHaveLength(1);
    expect(result[0].children[0].id).toBe('child');
  });
});
