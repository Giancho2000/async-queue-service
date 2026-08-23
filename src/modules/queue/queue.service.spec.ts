import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;
  const queueMock = { getJobCounts: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: getQueueToken('jobs'), useValue: queueMock },
      ],
    }).compile();
    service = module.get<QueueService>(QueueService);
  });

  it('devuelve los conteos de la cola', async () => {
    const counts = {
      active: 1,
      waiting: 2,
      completed: 3,
      failed: 0,
      delayed: 1,
    };
    queueMock.getJobCounts.mockResolvedValue(counts);
    await expect(service.getStats()).resolves.toEqual(counts);
  });
});
