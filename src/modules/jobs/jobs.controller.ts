import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Get()
  get() {
    return this.jobService.getJobs();
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.getJob(id);
  }
}
