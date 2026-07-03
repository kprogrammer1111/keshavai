import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3001;
  const frontendUrl = configService.get<string>('app.frontendUrl');

  app.use(helmet());
  app.use(compression());
  const corsOrigins =
    process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [];
  const corsAllowedHosts =
    process.env.CORS_ALLOWED_HOSTS?.split(',').map((h) => h.trim()) ?? [];

  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true;

    const allowed = [frontendUrl, ...corsOrigins].filter(Boolean);
    if (allowed.includes(origin)) return true;
    if (/\.vercel\.app$/.test(origin)) return true;

    try {
      const { hostname } = new URL(origin);
      return corsAllowedHosts.some(
        (host) =>
          hostname === host ||
          hostname === `www.${host}` ||
          hostname.endsWith(`.${host}`),
      );
    } catch {
      return false;
    }
  };

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Keshavai API')
    .setDescription('AI Chat Platform REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on port ${port}`);
  logger.log(`Swagger docs at /api/docs`);
}

bootstrap();
