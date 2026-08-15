import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { BullModule } from '@nestjs/bullmq';
import { JobsProcessor } from './jobs.processor';
import { TestHandler } from './handlers/test.handler';
import { EmailHandler } from './handlers/email.handler';
import { ReportHandler } from './handlers/report.handler';

@Module({
  imports: [BullModule.registerQueue({ name: 'jobs' })],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsProcessor,
    TestHandler,
    EmailHandler,
    ReportHandler,
  ],
})
export class JobsModule {}
