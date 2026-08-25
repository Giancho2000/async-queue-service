import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsObject, IsOptional } from 'class-validator';
import { JobPriority, JobType } from 'src/generated/prisma/enums';

export class CreateJobDto {
  @ApiProperty({ enum: JobType, example: 'TEST' })
  @IsEnum(JobType)
  type: JobType;

  @ApiProperty({
    example: { task: 'Make a cake' },
    description: 'Job entry data',
  })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiProperty({ enum: JobPriority, example: 'HIGH' })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @ApiProperty({ example: '2026-12-31T23:59:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
