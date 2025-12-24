/**
 * Authentication Package
 * 
 * Shared authentication and authorization logic.
 * Supports JWT for public API and RBAC for admin API.
 * 
 * Architecture Decision:
 * - Framework-agnostic auth logic
 * - JWT tokens for public API (users & couriers)
 * - Role-based access control for admin API
 * - Token validation separated from framework concerns
 */

export type UserRole = "customer" | "courier" | "admin" | "super_admin";

export type JwtPayload = {
  userId: string;
  role: UserRole;
  email?: string;
  iat?: number;
  exp?: number;
};

/**
 * JWT Token Management
 */
export class JwtService {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Sign a JWT token
   */
  async sign(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + 3600, // 1 hour expiry
    };

    // Using Bun's built-in JWT support
    // In practice: return await Bun.jwt.sign(tokenPayload, this.secret);
    // For now, returning a placeholder
    return Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
  }

  /**
   * Verify and decode a JWT token
   */
  async verify(token: string): Promise<JwtPayload | null> {
    try {
      // Using Bun's built-in JWT support
      // In practice: return await Bun.jwt.verify(token, this.secret);
      const decoded = JSON.parse(
        Buffer.from(token, "base64url").toString("utf-8")
      ) as JwtPayload;

      // Check expiry
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return decoded;
    } catch {
      return null;
    }
  }
}

/**
 * Role-Based Access Control
 */
export class RBAC {
  /**
   * Check if a role has permission to perform an action
   */
  static hasPermission(
    userRole: UserRole,
    requiredRole: UserRole | UserRole[]
  ): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      customer: 1,
      courier: 2,
      admin: 3,
      super_admin: 4,
    };

    const requiredRoles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];

    const userLevel = roleHierarchy[userRole] || 0;

    return requiredRoles.some(
      (role) => userLevel >= roleHierarchy[role]
    );
  }

  /**
   * Check if user can access admin endpoints
   */
  static isAdmin(userRole: UserRole): boolean {
    return userRole === "admin" || userRole === "super_admin";
  }

  /**
   * Check if user can access public endpoints
   */
  static isPublicUser(userRole: UserRole): boolean {
    return userRole === "customer" || userRole === "courier";
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

