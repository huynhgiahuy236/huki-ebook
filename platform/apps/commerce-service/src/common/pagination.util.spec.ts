import { paginate } from './pagination.util';

describe('paginate', () => {
  it('returns page metadata', () => {
    expect(paginate(['item'], 21, 2, 10)).toEqual({
      data: ['item'],
      pagination: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });
  });
});
