import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

describe('QueueController', () => {
  let controller: QueueController;
  const queueServiceMock = { getStats: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [{ provide: QueueService, useValue: queueServiceMock }],
    }).compile();
    controller = module.get<QueueController>(QueueController);
  });

  it('getStats delega en el service', async () => {
    await controller.getStats();
    expect(queueServiceMock.getStats).toHaveBeenCalledTimes(1);
  });
});
