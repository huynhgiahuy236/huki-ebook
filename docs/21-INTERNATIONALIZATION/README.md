# 🌍 Internationalization (i18n)

Hướng dẫn setup và sử dụng i18n.

## 📁 Project Structure

```
apps/
└── web/
    └── src/
        ├── i18n/
        │   ├── index.ts              # i18n configuration
        │   ├── config.ts             # Translation config
        │   │
        │   ├── locales/
        │   │   ├── vi.json          # Vietnamese
        │   │   ├── en.json          # English
        │   │   └── index.ts         # Locale exports
        │   │
        │   └── utils/
        │       ├── interpolation.ts   # String interpolation
        │       └── pluralization.ts  # Plural rules
        │
        └── app/
            └── [locale]/
                ├── layout.tsx
                └── page.tsx
```

## 📦 Tech Stack

| Platform | Library | Alternative |
|----------|--------|-------------|
| Web (Next.js) | next-intl | react-i18next |
| Mobile (Flutter) | flutter_localizations + intl | |

## 🌐 Supported Locales

| Locale | Language | Region | Code |
|--------|----------|--------|------|
| Vietnamese | Tiếng Việt | Vietnam | vi |
| English | English | Default | en |

## 📝 Translation Files

### Vietnamese (vi.json)

```json
{
  "common": {
    "appName": "HUKI EBOOK",
    "loading": "Đang tải...",
    "error": "Có lỗi xảy ra",
    "retry": "Thử lại",
    "save": "Lưu",
    "cancel": "Hủy",
    "confirm": "Xác nhận",
    "delete": "Xóa",
    "edit": "Sửa",
    "search": "Tìm kiếm",
    "noResults": "Không có kết quả"
  },
  "auth": {
    "login": {
      "title": "Đăng nhập",
      "email": "Email",
      "password": "Mật khẩu",
      "forgotPassword": "Quên mật khẩu?",
      "submit": "Đăng nhập",
      "noAccount": "Chưa có tài khoản?",
      "signUp": "Đăng ký"
    },
    "register": {
      "title": "Đăng ký",
      "fullName": "Họ và tên",
      "email": "Email",
      "password": "Mật khẩu",
      "confirmPassword": "Xác nhận mật khẩu",
      "submit": "Đăng ký",
      "hasAccount": "Đã có tài khoản?",
      "login": "Đăng nhập"
    }
  },
  "books": {
    "title": "Sách",
    "addToCart": "Thêm vào giỏ",
    "buyNow": "Mua ngay",
    "price": "Giá",
    "author": "Tác giả",
    "publisher": "Nhà xuất bản",
    "category": "Danh mục",
    "format": "Định dạng",
    "physical": "Sách giấy",
    "digital": "Sách điện tử",
    "inStock": "Còn hàng",
    "outOfStock": "Hết hàng",
    "rating": "Đánh giá",
    "reviews": "{count} đánh giá"
  },
  "cart": {
    "title": "Giỏ hàng",
    "empty": "Giỏ hàng trống",
    "subtotal": "Tạm tính",
    "shipping": "Phí vận chuyển",
    "discount": "Giảm giá",
    "total": "Tổng cộng",
    "checkout": "Thanh toán",
    "continueShopping": "Tiếp tục mua sắm"
  },
  "orders": {
    "title": "Đơn hàng",
    "status": {
      "pending": "Chờ xử lý",
      "paid": "Đã thanh toán",
      "shipped": "Đang giao hàng",
      "delivered": "Đã giao hàng",
      "cancelled": "Đã hủy"
    }
  },
  "errors": {
    "required": "Trường này bắt buộc",
    "invalidEmail": "Email không hợp lệ",
    "passwordTooShort": "Mật khẩu phải có ít nhất 8 ký tự",
    "passwordMismatch": "Mật khẩu không khớp"
  },
  "pagination": {
    "page": "Trang {page} trong {total}",
    "previous": "Trang trước",
    "next": "Trang sau",
    "showing": "Hiển thị {from}-{to} của {total}"
  }
}
```

### English (en.json)

```json
{
  "common": {
    "appName": "HUKI EBOOK",
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "noResults": "No results found"
  },
  "auth": {
    "login": {
      "title": "Login",
      "email": "Email",
      "password": "Password",
      "forgotPassword": "Forgot password?",
      "submit": "Login",
      "noAccount": "Don't have an account?",
      "signUp": "Sign up"
    },
    "register": {
      "title": "Register",
      "fullName": "Full name",
      "email": "Email",
      "password": "Password",
      "confirmPassword": "Confirm password",
      "submit": "Register",
      "hasAccount": "Already have an account?",
      "login": "Login"
    }
  },
  "books": {
    "title": "Books",
    "addToCart": "Add to Cart",
    "buyNow": "Buy Now",
    "price": "Price",
    "author": "Author",
    "publisher": "Publisher",
    "category": "Category",
    "format": "Format",
    "physical": "Physical Book",
    "digital": "E-book",
    "inStock": "In Stock",
    "outOfStock": "Out of Stock",
    "rating": "Rating",
    "reviews": "{count} reviews"
  },
  "cart": {
    "title": "Cart",
    "empty": "Your cart is empty",
    "subtotal": "Subtotal",
    "shipping": "Shipping",
    "discount": "Discount",
    "total": "Total",
    "checkout": "Checkout",
    "continueShopping": "Continue Shopping"
  },
  "orders": {
    "title": "Orders",
    "status": {
      "pending": "Pending",
      "paid": "Paid",
      "shipped": "Shipped",
      "delivered": "Delivered",
      "cancelled": "Cancelled"
    }
  },
  "errors": {
    "required": "This field is required",
    "invalidEmail": "Invalid email address",
    "passwordTooShort": "Password must be at least 8 characters",
    "passwordMismatch": "Passwords do not match"
  },
  "pagination": {
    "page": "Page {page} of {total}",
    "previous": "Previous page",
    "next": "Next page",
    "showing": "Showing {from}-{to} of {total}"
  }
}
```

## 🔧 Implementation

### Next.js Setup (next-intl)

```typescript
// src/i18n/config.ts
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(`./locales/${locale}.json`)).default,
    timeZone: 'Asia/Ho_Chi_Minh',
  };
});
```

### Middleware

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### Usage in Components

```tsx
// Using hook
import { useTranslations } from 'next-intl';

export function BookCard({ book }: { book: Book }) {
  const t = useTranslations('books');

  return (
    <div>
      <h3>{book.title}</h3>
      <p>{t('author')}: {book.author}</p>
      <p>{t('price')}: {book.price.toLocaleString()}đ</p>
      <button>{t('addToCart')}</button>
    </div>
  );
}

// Using server component
import { getTranslations } from 'next-intl/server';

export default async function BookPage({ params: { locale } }: Props) {
  const t = await getTranslations('books');
  
  return (
    <h1>{t('title')}</h1>
  );
}

// Interpolation
const message = t('pagination.showing', { from: 1, to: 20, total: 100 });
// Output: "Showing 1-20 of 100"

// Pluralization
const count = 5;
const message = t('books.reviews', { count });
// Requires: { "reviews": "{{count}} review" / "{{count}} reviews" }
```

## 📱 Flutter i18n

### Setup

```dart
// pubspec.yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: any

// l10n.yaml
arb-dir: lib/l10n
template-arb-file: app_vi.arb
output-localization-file: app_localizations.dart
```

### ARB Files

```json
// lib/l10n/app_vi.arb
{
  "@@locale": "vi",
  "appTitle": "HUKI EBOOK",
  "booksTitle": "Sách",
  "@booksTitle": {
    "description": "Title for books page"
  },
  "addToCart": "Thêm vào giỏ",
  "price": "Giá: {amount}",
  "@price": {
    "placeholders": {
      "amount": {
        "type": "String"
      }
    }
  },
  "itemCount": "{count, plural, =0{Không có sản phẩm} =1{1 sản phẩm} other{{count} sản phẩm}}",
  "@itemCount": {
    "placeholders": {
      "count": {
        "type": "int"
      }
    }
  }
}
```

### Usage

```dart
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

// In widget
final l10n = AppLocalizations.of(context)!;

Text(l10n.booksTitle)
Text(l10n.price(amount: book.price.toString()))
Text(l10n.itemCount(count: cart.items.length))
```

## 💱 Currency Formatting

```typescript
// src/lib/utils/currency.ts
export function formatCurrency(amount: number, locale: string = 'vi-VN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'vi-VN' ? 'VND' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Usage
formatCurrency(149000, 'vi-VN')  // "149.000 đ"
formatCurrency(149000, 'en-US')  // "$149,000"
```

## 📅 Date/Time Formatting

```typescript
// src/lib/utils/date.ts
export function formatDate(
  date: Date | string,
  locale: string = 'vi-VN',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatDateTime(date: Date | string, locale: string = 'vi-VN'): string {
  return formatDate(date, locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Usage
formatDate(new Date(), 'vi-VN')           // "14 thg 8, 2026"
formatDate(new Date(), 'en-US')          // "Aug 14, 2026"
formatDateTime(new Date(), 'vi-VN')       // "14 thg 8, 2026 10:00"
```

## 🔄 Language Switcher

```tsx
// components/LanguageSwitcher.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');

  const toggleLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => toggleLocale('vi')}
        className={locale === 'vi' ? 'font-bold' : ''}
      >
        Tiếng Việt
      </button>
      <button
        onClick={() => toggleLocale('en')}
        className={locale === 'en' ? 'font-bold' : ''}
      >
        English
      </button>
    </div>
  );
}
```

## 🌍 SEO Considerations

```tsx
// app/[locale]/layout.tsx
export function generateMetadata({ params }: { params: { locale: string } }) {
  const titles = {
    vi: { default: 'HUKI EBOOK - Nền tảng sách trực tuyến' },
    en: { default: 'HUKI EBOOK - Online Book Platform' },
  };

  return {
    title: titles[params.locale as keyof typeof titles]?.default,
    alternates: {
      canonical: `https://huki-ebook.com/${params.locale}`,
      languages: {
        'vi': 'https://huki-ebook.com/vi',
        'en': 'https://huki-ebook.com/en',
      },
    },
  };
}
```
