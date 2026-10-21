import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController - Profile & Onboarding', () => {
  let controller: UserController;
  let userService: Partial<Record<keyof UserService, jest.Mock>>;

  beforeEach(() => {
    userService = {
      findById: jest.fn(),
      updateProfile: jest.fn(),
    };
    controller = new UserController(userService as any);
  });

  describe('getProfile', () => {
    it('returns full profile with onboarding preferences and hasCompletedOnboarding status', async () => {
      const mockUser = {
        id: 'u-123',
        email: 'user@example.com',
        fullName: 'Test User',
        phone: '0987654321',
        avatar: 'https://cdn.huki.vn/avatar.png',
        role: 'USER',
        status: 'ACTIVE',
        hasCompletedOnboarding: true,
        onboardingPreferences: {
          primaryGoals: ['exam'],
          favoriteGenres: ['kinh-doanh'],
          preferredCategories: ['business'],
          preferredFormats: ['ebook'],
          preferredTheme: 'sepia',
          readingHabits: {
            dailyMinutes: 20,
            yearlyBooksTarget: 10,
            preferredTime: 'morning',
          },
        },
      };

      userService.findById!.mockResolvedValue(mockUser);

      const res = await controller.getProfile('u-123');

      expect(userService.findById).toHaveBeenCalledWith('u-123');
      expect(res.data).toEqual({
        id: 'u-123',
        email: 'user@example.com',
        fullName: 'Test User',
        phone: '0987654321',
        avatar: 'https://cdn.huki.vn/avatar.png',
        role: 'USER',
        status: 'ACTIVE',
        hasCompletedOnboarding: true,
        primaryGoals: ['exam'],
        favoriteGenres: ['kinh-doanh'],
        preferredCategories: ['business'],
        preferredFormats: ['ebook'],
        preferredTheme: 'sepia',
        readingHabits: {
          dailyMinutes: 20,
          yearlyBooksTarget: 10,
          preferredTime: 'morning',
        },
        dailyMinutesGoal: 20,
        yearlyBooksTarget: 10,
        preferredReadingTime: 'morning',
        wishlist: [],
      });
    });
  });

  describe('updateProfile', () => {
    it('calls userService.updateProfile and returns updated profile data', async () => {
      const updatedUser = {
        id: 'u-123',
        email: 'user@example.com',
        fullName: 'Test User Updated',
        phone: '0987654321',
        avatar: null,
        role: 'USER',
        status: 'ACTIVE',
        hasCompletedOnboarding: true,
        onboardingPreferences: {
          primaryGoals: ['habit'],
          preferredTheme: 'dark',
          dailyMinutesGoal: 30,
        },
      };

      userService.updateProfile!.mockResolvedValue(updatedUser);

      const updateDto = {
        fullName: 'Test User Updated',
        hasCompletedOnboarding: true,
        primaryGoals: ['habit'],
        preferredTheme: 'dark',
        dailyMinutesGoal: 30,
      };

      const res = await controller.updateProfile('u-123', updateDto);

      expect(userService.updateProfile).toHaveBeenCalledWith('u-123', updateDto);
      expect(res.message).toBe('Profile updated');
      expect(res.data.hasCompletedOnboarding).toBe(true);
      expect(res.data.primaryGoals).toEqual(['habit']);
      expect(res.data.preferredTheme).toBe('dark');
      expect(res.data.wishlist).toEqual([]);
    });
  });
});
