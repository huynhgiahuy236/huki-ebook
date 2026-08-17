# 🤝 Contributing Guide

Hướng dẫn đóng góp cho dự án.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Branch Naming](#branch-naming)
4. [Commit Messages](#commit-messages)
5. [Pull Request Process](#pull-request-process)
6. [Code Style](#code-style)
7. [Testing](#testing)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop
- Git

### Setup Development Environment

```bash
# 1. Fork the repository
# Click "Fork" on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/huki-ebook.git
cd huki-ebook

# 3. Add upstream remote
git remote add upstream https://github.com/original-org/huki-ebook.git

# 4. Install dependencies
npm install

# 5. Copy environment file
cp .env.example .env

# 6. Start Docker services
docker-compose up -d postgres mongo redis rabbitmq

# 7. Run migrations
npm run migrate:dev

# 8. Seed data (optional)
npm run seed:all

# 9. Start development servers
npm run dev
```

## 🔄 Development Workflow

### 1. Create a Branch

```bash
# Always branch from main
git checkout main
git pull upstream main

# Create a new branch
git checkout -b feature/my-feature
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

```bash
# Make your changes
# Write code, fix bugs, add tests

# Stage changes
git add .

# Commit
git commit -m "feat: add new feature"
```

### 3. Keep Your Branch Updated

```bash
# Rebase on main regularly
git fetch upstream
git rebase upstream/main

# Resolve conflicts if any
# After resolving, continue rebase
git rebase --continue
```

### 4. Push and Create PR

```bash
# Push to your fork
git push origin feature/my-feature

# Create Pull Request on GitHub
```

## 🌿 Branch Naming

Format: `<type>/<ticket-id>-<short-description>`

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feature/` | New features | `feature/HUKI-123-add-user-library` |
| `fix/` | Bug fixes | `fix/HUKI-456-cart-item-duplicate` |
| `hotfix/` | Production fixes | `hotfix/HUKI-789-payment-crash` |
| `refactor/` | Code refactoring | `refactor/auth-service-cleanup` |
| `docs/` | Documentation | `docs/update-api-reference` |
| `chore/` | Maintenance tasks | `chore/upgrade-dependencies` |
| `test/` | Test additions | `test/add-checkout-flow` |

### Examples

```
feature/HUKI-123-add-ebook-reader
fix/HUKI-456-cart-quantity-bug
docs/HUKI-789-api-authentication
refactor/extract-notification-service
hotfix/HUKI-101-payment-timeout
```

## 📝 Commit Messages

Format: `<type>(<scope>): <description>`

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `perf` | Performance improvement |
| `test` | Adding tests |
| `chore` | Maintenance |
| `revert` | Revert commit |

### Scope

| Scope | Description |
|-------|-------------|
| `auth` | Authentication |
| `cart` | Cart functionality |
| `order` | Order processing |
| `payment` | Payment |
| `book` | Book catalog |
| `api` | API changes |
| `db` | Database |
| `ci` | CI/CD |
| `deps` | Dependencies |

### Examples

```
feat(auth): add social login with Google
fix(cart): prevent duplicate items in cart
docs(api): update endpoint documentation
refactor(order): extract order validation logic
test(checkout): add integration tests
chore(deps): upgrade NestJS to v10
fix(auth): handle expired refresh token
feat(book): add PDF upload for ebooks
```

### Commit Message Body

```bash
git commit -m "feat(cart): add voucher support

- Add voucher validation in checkout
- Apply voucher discount to cart total
- Handle voucher expiration

Closes #123"
```

## 🔀 Pull Request Process

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Code follows project style
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console errors

## Screenshots (if UI change)

## Related Issue
Fixes #123
```

### PR Process

1. **Create PR early** - Don't wait until done
2. **Fill out PR template** - Complete all sections
3. **Link issue** - Reference the related issue
4. **Request review** - Assign reviewers
5. **Address feedback** - Make requested changes
6. **Squash commits** - Clean up before merge

### PR Review Checklist

For Reviewers:
- [ ] Code is correct
- [ ] Tests are adequate
- [ ] No security issues
- [ ] Follows style guide
- [ ] Documentation updated if needed
- [ ] No console.log/debug code

## 📏 Code Style

### TypeScript

```typescript
// Use const over let
const a = 1;
let b = 2;

// Use interface for objects
interface User {
  id: string;
  name: string;
}

// Use type for unions/intersections
type Status = 'pending' | 'active' | 'inactive';

// Explicit return types for functions
function getUser(id: string): Promise<User> {
  // ...
}

// Use optional chaining
const name = user?.profile?.name;

// Use nullish coalescing
const displayName = user.name ?? 'Anonymous';
```

### Naming

```typescript
// Variables: camelCase
const userName = 'John';
const isActive = true;

// Functions: camelCase, verb prefix
function getUserById(id: string) {}
function validateEmail(email: string) {}

// Classes: PascalCase
class UserService {}
class CartController {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = '/api/v1';

// Interfaces: PascalCase with I prefix (optional)
interface IUser {
  id: string;
  name: string;
}

// Or without prefix
interface User {
  id: string;
  name: string;
}
```

### Imports

```typescript
// 1. External packages
import { useState } from 'react';
import axios from 'axios';

// 2. Internal packages
import { Button, Input } from '@/components/ui';

// 3. Relative imports
import { useAuth } from '../hooks';
import { authStore } from '../stores';

// 4. Type imports
import type { User } from '@/types';
```

## 🧪 Testing

### Test Files

```bash
# Unit tests
services/auth/auth.service.spec.ts

# Integration tests
tests/integration/cart.spec.ts

# E2E tests
tests/e2e/checkout.spec.ts
```

### Writing Tests

```typescript
// Describe test suite
describe('AuthService', () => {
  describe('login', () => {
    it('should return user and tokens on valid credentials', async () => {
      // Arrange
      const credentials = { email: 'test@example.com', password: 'password' };
      
      // Act
      const result = await authService.login(credentials);
      
      // Assert
      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      // ...
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific file
npm test -- auth.service.spec.ts

# Run E2E tests
npm run test:e2e

# Run in watch mode
npm run test:watch
```

## 📚 Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Branching Strategy](https://nvie.com/posts/a-successful-git-branching-model/)
- [NestJS Best Practices](https://docs.nestjs.com/)
- [Next.js Best Practices](https://nextjs.org/docs)
