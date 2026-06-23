import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';

let cachedServer: ((req: IncomingMessage, res: ServerResponse) => void) | null =
  null;

function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  const allowedOrigins = [
    ...config.get<string>('FRONTEND_URLS', '').split(','),
    ...config.get<string>('EXTENSION_ORIGINS', '').split(','),
    config.get<string>('FRONTEND_URL', ''),
    'http://localhost:3000',
  ]
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      const normalizedOrigin = origin?.replace(/\/+$/, '');

      if (
        !normalizedOrigin ||
        allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.startsWith('chrome-extension://')
      ) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}

async function createApp() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  return app;
}

export async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);

  await app.listen(config.get<number>('PORT', 3001));
}

async function getServer() {
  if (!cachedServer) {
    const app = await createApp();
    await app.init();

    cachedServer = app.getHttpAdapter().getInstance() as (
      req: IncomingMessage,
      res: ServerResponse,
    ) => void;
  }

  return cachedServer;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const server = await getServer();

  return server(req, res);
}
