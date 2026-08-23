import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

describe('JobsController', () => {
  let controller: JobsController;

  const jobsServiceMock = {
    create: jest.fn(),
    getJobs: jest.fn(),
    getJob: jest.fn(),
    cancel: jest.fn(),
    retry: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [{ provide: JobsService, useValue: jobsServiceMock }],
    }).compile();

    controller = module.get<JobsController>(JobsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delega en el service', async () => {
    const dto = { type: 'TEST', payload: {} } as any;
    await controller.create(dto);
    expect(jobsServiceMock.create).toHaveBeenCalledWith(dto);
  });
});
