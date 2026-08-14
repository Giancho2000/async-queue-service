import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobPriority, Prisma } from 'src/generated/prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

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

    const job = await this.prisma.job.create({
      data: {
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
        priority: dto.priority,
        maxAttempts,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
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

    await this.jobsQueue.add(job.type, job.payload, {
      jobId: job.id,
      priority: this.mapPriority(job.priority),
      attempts: maxAttempts,
      backoff: { type: 'exponential', delay: backOfDelay },
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
}
