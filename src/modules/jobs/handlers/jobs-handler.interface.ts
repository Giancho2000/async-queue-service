import { Job } from 'bullmq';

export interface JobHandler {
  handle(job: Job): Promise<unknown>;
}
