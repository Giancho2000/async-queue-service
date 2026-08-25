import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import expressBasicAuth from 'express-basic-auth';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // Close connections (Prisma, queues) cleanly on SIGTERM/SIGINT.
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

  // swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Async Queue Service')
    .setDescription('Async process jobs queue with BullMQ & redis')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  await app.listen(port);
}
void bootstrap();
