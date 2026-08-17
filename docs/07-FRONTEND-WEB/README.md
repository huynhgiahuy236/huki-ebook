# 🌐 Frontend Web - Next.js

Tài liệu cho Web Application.

## 📁 Project Structure

```
apps/
└── web/                          # Next.js Application
    ├── src/
    │   ├── app/                 # App Router (Next.js 14)
    │   │   ├── (auth)/         # Auth routes (login, register)
    │   │   │   ├── login/
    │   │   │   └── register/
    │   │   │
    │   │   ├── (main)/         # Main app routes
    │   │   │   ├── page.tsx              # Home
    │   │   │   ├── books/
    │   │   │   │   ├── page.tsx          # Book catalog
    │   │   │   │   └── [slug]/
    │   │   │   │       └── page.tsx      # Book detail
    │   │   │   │
    │   │   │   ├── stores/
    │   │   │   │   └── [slug]/
    │   │   │   │       └── page.tsx      # Store detail
    │   │   │   │
    │   │   │   ├── cart/
    │   │   │   │   └── page.tsx
    │   │   │   │
    │   │   │   ├── checkout/
    │   │   │   │   ├── page.tsx          # Checkout
    │   │   │   │   └── success/
    │   │   │   │       └── page.tsx      # Success
    │   │   │   │
    │   │   │   ├── orders/
    │   │   │   │   ├── page.tsx          # Order list
    │   │   │   │   └── [id]/
    │   │   │   │       └── page.tsx      # Order detail
    │   │   │   │
    │   │   │   ├── library/
    │   │   │   │   ├── page.tsx          # User library
    │   │   │   │   └── [bookId]/
    │   │   │   │       └── page.tsx      # Reader
    │   │   │   │
    │   │   │   ├── favorites/
    │   │   │   ├── wishlist/
    │   │   │   ├── forum/
    │   │   │   ├── chat/
    │   │   │   └── profile/
    │   │   │       └── page.tsx
    │   │   │
    │   │   ├── seller/             # Seller dashboard
    │   │   │   ├── dashboard/
    │   │   │   ├── books/
    │   │   │   ├── orders/
    │   │   │   ├── reviews/
    │   │   │   ├── vouchers/
    │   │   │   └── settings/
    │   │   │
    │   │   ├── admin/              # Admin dashboard
    │   │   │   ├── dashboard/
    │   │   │   ├── users/
    │   │   │   ├── businesses/
    │   │   │   ├── moderation/
    │   │   │   └── reports/
    │   │   │
    │   │   ├── api/                # API routes (if needed)
    │   │   │
    │   │   ├── layout.tsx
    │   │   └── globals.css
    │   │
    │   ├── components/             # Shared components
    │   │   ├── ui/               # Base UI components
    │   │   │   ├── Button/
    │   │   │   ├── Input/
    │   │   │   ├── Select/
    │   │   │   ├── Modal/
    │   │   │   ├── Card/
    │   │   │   ├── Badge/
    │   │   │   ├── Skeleton/
    │   │   │   └── ...
    │   │   │
    │   │   ├── layout/           # Layout components
    │   │   │   ├── Header/
    │   │   │   ├── Footer/
    │   │   │   ├── Sidebar/
    │   │   │   └── ...
    │   │   │
    │   │   ├── features/         # Feature-specific components
    │   │   │   ├── auth/
    │   │   │   ├── books/
    │   │   │   ├── cart/
    │   │   │   ├── orders/
    │   │   │   └── ...
    │   │   │
    │   │   └── providers/        # Context providers
    │   │       ├── AuthProvider/
    │   │       ├── QueryProvider/
    │   │       └── ToastProvider/
    │   │
    │   ├── lib/                  # Utilities
    │   │   ├── api/              # API client
    │   │   │   ├── client.ts     # Axios instance
    │   │   │   ├── auth.ts
    │   │   │   ├── books.ts
    │   │   │   ├── cart.ts
    │   │   │   └── ...
    │   │   │
    │   │   ├── hooks/           # Custom hooks
    │   │   ├── utils/           # Utility functions
    │   │   └── constants/       # Constants
    │   │
    │   ├── stores/              # Zustand stores
    │   │   ├── authStore.ts
    │   │   ├── cartStore.ts
    │   │   └── ...
    │   │
    │   └── types/               # TypeScript types
    │       ├── api/
    │       ├── auth/
    │       ├── book/
    │       └── ...
    │
    ├── public/                   # Static files
    ├── tests/                    # Tests
    ├── next.config.js
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── package.json
```

## 🎯 Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 14.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| State (Server) | TanStack Query | 5.x |
| State (Client) | Zustand | 4.x |
| Forms | React Hook Form | 7.x |
| Validation | Zod | 3.x |
| Auth | NextAuth.js | 5.x |
| HTTP Client | Axios | 1.x |
| Icons | Lucide React | Latest |
| Components | shadcn/ui | Latest |

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Start production
npm run start
```

## 📝 Key Files

### API Client Setup

```typescript
// src/lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken(); // from cookie/localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
      await handleAuthError();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Auth Store

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### API Hooks

```typescript
// src/lib/api/hooks/useBooks.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../client';

export function useBooks(params?: BooksQuery) {
  return useQuery({
    queryKey: ['books', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/books', { params });
      return data;
    },
  });
}

export function useBook(slug: string) {
  return useQuery({
    queryKey: ['book', slug],
    queryFn: async () => {
      const { data } = await apiClient.get(`/books/slug/${slug}`);
      return data;
    },
    enabled: !!slug,
  });
}

export function useCreateBook() {
  return useMutation({
    mutationFn: async (bookData: CreateBookDto) => {
      const { data } = await apiClient.post('/books', bookData);
      return data;
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
```

### Providers Setup

```typescript
// src/components/providers/index.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/ui/toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

## 📦 Components

### Base Components (shadcn/ui)

```tsx
// Usage
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function BookCard({ book }: { book: Book }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>{book.title}</Card.Title>
      </Card.Header>
      <Card.Content>
        <img src={book.coverUrl} alt={book.title} />
        <p>{book.price.toLocaleString()}đ</p>
      </Card.Content>
      <Card.Footer>
        <Button>Add to Cart</Button>
      </Card.Footer>
    </Card>
  );
}
```

### Feature Components

```tsx
// src/components/features/books/BookList.tsx
'use client';

import { useBooks } from '@/lib/api/hooks/useBooks';
import { BookCard } from './BookCard';
import { BookFilters } from './BookFilters';
import { BookPagination } from './BookPagination';

export function BookList() {
  const { data, isLoading, error } = useBooks();
  
  if (isLoading) return <BookListSkeleton />;
  if (error) return <div>Error loading books</div>;
  
  return (
    <div className="space-y-6">
      <BookFilters />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data?.data.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
      <BookPagination pagination={data?.pagination} />
    </div>
  );
}
```

## 🔧 Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3006

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## 📱 Responsive Design

Tailwind breakpoints:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Extra large |

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```
