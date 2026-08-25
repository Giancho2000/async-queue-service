import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QueueModule } from './modules/queue/queue.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionFilter } from './common/filters/all-exceptions.filter';
import { LoggerModule } from 'nestjs-pino';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        // Report all validation errors at once, not just the first one.
        abortEarly: false,
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
          password: config.getOrThrow<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    BullBoardModule.forRoot({
      route: '/queue/board',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'jobs',
      adapter: BullMQAdapter,
    }),
    PrismaModule,
    JobsModule,
    ScheduleModule.forRoot(),
    QueueModule,
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: true,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NOVE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionFilter },
  ],
})
export class AppModule {}
