import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get the underlying Express instance
  const expressApp = app.getHttpAdapter().getInstance();

  // Get absolute path to uploads directory
  const uploadsPath = join(process.cwd(), 'uploads');

  // Serve static files FIRST, before any NestJS middleware
  // This ensures static files bypass NestJS routing entirely
  // Files will be accessible at /api/uploads/photos/* and /api/uploads/horoscopes/*
  expressApp.use('/api/uploads', express.static(uploadsPath));

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}
bootstrap();
