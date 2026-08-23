import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { JobsProcessor } from './jobs.processor';
import { PrismaService } from 'src/prisma/prisma.service';
import { TestHandler } from './handlers/test.handler';
import { EmailHandler } from './handlers/email.handler';
import { ReportHandler } from './handlers/report.handler';

describe('JobsProcessor', () => {
  let processor: JobsProcessor;

  const prismaMock = { job: { update: jest.fn() } };
  const testHandlerMock = { handle: jest.fn() };
  const emailHandlerMock = { handle: jest.fn() };
  const reportHandlerMock = { handle: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsProcessor,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TestHandler, useValue: testHandlerMock },
        { provide: EmailHandler, useValue: emailHandlerMock },
        { provide: ReportHandler, useValue: reportHandlerMock },
      ],
    }).compile();

    processor = module.get<JobsProcessor>(JobsProcessor);
  });

  describe('process', () => {
    it('transiciona PROCESSING -> handler -> COMPLETED y devuelve el result', async () => {
      testHandlerMock.handle.mockResolvedValue({ ok: true });
      const job = {
        id: 'uuid-1',
        name: 'TEST',
        data: {},
        attemptsMade: 0,
      } as unknown as Job;

      const result = await processor.process(job);

      expect(prismaMock.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1' },
          data: expect.objectContaining({ status: 'PROCESSING' }),
        }),
      );
      expect(testHandlerMock.handle).toHaveBeenCalledWith(job);
      expect(prismaMock.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            result: { ok: true },
          }),
        }),
      );
      expect(result).toEqual({ ok: true });
    });

    it('enruta al handler correcto según el tipo', async () => {
      emailHandlerMock.handle.mockResolvedValue({ sent: true });
      const job = {
        id: 'uuid-2',
        name: 'EMAIL',
        data: {},
        attemptsMade: 0,
      } as unknown as Job;

      await processor.process(job);

      expect(emailHandlerMock.handle).toHaveBeenCalledTimes(1);
      expect(testHandlerMock.handle).not.toHaveBeenCalled();
    });

    it('lanza error si el tipo no tiene handler', async () => {
      const job = {
        id: 'uuid-3',
        name: 'UNKNOWN',
        data: {},
        attemptsMade: 0,
      } as unknown as Job;
      await expect(processor.process(job)).rejects.toThrow(
        'is no a support job type',
      );
    });
  });

  describe('onFailed', () => {
    it('marca FAILED cuando se agotaron los intentos', async () => {
      const job = {
        id: 'uuid-1',
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as unknown as Job;
      await processor.onFailed(job, new Error('boom'));

      expect(prismaMock.job.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { status: 'FAILED', error: 'boom' },
      });
    });

    it('NO marca FAILED si aún quedan intentos', async () => {
      const job = {
        id: 'uuid-1',
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as unknown as Job;
      await processor.onFailed(job, new Error('boom'));
      expect(prismaMock.job.update).not.toHaveBeenCalled();
    });
  });
});
