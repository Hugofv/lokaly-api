import { describe, it, expect } from 'bun:test';
import { buildPaginationMeta, paginatedResponse } from './responses';

describe('public-api shared/responses pagination helpers', () => {
  it('buildPaginationMeta computes hasMore correctly', () => {
    const meta = buildPaginationMeta(50, 10, 20);
    expect(meta).toEqual({
      total: 50,
      limit: 10,
      offset: 20,
      hasMore: true,
    });

    const metaEnd = buildPaginationMeta(30, 10, 20);
    expect(metaEnd.hasMore).toBe(false);
  });

  it('paginatedResponse wraps data and meta', async () => {
    const res = paginatedResponse(['a', 'b'], 5, 2, 0);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(['a', 'b']);
    expect(body.pagination).toEqual({
      total: 5,
      limit: 2,
      offset: 0,
      hasMore: true,
    });
  });
});
