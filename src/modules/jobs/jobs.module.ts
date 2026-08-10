import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { BullModule } from '@nestjs/bullmq';
import { JobsProcessor } from './jobs.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'jobs' })],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor],
})
export class JobsModule {}
