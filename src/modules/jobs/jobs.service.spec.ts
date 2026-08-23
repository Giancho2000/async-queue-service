import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('JobsService', () => {
  let service: JobsService;

  // --- Mocks de las dependencias ---
  const prismaMock = {
    job: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const queueMock = { add: jest.fn(), remove: jest.fn(), getJob: jest.fn() };
  const configMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, number> = {
        QUEUE_MAX_ATTEMPTS: 3,
        QUEUE_BACKOFF_DELAY: 5000,
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks(); // resetea contadores entre tests
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: getQueueToken('jobs'), useValue: queueMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('persiste el job y lo encola con el id de la BD como jobId', async () => {
      const dto = { type: 'TEST', payload: { foo: 'bar' }, priority: 'HIGH' };
      prismaMock.job.create.mockResolvedValue({
        id: 'uuid-1',
        status: 'PENDING',
        type: 'TEST',
        payload: { foo: 'bar' },
        priority: 'HIGH',
        maxAttempts: 3,
      });

      const result = await service.create(dto as any);

      expect(prismaMock.job.create).toHaveBeenCalledTimes(1);
      expect(queueMock.add).toHaveBeenCalledWith(
        'TEST',
        { foo: 'bar' },
        expect.objectContaining({ jobId: 'uuid-1', priority: 1, attempts: 3 }),
      );
      expect(result).toEqual({ id: 'uuid-1', status: 'PENDING' });
    });
  });

  describe('getJob', () => {
    it('devuelve el job si existe', async () => {
      const job = { id: 'uuid-1', status: 'PENDING' };
      prismaMock.job.findUnique.mockResolvedValue(job);
      await expect(service.getJob('uuid-1')).resolves.toEqual(job);
    });

    it('lanza NotFoundException si no existe', async () => {
      prismaMock.job.findUnique.mockResolvedValue(null);
      await expect(service.getJob('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancela un job PENDING y lo saca de la cola', async () => {
      prismaMock.job.findUnique.mockResolvedValue({
        id: 'uuid-1',
        status: 'PENDING',
      });
      prismaMock.job.update.mockResolvedValue({
        id: 'uuid-1',
        status: 'CANCELLED',
      });

      await service.cancel('uuid-1');

      expect(queueMock.remove).toHaveBeenCalledWith('uuid-1');
      expect(prismaMock.job.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { status: 'CANCELLED' },
      });
    });

    it('lanza ConflictException si el job no está PENDING', async () => {
      prismaMock.job.findUnique.mockResolvedValue({
        id: 'uuid-1',
        status: 'COMPLETED',
      });
      await expect(service.cancel('uuid-1')).rejects.toThrow(ConflictException);
      expect(queueMock.remove).not.toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('lanza ConflictException si el job no está FAILED', async () => {
      prismaMock.job.findUnique.mockResolvedValue({
        id: 'uuid-1',
        status: 'COMPLETED',
      });
      await expect(service.retry('uuid-1')).rejects.toThrow(ConflictException);
    });

    it('reintenta un job FAILED usando bullJob.retry()', async () => {
      prismaMock.job.findUnique.mockResolvedValue({
        id: 'uuid-1',
        status: 'FAILED',
        type: 'TEST',
        payload: {},
        priority: 'MEDIUM',
        maxAttempts: 3,
      });
      const bullJobMock = { retry: jest.fn() };
      queueMock.getJob.mockResolvedValue(bullJobMock);

      await service.retry('uuid-1');

      expect(bullJobMock.retry).toHaveBeenCalledTimes(1);
      expect(prismaMock.job.update).toHaveBeenCalled();
    });
  });
});
