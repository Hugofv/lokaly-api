/**
 * Shared Response Helpers
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
