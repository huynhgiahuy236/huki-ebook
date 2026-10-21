import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import OnboardingPage from './page';

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
}));

const mockCompleteOnboarding = vi.fn();
const mockShowToast = vi.fn();
let mockUser: any = null;
let mockIsLoading = false;

vi.mock('@/ui/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockIsLoading,
    completeOnboarding: mockCompleteOnboarding,
  }),
}));

vi.mock('@/ui/context/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@/ui/api/voucherApi', () => ({
  voucherApi: {
    getEligibleFeed: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

describe('OnboardingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUser = { id: 'usr-1', email: 'test@huki.vn', fullName: 'HuKi User', hasCompletedOnboarding: false };
    mockIsLoading = false;
  });

  it('redirects unauthenticated users to login', () => {
    mockUser = null;
    mockIsLoading = false;

    render(<OnboardingPage />);

    expect(mockReplace).toHaveBeenCalledWith('/auth/login?redirect=/onboarding');
  });

  it('redirects already onboarded users to home', () => {
    mockUser = { id: 'usr-1', hasCompletedOnboarding: true };

    render(<OnboardingPage />);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('renders Step 1 (Goals) by default for logged in users', () => {
    render(<OnboardingPage />);

    // Step 1 title / description
    expect(screen.getByText('Bạn muốn trải nghiệm điều gì tại HuKi?')).toBeInTheDocument();
    expect(screen.getByText('Tiếp tục')).toBeInTheDocument();
  });

  it('navigates through steps when clicking Tiếp tục', async () => {
    render(<OnboardingPage />);

    // Step 1 -> Step 2
    const nextBtn = screen.getByText('Tiếp tục');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Chọn các thể loại bạn yêu thích')).toBeInTheDocument();
    });

    // Step 2 -> Step 3
    fireEvent.click(screen.getByText('Tiếp tục'));

    await waitFor(() => {
      expect(screen.getByText('Định dạng & Giao diện đọc sách')).toBeInTheDocument();
    });

    // Step 3 -> Step 4
    fireEvent.click(screen.getByText('Tiếp tục'));

    await waitFor(() => {
      expect(screen.getByText('Đặt mục tiêu đọc sách')).toBeInTheDocument();
    });

    // Step 4 -> Step 5
    fireEvent.click(screen.getByText('Tiếp tục'));

    await waitFor(() => {
      expect(screen.getByText('Bắt đầu khám phá')).toBeInTheDocument();
    });
  });

  it('submits collected preferences upon completion and redirects to /', async () => {
    mockCompleteOnboarding.mockResolvedValueOnce({ success: true });

    render(<OnboardingPage />);

    // Fast-forward to step 5
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Tiếp tục'));
    }

    await waitFor(() => {
      expect(screen.getByText('Bắt đầu khám phá')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bắt đầu khám phá'));

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
      expect(mockCompleteOnboarding).toHaveBeenCalledWith(expect.objectContaining({
        primaryGoals: expect.any(Array),
        favoriteGenres: expect.any(Array),
        preferredFormats: expect.any(Array),
        preferredTheme: expect.any(String),
      }));
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
