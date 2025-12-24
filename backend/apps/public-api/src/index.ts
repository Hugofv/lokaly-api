/**
 * Public API Server
 * 
 * Public-facing API for customers and couriers.
 * 
 * Architecture:
 * - Separate server on port 3000
 * - REST + WebSocket support
 * - JWT authentication
 * - Rate limiting
 * - Real-time order tracking via WebSocket
 * - Emits domain events to Redis
 */

import { initDb, getDb, runMigrations } from "@lokaly/db";
import { JwtService } from "@lokaly/auth";
import { OrderService } from "@lokaly/domain";
import { RedisEventPublisher } from "./infra/redis-publisher";
import { rateLimiter as checkRateLimit } from "./middleware/rate-limiter";
import { authMiddleware } from "./middleware/auth";

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "public-api-secret-key-change-in-production";

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

  // Initialize Redis event publisher
  eventPublisher = new RedisEventPublisher();
  await eventPublisher.connect(process.env.REDIS_URL || "redis://localhost:6379");

  // Initialize JWT service
  jwtService = new JwtService(JWT_SECRET);

  // Initialize domain services
  orderService = new OrderService(db, eventPublisher);

  console.log(`[Public API] Initialized on port ${PORT}`);
}

/**
 * WebSocket connections for real-time order tracking
 */
const wsConnections = new Map<string, Set<WebSocket>>();

function addOrderTrackingWS(orderId: string, ws: WebSocket) {
  if (!wsConnections.has(orderId)) {
    wsConnections.set(orderId, new Set());
  }
  wsConnections.get(orderId)!.add(ws);
}

function removeOrderTrackingWS(orderId: string, ws: WebSocket) {
  for (const [orderId, connections] of wsConnections.entries()) {
    connections.delete(ws);
    if (connections.size === 0) {
      wsConnections.delete(orderId);
    }
  }
}

function broadcastOrderUpdate(orderId: string, data: unknown) {
  const connections = wsConnections.get(orderId);
  if (connections) {
    const message = JSON.stringify(data);
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

/**
 * Start server
 */
await init();

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // Rate limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          resetAt: rateLimit.resetAt 
        }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Health check (no auth required)
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "public-api" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Auth required for all other endpoints
    const auth = await authMiddleware(req, jwtService);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // REST API Routes
    if (url.pathname === "/api/orders" && req.method === "POST") {
      try {
        const body = await req.json();
        const order = await orderService.createOrder({
          customerId: auth.userId,
          items: body.items,
          deliveryAddress: body.deliveryAddress,
        });

        return new Response(JSON.stringify(order), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (url.pathname.startsWith("/api/orders/") && req.method === "GET") {
      const orderId = url.pathname.split("/")[3];
      try {
        const order = await orderService.getOrderById(orderId);

        // Check authorization: customers can only see their own orders
        if (auth.role === "customer" && order?.customerId !== auth.userId) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

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

    // WebSocket endpoint for real-time order tracking
    if (url.pathname.startsWith("/ws/orders/") && req.headers.get("Upgrade") === "websocket") {
      const orderId = url.pathname.split("/")[3];
      const order = await orderService.getOrderById(orderId);

      if (!order) {
        return new Response("Order not found", { status: 404 });
      }

      // Check authorization
      if (auth.role === "customer" && order.customerId !== auth.userId) {
        return new Response("Forbidden", { status: 403 });
      }

      return new Response(null, {
        status: 101,
        webSocket: {
          open(ws) {
            addOrderTrackingWS(orderId, ws);
            ws.send(JSON.stringify({ type: "connected", orderId }));
          },
          message(ws, message) {
            // Echo back for ping/pong
            ws.send(message);
          },
          close(ws) {
            removeOrderTrackingWS(orderId, ws);
          },
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    // WebSocket configuration is handled in fetch above
  },
});

console.log(`🚀 Public API server running on http://localhost:${PORT}`);

