/**
 * Role-Based Access Control Middleware
 * 
 * Checks if a user role has permission to access a resource.
 */

import { RBAC, type UserRole } from "@lokaly/auth";

export function rbacMiddleware(
  userRole: UserRole,
  requiredRoles: UserRole | UserRole[]
): boolean {
  return RBAC.hasPermission(userRole, requiredRoles);
}

