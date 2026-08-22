import { CommentSchema } from './comment.schema';
import { ForumCategorySchema } from './forum-category.schema';
import { ForumSchema } from './forum.schema';

describe('Sprint 12 forum schemas', () => {
  it('stores cross-service author ids as strings', () => {
    expect(ForumSchema.path('authorId').instance).toBe('String');
    expect(CommentSchema.path('authorId').instance).toBe('String');
  });

  it('defines the weighted forum text-search index', () => {
    expect(ForumSchema.indexes()).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          { title: 'text', content: 'text', tags: 'text' },
          expect.objectContaining({ name: 'forums_text_search' }),
        ]),
      ]),
    );
  });

  it('defines category and comment lookup indexes', () => {
    expect(ForumCategorySchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ isActive: 1, sortOrder: 1, name: 1 }, expect.any(Object)],
      ]),
    );
    expect(CommentSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ postId: 1, status: 1, createdAt: 1 }, expect.any(Object)],
      ]),
    );
  });
});
