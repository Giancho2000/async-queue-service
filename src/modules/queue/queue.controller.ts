import { Controller, Get } from '@nestjs/common';
import { QueueService } from './queue.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @ApiTags('queue')
  @Get('stats')
  getStats() {
    return this.queueService.getStats();
  }
}
