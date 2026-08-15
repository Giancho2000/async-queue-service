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
import { QueryJobsDto } from './dto/query-jobs.dto';

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
  async getJobs(query: QueryJobsDto) {
    const limit = query.limit ?? 20;

    const where: Prisma.JobWhereInput = {
      status: query.status,
      type: query.type,
      priority: query.priority,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lt: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };

    const jobs = await this.prisma.job.findMany({
      where,
      take: limit + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    });

    const hasNext = jobs.length > limit;
    const items = hasNext ? jobs.slice(0, limit) : jobs;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    return { items, nextCursor };
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

  // Retry a failed job
  async retry(id: string) {
    const job = await this.getJob(id);
    if (job.status !== JobStatus.FAILED) {
      throw new ConflictException(
        `Only FAILED jobs can be retried. Current status: ${job.status}`,
      );
    }

    // retrying job
    const bullJob = await this.jobsQueue.getJob(id);
    if (bullJob) {
      await bullJob.retry();
    } else {
      await this.jobsQueue.add(job.type, job.payload, {
        jobId: id,
        priority: this.mapPriority(job.priority),
        attempts: job.maxAttempts,
      });
    }

    await this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.PENDING,
        error: null,
        startedAt: null,
        completedAt: null,
      },
    });
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
