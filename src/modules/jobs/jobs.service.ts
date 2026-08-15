import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { JobPriority, JobStatus, Prisma } from 'src/generated/prisma/client';
import { CreateJobDto } from './dto/create-job.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('jobs') private readonly jobsQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  // create a new job and add in the queue
  async create(dto: CreateJobDto) {
    const maxAttempts = this.config.getOrThrow<number>('QUEUE_MAX_ATTEMPTS');
    const backOfDelay = this.config.getOrThrow<number>('QUEUE_BACKOFF_DELAY');
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;

    const job = await this.prisma.job.create({
      data: {
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
        priority: dto.priority,
        maxAttempts,
        scheduledAt,
      },
      select: {
        id: true,
        status: true,
        type: true,
        payload: true,
        priority: true,
        maxAttempts: true,
      },
    });

    const delay = scheduledAt
      ? Math.max(scheduledAt.getTime() - Date.now(), 0)
      : undefined;

    await this.jobsQueue.add(job.type, job.payload, {
      jobId: job.id,
      priority: this.mapPriority(job.priority),
      attempts: maxAttempts,
      backoff: { type: 'exponential', delay: backOfDelay },
      delay,
    });

    return { id: job.id, status: job.status };
  }

  private mapPriority(priority: JobPriority): number {
    const map: Record<JobPriority, number> = {
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    return map[priority];
  }

  // Get all jobs
  async getJobs() {
    return this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // get Job by id
  async getJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with Id ${id} was not found.`);
    }
    return job;
  }

  // Cancel job
  async cancel(id: string) {
    const job = await this.getJob(id);

    if (job.status !== 'PENDING') {
      throw new ConflictException(
        `Only PENDING jobs can be cancelled. Current status ${job.status}`,
      );
    }

    await this.jobsQueue.remove(id);

    return this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.CANCELLED },
    });
  }

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
  // daily job to clear old jobs
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanOldJobs() {
    const cutOff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.prisma.job.deleteMany({
      where: {
        status: { in: [JobStatus.COMPLETED, JobStatus.CANCELLED] },
        updatedAt: { lt: cutOff },
      },
    });
  }
}
