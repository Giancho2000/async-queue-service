import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
        priority: dto.priority,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      select: { id: true, status: true },
    });
  }
}
