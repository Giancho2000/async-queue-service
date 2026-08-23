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
    jest.clearAllMocks();
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

  it('get delega con los query params', async () => {
    const query = { limit: 10 } as any;
    await controller.get(query);
    expect(jobsServiceMock.getJobs).toHaveBeenCalledWith(query);
  });

  it('getOne delega con el id', async () => {
    await controller.getOne('uuid-1');
    expect(jobsServiceMock.getJob).toHaveBeenCalledWith('uuid-1');
  });

  it('cancel delega con el id', async () => {
    await controller.cancel('uuid-1');
    expect(jobsServiceMock.cancel).toHaveBeenCalledWith('uuid-1');
  });

  it('retry delega con el id', async () => {
    await controller.retry('uuid-1');
    expect(jobsServiceMock.retry).toHaveBeenCalledWith('uuid-1');
  });
});
