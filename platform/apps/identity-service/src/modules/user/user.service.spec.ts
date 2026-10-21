import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

describe('UserService - Profile & Onboarding', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const auditService = {
    logAction: jest.fn(),
  };

  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(prisma as any, auditService as any);
  });

  describe('findById', () => {
    it('throws NotFoundException if user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('returns user when found and not deleted', async () => {
      const mockUser = { id: 'u1', email: 'test@huki.vn', deletedAt: null };
      prisma.user.findFirst.mockResolvedValue(mockUser);
      const res = await service.findById('u1');
      expect(res).toEqual(mockUser);
    });
  });

  describe('updateProfile - Onboarding Preferences', () => {
    it('updates hasCompletedOnboarding and persists full onboarding preferences', async () => {
      const existingUser = {
        id: 'u1',
        fullName: 'Nguyen Van A',
        hasCompletedOnboarding: false,
        onboardingPreferences: null,
      };
      prisma.user.findFirst.mockResolvedValue(existingUser);
      prisma.user.update.mockImplementation(async ({ data }) => ({
        ...existingUser,
        ...data,
      }));

      const payload = {
        hasCompletedOnboarding: true,
        primaryGoals: ['habit', 'skill'],
        favoriteGenres: ['van-hoc', 'kinh-te'],
        preferredCategories: ['business', 'self-help'],
        preferredFormats: ['ebook', 'audiobook'],
        preferredTheme: 'dark',
        dailyMinutesGoal: 30,
        yearlyBooksTarget: 12,
        preferredReadingTime: 'bedtime',
        readingHabits: {
          dailyMinutes: 30,
          yearlyBooksTarget: 12,
          preferredTime: 'bedtime',
        },
      };

      const result = await service.updateProfile('u1', payload);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          hasCompletedOnboarding: true,
          onboardingPreferences: {
            primaryGoals: ['habit', 'skill'],
            favoriteGenres: ['van-hoc', 'kinh-te'],
            preferredCategories: ['business', 'self-help'],
            preferredFormats: ['ebook', 'audiobook'],
            preferredTheme: 'dark',
            dailyMinutesGoal: 30,
            yearlyBooksTarget: 12,
            preferredReadingTime: 'bedtime',
            readingHabits: {
              dailyMinutes: 30,
              yearlyBooksTarget: 12,
              preferredTime: 'bedtime',
            },
          },
        },
      });
      expect(result.hasCompletedOnboarding).toBe(true);
    });

    it('merges new preferences with existing preferences without wiping untouched keys', async () => {
      const existingUser = {
        id: 'u1',
        fullName: 'Nguyen Van A',
        hasCompletedOnboarding: true,
        onboardingPreferences: {
          primaryGoals: ['habit'],
          favoriteGenres: ['van-hoc'],
          preferredTheme: 'light',
        },
      };
      prisma.user.findFirst.mockResolvedValue(existingUser);
      prisma.user.update.mockImplementation(async ({ data }) => ({
        ...existingUser,
        ...data,
      }));

      const payload = {
        preferredTheme: 'dark',
        dailyMinutesGoal: 45,
      };

      await service.updateProfile('u1', payload);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          onboardingPreferences: {
            primaryGoals: ['habit'],
            favoriteGenres: ['van-hoc'],
            preferredTheme: 'dark',
            dailyMinutesGoal: 45,
          },
        },
      });
    });

    it('persists and updates wishlist in onboardingPreferences', async () => {
      const existingUser = {
        id: 'u1',
        fullName: 'Nguyen Van A',
        hasCompletedOnboarding: true,
        onboardingPreferences: {
          wishlist: ['book-1'],
        },
      };
      prisma.user.findFirst.mockResolvedValue(existingUser);
      prisma.user.update.mockImplementation(async ({ data }) => ({
        ...existingUser,
        ...data,
      }));

      await service.updateProfile('u1', { wishlist: ['book-1', 'book-2'] });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          onboardingPreferences: {
            wishlist: ['book-1', 'book-2'],
          },
        },
      });
    });
  });
});
