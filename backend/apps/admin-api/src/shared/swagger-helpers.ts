/**
 * Swagger Helpers
 * Helper functions for consistent Swagger documentation
 */

export function withTag<T extends Record<string, any>>(
  validator: T,
  tag: string,
  summary: string,
  description?: string
): T & { detail: { tags: string[]; summary: string; description?: string; security?: any[] } } {
  return {
    ...validator,
    detail: {
      tags: [tag],
      summary,
      description,
      security: [{ bearerAuth: [] }],
    },
  };
}
