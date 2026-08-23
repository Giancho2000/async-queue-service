import { TestHandler } from './test.handler';

describe('TestHandler', () => {
  it('devuelve { ok: true }', async () => {
    const handler = new TestHandler();
    await expect(handler.handle()).resolves.toEqual({ ok: true });
  }, 5000); // el handler espera 2s, damos margen de timeout
});
