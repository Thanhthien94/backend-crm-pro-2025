import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS
  const corsOrigins = configService.get<string[]>('cors.origins');
  console.log('CORS origins:', corsOrigins);
  app.enableCors({
    origin: configService.get<string[]>('cors.origins'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'content-type',
      'authorization',
      'x-client-time',
      'x-has-token',
      'x-requested-with',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'Access-Control-Allow-Headers',
    ],
    exposedHeaders: [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'Access-Control-Allow-Headers',
    ],
  });

  // Middleware
  app.use(cookieParser());
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // Prefix all routes
  app.setGlobalPrefix('api/v1');

  // Swagger
  if (configService.get<string>('nodeEnv') === 'development') {
    const config = new DocumentBuilder()
      .setTitle('CRM API Documentation')
      .setDescription('Documentation for the CRM API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        { type: 'apiKey', name: 'x-api-key', in: 'header' },
        'apiKeyAuth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin-top: 20px; }
        .swagger-ui .info .title {
          color: #333;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        /* ... và các CSS tùy chỉnh khác ... */
      `,
      customSiteTitle: 'CRM API Documentation',
    });

    // Redirect from /docs to /api-docs
    app.use('/docs', (req: Request, res: Response) => {
      res.redirect('/api-docs');
    });
  }

  // Health check route
  app.use('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Start server
  const port = configService.get<number>('port') || 5000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
