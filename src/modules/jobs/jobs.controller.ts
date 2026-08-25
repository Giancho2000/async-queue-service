import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ParseUUIDPipe,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobService: JobsService) {}

  @ApiTags('jobs')
  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @ApiTags('jobs')
  @Get()
  get(@Query() query: QueryJobsDto) {
    return this.jobService.getJobs(query);
  }

  @ApiTags('jobs')
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.getJob(id);
  }

  @ApiTags('jobs')
  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.cancel(id);
  }

  @ApiTags('jobs')
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.retry(id);
  }
}
