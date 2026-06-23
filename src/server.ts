import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';

let cachedServer: ((req: IncomingMessage, res: ServerResponse) => void) | null =
  null;

function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL');

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: frontendUrl ?? true,
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
