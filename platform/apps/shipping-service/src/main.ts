import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = (
    process.env.CORS_ORIGIN ??
    process.env.CORS_ORIGINS ??
    'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Shipping Service')
    .setDescription('Shipping, Delivery API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.SHIPPING_SERVICE_PORT || 3004;
  await app.listen(port);
  console.log(`🚀 Shipping Service running on: http://localhost:${port}`);
}

bootstrap();
