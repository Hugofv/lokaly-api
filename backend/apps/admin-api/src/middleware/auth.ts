/**
 * Authentication Middleware for Admin API
 * 
 * Validates JWT tokens and ensures admin role.
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

  // Only allow admin roles on admin API
  if (!RBAC.isAdmin(payload.role)) {
    return null;
  }

  return {
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  };
}

