import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from 'src/generated/prisma/client';
import { JobStatus } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('jobs')
export class JobsProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // This process will be execute by each job in queue.
  async process(job: Job): Promise<unknown> {
    // 1. register status in PROCESSING and when it started.
    await this.prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
        attempts: job.attemptsMade + 1,
      },
    });

    // Aca podemos comprobar los intentos desde consola
    /*     console.log(
      `van ${job.attemptsMade} intentos y empezamos con ${job.attemptsStarted}`,
    ); */

    // 2. execute logic based in type
    const result = await this.handle(job);

    // 3. Mark job as COMPLETED, result and update date

    await this.prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        result: result as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    // BullMQ saved this as returnValue of job
    return result;
  }

  // Handler by jobType
  private async handle(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'TEST':
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { ok: true };
      default:
        throw new Error(`Job Type is not support: ${job.name}`);
    }
  }

  // If process return an error
  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error): Promise<void> {
    const attemptsMade = job.attemptsMade ?? 0;
    const maxAttempts = job.opts.attempts ?? 1;
    if (attemptsMade >= maxAttempts) {
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.FAILED, error: err.message },
      });
    }
  }
}
