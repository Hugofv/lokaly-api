/**
 * Admin API Server
 * 
 * Admin-only API for backoffice operations.
 * 
 * Architecture:
 * - Separate server on port 3001
 * - REST only (no WebSocket)
 * - Strict admin authentication
 * - Role-based access control (RBAC)
 * - Heavy read queries allowed
 * - No exposure to public internet without protection
 */

import { initDb, getDb, runMigrations } from "@lokaly/db";
import { JwtService, RBAC, type UserRole } from "@lokaly/auth";
import { OrderService } from "@lokaly/domain";
import { authMiddleware } from "./middleware/auth";
import { rbacMiddleware } from "./middleware/rbac";
import { RedisEventPublisher } from "./infra/redis-publisher";

const PORT = 3001;
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "admin-api-secret-key-change-in-production";

// Initialize services
let jwtService: JwtService;
let orderService: OrderService;
let eventPublisher: RedisEventPublisher;

/**
 * Initialize application
 */
async function init() {
  // Initialize database
  const dbConnectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/lokaly";
  await initDb(dbConnectionString);
  const db = getDb();
  await runMigrations(db);

  // Initialize JWT service (separate secret from public API)
  jwtService = new JwtService(JWT_SECRET);

  // Initialize Redis event publisher
  eventPublisher = new RedisEventPublisher();
  await eventPublisher.connect(process.env.REDIS_URL || "redis://localhost:6379");

  // Initialize domain services
  orderService = new OrderService(db, eventPublisher);

  console.log(`[Admin API] Initialized on port ${PORT}`);
}

/**
 * Start server
 */
await init();

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check (no auth required)
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "admin-api" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // All admin endpoints require authentication
    const auth = await authMiddleware(req, jwtService);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    if (!RBAC.isAdmin(auth.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Admin endpoints with RBAC
    if (url.pathname === "/api/admin/orders" && req.method === "GET") {
      // Check if user has permission to list orders
      if (!rbacMiddleware(auth.role, ["admin", "super_admin"])) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // In production, implement pagination and filtering
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        // This would query the database directly
        // For now, returning a placeholder
        return new Response(
          JSON.stringify({
            orders: [],
            pagination: { limit, offset, total: 0 },
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (url.pathname.startsWith("/api/admin/orders/") && req.method === "GET") {
      const orderId = url.pathname.split("/")[4];
      try {
        const order = await orderService.getOrderById(orderId);

        if (!order) {
          return new Response(JSON.stringify({ error: "Order not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(order), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Update order status (admin only)
    if (url.pathname.startsWith("/api/admin/orders/") && url.pathname.endsWith("/status") && req.method === "PATCH") {
      const orderId = url.pathname.split("/")[4];
      
      // Only super_admin can manually change order status
      if (!rbacMiddleware(auth.role, ["super_admin"])) {
        return new Response(JSON.stringify({ error: "Forbidden: Super admin required" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        const order = await orderService.updateOrderStatus(
          orderId,
          body.status,
          auth.userId
        );

        return new Response(JSON.stringify(order), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Cancel order (admin only)
    if (url.pathname.startsWith("/api/admin/orders/") && url.pathname.endsWith("/cancel") && req.method === "POST") {
      const orderId = url.pathname.split("/")[4];
      
      // Admin and super_admin can cancel orders
      if (!rbacMiddleware(auth.role, ["admin", "super_admin"])) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        await orderService.cancelOrder(orderId, body.reason || "Cancelled by admin", auth.userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🔐 Admin API server running on http://localhost:${PORT}`);

