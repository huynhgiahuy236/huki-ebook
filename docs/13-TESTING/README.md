# 🧪 Testing Guide

Hướng dẫn testing toàn diện.

## 📋 Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         E2E Tests                           │
│                    (Few, Slow, Expensive)                   │
│                        ~20 tests                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     Integration Tests                       │
│                  (Medium, Medium, Medium)                  │
│                       ~100 tests                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                       Unit Tests                            │
│                   (Many, Fast, Cheap)                      │
│                       ~500 tests                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Test Structure

```
huki-ebook/
├── services/
│   └── identity-service/
│       ├── src/
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   └── auth.service.spec.ts  ← Unit test
│       │   └── ...
│       └── test/
│           └── auth.e2e-spec.ts       ← E2E test
│
├── apps/
│   └── web/
│       ├── src/
│       │   └── features/
│       │       └── auth/
│       │           ├── login/
│       │           │   ├── LoginForm.tsx
│       │           │   └── LoginForm.test.tsx  ← Component test
│       │           └── ...
│       └── test/
│           └── auth/
│               └── auth.integration.ts   ← Integration test
│
└── libs/
    └── shared/
        └── test-utils/
```

## 🔬 Unit Tests

### Service Tests

```typescript
// services/identity-service/src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories/user.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 'user-id',
        ...registerDto,
        passwordHash: 'hashed-password',
      } as User);

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        password: 'Password123!',
        fullName: 'Test User',
      };

      userRepository.findByEmail.mockResolvedValue({ id: 'existing-user' } as User);

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('should hash password before saving', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockImplementation(async (data) => {
        // Verify password is hashed
        expect(data.passwordHash).not.toBe(registerDto.password);
        expect(await bcrypt.compare(registerDto.password, data.passwordHash)).toBe(true);
        return { id: 'user-id', ...data } as User;
      });

      // Act
      await authService.register(registerDto);
    });
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const hashedPassword = await bcrypt.hash('Password123!', 12);
      const user = { id: 'user-id', email: 'test@example.com', passwordHash: hashedPassword } as User;

      userRepository.findByEmail.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('access-token');

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.user.id).toBe('user-id');
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword!',
      };

      const hashedPassword = await bcrypt.hash('Password123!', 12);
      const user = { id: 'user-id', email: 'test@example.com', passwordHash: hashedPassword } as User;

      userRepository.findByEmail.mockResolvedValue(user);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Controller Tests

```typescript
// services/identity-service/src/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refresh: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should call authService.register with correct params', async () => {
      // Arrange
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User',
      };

      const expectedResult = {
        user: { id: 'user-id', ...dto },
        tokens: { accessToken: 'token', refreshToken: 'refresh' },
      };

      authService.register.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.register(dto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });
});
```

## 🔄 Integration Tests

### Database Integration

```typescript
// test/orders.integration-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from '../../src/order/order.module';
import { DataSource } from 'typeorm';

describe('Order Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        OrderModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'test',
          password: 'test',
          database: 'test_huki',
          entities: [Order, OrderItem],
          synchronize: true, // Only for testing
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  describe('createOrder', () => {
    it('should create order with items', async () => {
      // Arrange
      const createOrderDto = {
        userId: 'user-id',
        items: [
          { bookId: 'book-1', quantity: 2, price: 100000 },
          { bookId: 'book-2', quantity: 1, price: 150000 },
        ],
      };

      // Act
      const result = await app.get(OrderService).createOrder(createOrderDto);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(350000);
    });
  });
});
```

## 🌐 E2E Tests

### Using Supertest

```typescript
// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          fullName: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.tokens).toBeDefined();
        });
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          fullName: 'User One',
        });

      // Duplicate registration
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          fullName: 'User Two',
        })
        .expect(409);
    });

    it('should validate password strength', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          fullName: 'Test User',
        })
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      // Register first
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
          fullName: 'Test User',
        });

      // Login
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.tokens.accessToken).toBeDefined();
        });
    });
  });
});
```

## 🧩 Mocking

### Jest Mocks

```typescript
// mocks/user.mock.ts
import { User } from '../src/entities/user.entity';

export const mockUser: User = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  passwordHash: '$2b$12$hashedpassword',
  fullName: 'Test User',
  role: 'USER',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockUsers: User[] = [
  mockUser,
  { ...mockUser, id: 'user-uuid-456', email: 'user2@example.com' },
];
```

### Repository Mocks

```typescript
// mocks/repositories.mock.ts
export const userRepositoryMock = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

export const orderRepositoryMock = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
```

## 📊 Test Coverage

```json
// package.json
{
  "scripts": {
    "test:cov": "jest --coverage",
    "test:coverage:check": "jest --coverage --coverageThreshold='{\"global\":{\"branches\":70,\"functions\":70,\"lines\":70,\"statements\":70}}'"
  }
}
```

### Coverage Report

```bash
npm run test:cov

# Coverage output
# ─────────────────────────────────────────────────────────────────────────────
# File                    | % Stmts | % Branch | % Funcs | % Lines |
# ─────────────────────────────────────────────────────────────────────────────
# auth.service.ts        |   95.23 |    88.46 |  100.00 |   95.23 |
# auth.controller.ts     |  100.00 |    100.00 |  100.00 |  100.00 |
# user.service.ts       |   78.45 |    65.00 |   83.33 |   78.45 |
# ─────────────────────────────────────────────────────────────────────────────
```

## 🛠️ Testing Utilities

### Factory Functions

```typescript
// test/utils/factories.ts
import { faker } from '@faker-js/faker';
import { User } from '../../src/entities/user.entity';

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    passwordHash: faker.string.alphanumeric(60),
    fullName: faker.person.fullName(),
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockUsers(count: number): User[] {
  return Array.from({ length: count }, () => createMockUser());
}
```

### Test Database Setup

```typescript
// test/setup.ts
import { DataSource } from 'typeorm';
import { TestEnvironment } from './test-environment';

export async function setupTestDatabase(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'test',
    password: 'test',
    database: 'test_huki',
    entities: [__dirname + '/../src/**/*.entity.ts'],
    synchronize: true,
    dropSchema: true,
  });

  await dataSource.initialize();
  return dataSource;
}
```
