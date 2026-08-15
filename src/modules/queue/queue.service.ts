import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(@InjectQueue('jobs') private readonly jobsQueue: Queue) {}
  async getStats() {
    const counts = await this.jobsQueue.getJobCounts(
      'active',
      'waiting',
      'completed',
      'failed',
      'delayed',
    );
    return counts;
  }
}
