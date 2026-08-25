import { TestHandler } from './test.handler';

describe('TestHandler', () => {
  it('devuelve { ok: true }', async () => {
    const handler = new TestHandler();
    await expect(handler.handle()).resolves.toEqual({ ok: true });
  }, 5000); // the handler waits 2s, so we allow enough timeout
});
