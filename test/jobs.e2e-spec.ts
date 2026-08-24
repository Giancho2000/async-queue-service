import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import request from 'supertest';
import { AppModule } from '../src/app.module';

jest.setTimeout(120_000); // levantar contenedores tarda

describe('Jobs E2E (full live cicle)', () => {
  let app: INestApplication;
  let pg: StartedPostgreSqlContainer;
  let redis: StartedRedisContainer;

  beforeAll(async () => {
    // 1. Quick containers
    pg = await new PostgreSqlContainer('postgres:16-alpine').start();
    redis = await new RedisContainer('redis:7-alpine')
      .withPassword('test-pass')
      .start();

    // 2. Inyect config before create app
    process.env.DATABASE_URL = pg.getConnectionUri();
    process.env.REDIS_HOST = redis.getHost();
    process.env.REDIS_PORT = String(redis.getPort());
    process.env.REDIS_PASSWORD = 'test-pass';
    process.env.BULL_BOARD_USER ??= 'admin';
    process.env.BULL_BOARD_PASS ??= 'admin';

    // 3. Migrations on DB
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      stdio: 'inherit',
    });

    // 4. Starting app (It includes worker )
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await pg?.stop();
    await redis?.stop();
  });

  it('POST /jobs -> worker -> GET /jobs/:id finish COMPLETED', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/jobs')
      .send({ type: 'TEST', payload: { foo: 'bar' } })
      .expect(201);

    const jobId = createRes.body.id;
    expect(jobId).toBeDefined();
    expect(createRes.body.status).toBe('PENDING');

    // El worker procesa async (~2s) -> We do polling
    const completed = await pollUntil(async () => {
      const res = await request(app.getHttpServer())
        .get(`/jobs/${jobId}`)
        .expect(200);
      return res.body.status === 'COMPLETED' ? res.body : null;
    }, 20_000);

    expect(completed.result).toEqual({ ok: true });
    expect(completed.startedAt).toBeDefined();
    expect(completed.completedAt).toBeDefined();
  });
});

async function pollUntil<T>(
  fn: () => Promise<T | null>,
  timeoutMs: number,
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await fn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Timeout esperando el estado esperado');
}
