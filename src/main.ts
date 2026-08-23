import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import expressBasicAuth from 'express-basic-auth';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // Cierra conexiones (Prisma, colas) limpio al recibir SIGTERM/SIGINT.
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  app.use(
    '/queue/board',
    expressBasicAuth({
      challenge: true,
      users: {
        [configService.getOrThrow<string>('BULL_BOARD_USER')]:
          configService.getOrThrow<string>('BULL_BOARD_PASS'),
      },
    }),
  );
  await app.listen(port);
}
void bootstrap();
