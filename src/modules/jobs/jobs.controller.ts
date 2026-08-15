import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ParseUUIDPipe,
  Delete,
  Query,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { QueryJobsDto } from './dto/query-jobs.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Get()
  get(@Query() query: QueryJobsDto) {
    return this.jobService.getJobs(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.getJob(id);
  }

  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.cancel(id);
  }
}
