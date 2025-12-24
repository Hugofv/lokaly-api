/**
 * Shared Response Helpers (public API)
 */

export function jsonResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown
): Response {
  const response: { error: string; details?: unknown } = { error: message };
  if (details) {
    response.details = details;
  }
  return jsonResponse(response, status);
}

type PaginatedMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export function buildPaginationMeta(
  total: number,
  limit: number,
  offset: number
): PaginatedMeta {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): Response {
  return jsonResponse({
    data,
    pagination: buildPaginationMeta(total, limit, offset),
  });
}
