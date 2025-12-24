/**
 * Base Controller Utilities
 * Helper functions for HTTP responses
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

export function successResponse<T>(data: T, status: number = 200): Response {
  return jsonResponse({ success: true, data }, status);
}

export function parseId(pathname: string, index: number): number | null {
  const parts = pathname.split('/').filter(Boolean);
  const id = parts[index];
  if (!id) return null;
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
}

export function parseQueryParams(url: URL): {
  limit: number;
  offset: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
} {
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const orderBy = url.searchParams.get('orderBy') || undefined;
  const orderDirection = (url.searchParams.get('orderDirection') || 'desc') as
    | 'asc'
    | 'desc';

  return { limit, offset, orderBy, orderDirection };
}
