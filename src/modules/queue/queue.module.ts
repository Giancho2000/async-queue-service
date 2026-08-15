import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [BullModule.registerQueue({ name: 'jobs' })],
  controllers: [QueueController],
  providers: [QueueService],
})
export class QueueModule {}
