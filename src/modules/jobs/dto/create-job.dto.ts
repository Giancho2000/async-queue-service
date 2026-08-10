import { IsDateString, IsEnum, IsObject, IsOptional } from 'class-validator';
import { JobPriority, JobType } from 'src/generated/prisma/enums';

export class CreateJobDto {
  @IsEnum(JobType)
  type: JobType;

  @IsObject()
  payload: Record<string, unknown>;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
