import { Types } from 'mongoose';
import { ForumService } from './forum.service';

describe('ForumService', () => {
  const forums = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
  const comments = { findOneAndUpdate: jest.fn(), findOne: jest.fn() };
  const categories = { updateOne: jest.fn() };
  const eventBus = { publish: jest.fn() };
  const service = new ForumService(
    forums as any,
    comments as any,
    categories as any,
    eventBus as any,
  );
  const actor = { sub: 'user-1', email: 'user@example.com', role: 'USER' };

  beforeEach(() => jest.clearAllMocks());

  it('seeds the three documented categories idempotently', async () => {
    categories.updateOne.mockResolvedValue({ acknowledged: true });
    await service.onApplicationBootstrap();
    expect(categories.updateOne).toHaveBeenCalledTimes(3);
    expect(categories.updateOne).toHaveBeenCalledWith(
      { slug: 'general' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({ isActive: true }),
      }),
      { upsert: true },
    );
  });

  it('likes a post with an atomic idempotency filter', async () => {
    const post = { likes: ['user-1'], likeCount: 1 };
    forums.findOneAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(post),
    });
    const id = new Types.ObjectId().toString();
    await expect(service.likePost(actor, id, true)).resolves.toEqual({
      data: { isLiked: true, likeCount: 1 },
    });
    expect(forums.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(Types.ObjectId),
        likes: { $ne: 'user-1' },
      }),
      { $addToSet: { likes: 'user-1' }, $inc: { likeCount: 1 } },
      { new: true },
    );
  });

  it('normalizes and de-duplicates post tags', () => {
    expect(
      (service as any).tags(['  Clean-Code ', 'clean-code', ' Books ']),
    ).toEqual(['clean-code', 'books']);
  });

  it('creates a URL-safe unique slug', () => {
    expect((service as any).slug('Đánh giá Sách Hay')).toMatch(
      /^danh-gia-sach-hay-[a-f0-9]{8}$/,
    );
  });
});
