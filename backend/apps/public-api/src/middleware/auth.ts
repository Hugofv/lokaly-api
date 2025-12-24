/**
 * Authentication Middleware
 * 
 * Validates JWT tokens for public API endpoints.
 */

import { JwtService, extractToken, RBAC, type UserRole } from "@lokaly/auth";

export type AuthContext = {
  userId: string;
  role: UserRole;
  email?: string;
};

export async function authMiddleware(
  req: Request,
  jwtService: JwtService
): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization");
  const token = extractToken(authHeader);

  if (!token) {
    return null;
  }

  const payload = await jwtService.verify(token);
  if (!payload) {
    return null;
  }

  // Only allow customers and couriers on public API
  if (!RBAC.isPublicUser(payload.role)) {
    return null;
  }

  return {
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  };
}

