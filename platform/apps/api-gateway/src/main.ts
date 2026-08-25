import { NestFactory } from '@nestjs/core';
import { ValidationPipe, NestApplicationOptions } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const options: NestApplicationOptions = {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  };

  const app = await NestFactory.create(AppModule, options);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // ========================================
  // SWAGGER CONFIGURATION
  // ========================================

  const config = new DocumentBuilder()
    // Basic Info
    .setTitle('HUKI EBOOK API')
    .setDescription(`
# HUKI EBOOK Platform API

Welcome to the HUKI EBOOK API documentation. This API provides endpoints for managing books, orders, payments, and more.

## Base URL
\`http://localhost:3000/api/v1\`

## Authentication
Most endpoints require JWT Bearer token authentication.
1. Register/Login to get access token
2. Include header: \`Authorization: Bearer <token>\`

## Services
| Service | Port | Description |
|---------|------|-------------|
| Identity | 3001 | Auth, Users, Sessions |
| Business | 3002 | Business, Stores, Members |
| Commerce | 3003 | Books, Cart, Orders, Payments |
| Shipping | 3004 | Shipments, Addresses |
| Community | 3005 | Forum, Chat, Reviews |
| Promotion | 3007 | Vouchers, Banners |

## Common Headers
| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | application/json |
| Authorization | No | Bearer token |
| Idempotency-Key | For checkout | Unique key for idempotent operations |

## Error Codes
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Server Error

---
*Last updated: 2026-08-24*
    `)
    .setVersion('1.0.0')
    .setTermsOfService('https://huki.ebook.com/terms')
    .setContact('HUKI Support', 'support@huki.ebook.com', 'https://huki.ebook.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')

    // Servers
    .addServer('http://localhost:3000/api/v1', 'Local Development')
    .addServer('https://dev.huki.ebook.com/api/v1', 'Development Server')
    .addServer('https://staging.huki.ebook.com/api/v1', 'Staging Server')

    // Security
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-refresh',
    )

    // Tags/Groups
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication - Register, Login, Password management')
    .addTag('Users', 'User profile management')
    .addTag('Sessions', 'Session management')
    .addTag('Business', 'Business management')
    .addTag('Stores', 'Store management')
    .addTag('Members', 'Team member management')
    .addTag('Books', 'Book catalog - CRUD, Publishing')
    .addTag('Categories', 'Book categories')
    .addTag('Authors', 'Book authors')
    .addTag('Publishers', 'Book publishers')
    .addTag('Cart', 'Shopping cart operations')
    .addTag('Checkout', 'Checkout and order creation')
    .addTag('Orders', 'Order management')
    .addTag('Payments', 'Payment and refund operations')
    .addTag('Shipping', 'Shipping fee calculation')
    .addTag('Shipments', 'Shipment tracking and management')
    .addTag('Forum', 'Forum posts and comments')
    .addTag('Reviews', 'Book and store reviews')
    .addTag('Chat', 'Real-time chat')
    .addTag('Notifications', 'User notifications')
    .addTag('Moderation', 'Content moderation')
    .addTag('Vouchers', 'Voucher management')
    .addTag('Banners', 'Banner management')
    .addTag('Flash Sales', 'Flash sale management')
    .addTag('Search', 'Catalog search')

    .build();

  // Swagger Document Options
  const documentOptions: SwaggerDocumentOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  };

  const document = SwaggerModule.createDocument(app, config);

  // Custom Swagger UI options
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'HUKI EBOOK API Documentation',
    customCss: `
      :root {
        --huki-primary: #6366f1;
        --huki-secondary: #8b5cf6;
        --huki-accent: #ec4899;
        --huki-success: #10b981;
        --huki-warning: #f59e0b;
        --huki-danger: #ef4444;
        --huki-bg: #0f172a;
        --huki-bg-secondary: #1e293b;
        --huki-text: #f8fafc;
        --huki-text-secondary: #94a3b8;
      }
      body {
        background-color: var(--huki-bg) !important;
      }
      .topbar {
        background: linear-gradient(135deg, var(--huki-primary) 0%, var(--huki-secondary) 100%) !important;
      }
      .sidebar {
        background: var(--huki-bg-secondary) !important;
      }
      .opblock-tag {
        background: var(--huki-bg-secondary) !important;
        color: var(--huki-text) !important;
      }
      .opblock {
        background: var(--huki-bg-secondary) !important;
      }
      .opblock-summary-method.get { background: var(--huki-success) !important; }
      .opblock-summary-method.post { background: var(--huki-primary) !important; }
      .opblock-summary-method.put { background: var(--huki-warning) !important; }
      .opblock-summary-method.patch { background: var(--huki-secondary) !important; }
      .opblock-summary-method.delete { background: var(--huki-danger) !important; }
      .info .title {
        color: var(--huki-text) !important;
      }
      .servers a {
        background: var(--huki-bg-secondary) !important;
        border: 1px solid var(--huki-primary) !important;
        color: var(--huki-text) !important;
      }
    `,
    customCssUrl: [],
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      operationsSorter: 'method',
      tagsSorter: 'alpha',
      tryItOutEnabled: true,
    },
    validatorUrl: undefined,
  });

  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);

  console.log('\n============================================');
  console.log('   HUKI EBOOK API Gateway');
  console.log('============================================');
  console.log('   Server:     http://localhost:' + port);
  console.log('   Swagger:    http://localhost:' + port + '/api/docs');
  console.log('   Base URL:   http://localhost:' + port + '/api/v1');
  console.log('============================================\n');
}

bootstrap();
