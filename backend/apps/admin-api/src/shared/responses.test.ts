import { describe, it, expect } from 'bun:test';
import { buildPaginationMeta, paginatedResponse } from './responses';

describe('admin-api shared/responses pagination helpers', () => {
  it('buildPaginationMeta computes hasMore correctly', () => {
    const meta = buildPaginationMeta(100, 20, 40);
    expect(meta).toEqual({
      total: 100,
      limit: 20,
      offset: 40,
      hasMore: true,
    });

    const metaEnd = buildPaginationMeta(60, 20, 40);
    expect(metaEnd.hasMore).toBe(false);
  });

  it('paginatedResponse wraps data and meta', async () => {
    const res = paginatedResponse([1, 2, 3], 30, 3, 0);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([1, 2, 3]);
    expect(body.pagination).toEqual({
      total: 30,
      limit: 3,
      offset: 0,
      hasMore: true,
    });
  });
});
