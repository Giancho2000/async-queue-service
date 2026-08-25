import { Job } from 'bullmq';
import { ReportHandler } from './report.handler';

describe('ReportHandler', () => {
  const handler = new ReportHandler(); // no dependencies

  it('genera un CSV en base64 desde payload.rows', async () => {
    const job = {
      data: {
        rows: [
          { nombre: 'Gian', edad: 30 },
          { nombre: 'Ana', edad: 25 },
        ],
      },
    } as unknown as Job;

    const result = (await handler.handle(job)) as {
      format: string;
      rows: number;
      base64: string;
    };

    expect(result.format).toBe('csv');
    expect(result.rows).toBe(2);
    const csv = Buffer.from(result.base64, 'base64').toString('utf-8');
    expect(csv).toContain('nombre,edad');
    expect(csv).toContain('Gian,30');
  });

  it('maneja payload sin rows', async () => {
    const job = { data: {} } as unknown as Job;
    const result = (await handler.handle(job)) as { rows: number };
    expect(result.rows).toBe(0);
  });
});
