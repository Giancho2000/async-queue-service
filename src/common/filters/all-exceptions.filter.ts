import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

@Catch() //Capture every exception error.
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] | object = 'Internal Server Error';
    if (exception instanceof HttpException) {
      const r = exception.getResponse();
      message =
        typeof r === 'string' ? r : ((r as { message: string }).message ?? r);
    }

    const body = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    this.logger.error({ err: exception, ...body }, `${req.method} ${req.url}`);
    res.status(status).json(body);
  }
}
