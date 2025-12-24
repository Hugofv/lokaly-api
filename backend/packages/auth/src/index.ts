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

export type UserRole = 'customer' | 'courier' | 'admin' | 'super_admin';

export type JwtPayload = {
  userId: string;
  role: UserRole;
  email?: string;
  /**
   * Tipo de token para diferenciação de uso
   * - access: usado em Authorization: Bearer
   * - refresh: usado apenas para obter novo access
   */
  tokenType?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
};

/**
 * JWT Token Management
 *
 * Implementação real usando Bun.jwt:
 * - Assina com chave secreta (HS256)
 * - Inclui iat/exp no payload
 * - Valida assinatura e expiração no verify
 */
export class JwtService {
  private secret: string;
  private defaultTtlSeconds: number;

  constructor(secret: string, defaultTtlSeconds: number = 3600) {
    this.secret = secret;
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  /**
   * Sign a JWT token
   *
   * @param payload - Dados de domínio (sem iat/exp)
   * @param ttlSeconds - Tempo de expiração em segundos (override do default)
   */
  async sign(
    payload: Omit<JwtPayload, 'iat' | 'exp'>,
    ttlSeconds?: number
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (ttlSeconds ?? this.defaultTtlSeconds);

    const tokenPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp,
    };

    // Assinatura com Bun JWT (HS256 + chave secreta)
    // Usamos any para evitar depender dos tipos de Bun neste pacote
    const bunAny: any = Bun as any;
    const token = await bunAny.jwt.sign(
      {
        header: {
          alg: 'HS256',
          typ: 'JWT',
        },
        payload: tokenPayload,
      },
      this.secret
    );

    return token as string;
  }

  /**
   * Verify and decode a JWT token
   *
   * Retorna null se:
   * - Assinatura inválida
   * - Token expirado
   * - Payload malformado
   */
  async verify(token: string): Promise<JwtPayload | null> {
    try {
      const bunAny: any = Bun as any;
      const result = (await bunAny.jwt.verify(
        token,
        this.secret
      )) as JwtPayload;

      // Verificação extra de expiração (além da do Bun)
      if (result.exp && result.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return result;
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

    return requiredRoles.some((role) => userLevel >= roleHierarchy[role]);
  }

  /**
   * Check if user can access admin endpoints
   */
  static isAdmin(userRole: UserRole): boolean {
    return userRole === 'admin' || userRole === 'super_admin';
  }

  /**
   * Check if user can access public endpoints
   */
  static isPublicUser(userRole: UserRole): boolean {
    return userRole === 'customer' || userRole === 'courier';
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
