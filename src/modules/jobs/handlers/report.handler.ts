import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobHandler } from './jobs-handler.interface';

type CsvValue = string | number | boolean | null;
type CsvRow = Record<string, CsvValue>;
@Injectable()
export class ReportHandler implements JobHandler {
  handle(job: Job): Promise<unknown> {
    const data = job.data as { rows?: CsvRow[] };
    const rows = data.rows ?? [];

    const csv = this.toCsv(rows);
    const base64 = Buffer.from(csv, 'utf-8').toString('base64');

    return Promise.resolve({
      format: 'csv',
      rows: rows.length,
      bytes: Buffer.byteLength(csv, 'utf-8'),
      base64,
    });
  }

  private toCsv(rows: CsvRow[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const body = rows.map((row) =>
      headers.map((h) => String(row[h] ?? '')).join(','),
    );
    return [headers.join(','), ...body].join('\n');
  }
}
