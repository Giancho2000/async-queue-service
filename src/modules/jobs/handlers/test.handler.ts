import { Injectable } from '@nestjs/common';
import { JobHandler } from './jobs-handler.interface';

@Injectable()
export class TestHandler implements JobHandler {
  async handle(): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { ok: true };
  }
}
