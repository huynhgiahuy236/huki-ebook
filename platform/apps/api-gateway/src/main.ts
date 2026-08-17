import { NestFactory } from '@nestjs/core';
import { ValidationPipe, NestApplicationOptions } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('HUKI EBOOK API')
    .setDescription('API Gateway for HUKI EBOOK Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User endpoints')
    .addTag('books', 'Book catalog endpoints')
    .addTag('cart', 'Cart endpoints')
    .addTag('orders', 'Order endpoints')
    .addTag('forum', 'Forum endpoints')
    .addTag('chat', 'Chat endpoints')
    .addTag('vouchers', 'Voucher endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API Gateway running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  console.log(`🔗 Routes: /api/v1/*`);
}

bootstrap();
