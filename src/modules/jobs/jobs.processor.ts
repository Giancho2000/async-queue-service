import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from 'src/generated/prisma/client';
import { JobStatus, JobType } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { JobHandler } from './handlers/jobs-handler.interface';
import { TestHandler } from './handlers/test.handler';
import { EmailHandler } from './handlers/email.handler';
import { ReportHandler } from './handlers/report.handler';

@Processor('jobs')
export class JobsProcessor extends WorkerHost {
  private readonly handlers: Record<JobType, JobHandler>;

  constructor(
    private readonly prisma: PrismaService,
    testHandler: TestHandler,
    emailHandler: EmailHandler,
    reportHandler: ReportHandler,
  ) {
    super();
    this.handlers = {
      TEST: testHandler,
      EMAIL: emailHandler,
      REPORT: reportHandler,
    };
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

    // Validate JobType
    const handler = this.handlers[job.name as JobType];
    if (!handler) {
      throw new Error(`${job.name} is no a support job type.`);
    }

    // 2. execute logic based in type
    const result = await handler.handle(job);

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
