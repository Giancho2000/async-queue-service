import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { JobPriority, JobStatus, JobType } from 'src/generated/prisma/enums';

export class QueryJobsDto {
  @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
  @IsOptional() @IsEnum(JobType) type?: JobType;
  @IsOptional() @IsEnum(JobPriority) priority?: JobPriority;

  @IsOptional() @IsISO8601() from?: string; //from date
  @IsOptional() @IsISO8601() to?: string; // To date

  @IsOptional() @IsUUID() cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
