# Lokaly API - Production-Ready Backend Architecture

A production-ready backend architecture using Bun as the runtime, following event-driven architecture principles.

## Architecture Overview

This is a **monorepo** containing multiple applications and shared packages:

```
/backend
  /apps
    /public-api     → Public-facing API (customers & couriers) - Port 3000
    /admin-api      → Admin-only API (backoffice) - Port 3001
    /worker         → Background jobs & async event processing
  /packages
    /domain         → Business rules (orders, inventory, delivery)
    /events         → Event contracts (order.created, etc.)
    /db             → Database schemas and migrations
    /auth           → Auth logic (JWT, roles, permissions)
    /utils          → Shared helpers
  /infra
    /redis          → Redis configuration
    /postgres       → PostgreSQL configuration
    /env            → Environment variable templates
```

## Key Principles

1. **Separated APIs**: `public-api` and `admin-api` are completely separate servers with different ports, authentication, and middleware stacks
2. **Event-Driven**: Domain logic emits events (not calls services directly), transported via Redis
3. **Framework-Agnostic Domain**: Domain layer has no framework dependencies
4. **Scalable**: Architecture allows replacing Redis with RabbitMQ/SQS without changing domain logic

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- PostgreSQL running (or use Docker Compose)
- Redis running (or use Docker Compose)

### Setup

#### Opção 1: Docker (Recomendado)

1. **Start all services with Docker:**
```bash
# Usando Makefile (recomendado)
make up

# Ou diretamente
cd docker && docker-compose up -d
```

Isso inicia:
- PostgreSQL (porta 5432)
- Redis (porta 6379)
- Public API (porta 3000)
- Admin API (porta 3001)
- Worker (background)

2. **View logs:**
```bash
# Usando Makefile
make logs

# Ou diretamente
cd docker && docker-compose logs -f
```

3. **Stop services:**
```bash
# Usando Makefile
make down

# Ou diretamente
cd docker && docker-compose down
```

#### Opção 2: Local Development

1. **Install dependencies:**
```bash
bun install
```

2. **Start infrastructure (if using Docker):**
```bash
docker-compose up -d postgres redis
```

3. **Configure environment:**
```bash
cp backend/infra/env/.env.example .env
# Edit .env with your configuration
```

4. **Start services:**

```bash
# Start all services
bun run dev:all

# Or start individually:
bun run dev:public-api  # Port 3000
bun run dev:admin-api   # Port 3001
bun run dev:worker      # Background jobs
```

#### Opção 3: Dev Container (VS Code/Cursor)

1. Abra o projeto no VS Code/Cursor
2. Pressione `F1` → "Dev Containers: Reopen in Container"
3. Aguarde a construção do container
4. Execute `bun install` e `bun run dev:all`

Veja [DOCKER.md](./DOCKER.md) para mais detalhes.

## API Endpoints

### Public API (Port 3000)

- `GET /health` - Health check
- `POST /api/orders` - Create order (requires JWT)
- `GET /api/orders/:id` - Get order (requires JWT)
- `WS /ws/orders/:id` - Real-time order tracking (requires JWT)

**Authentication:** JWT tokens for customers and couriers

### Admin API (Port 3001)

- `GET /health` - Health check
- `GET /api/admin/orders` - List all orders (admin only)
- `GET /api/admin/orders/:id` - Get order details (admin only)
- `PATCH /api/admin/orders/:id/status` - Update order status (super_admin only)
- `POST /api/admin/orders/:id/cancel` - Cancel order (admin only)

**Authentication:** JWT tokens for admin and super_admin roles

## Domain Events

Events are emitted by domain services and consumed by the worker:

- `order.created` - New order created
- `order.status_changed` - Order status updated
- `order.cancelled` - Order cancelled
- `inventory.reserved` - Inventory reserved for order
- `inventory.released` - Inventory reservation released
- `picking.started` - Order picking started
- `picking.completed` - Order picking completed
- `delivery.assigned` - Delivery assigned to courier
- `delivery.picked_up` - Delivery picked up
- `delivery.completed` - Delivery completed

## Architecture Decisions

### Why Separate APIs?

- **Security**: Admin API can have stricter authentication and rate limits
- **Scalability**: Each API can scale independently
- **Deployment**: Can deploy updates to one API without affecting the other
- **Monitoring**: Separate metrics and logging

### Why Event-Driven?

- **Decoupling**: Services don't directly call each other
- **Scalability**: Async processing allows handling high loads
- **Resilience**: Failed events can be retried
- **Flexibility**: Easy to add new event handlers without changing existing code

### Why Framework-Agnostic Domain?

- **Testability**: Domain logic can be tested without framework setup
- **Portability**: Can switch frameworks (Express, Fastify, etc.) without changing business logic
- **Maintainability**: Clear separation of concerns

## Development

### Adding a New Domain Event

1. Define event type in `backend/packages/events/src/index.ts`
2. Add event handler in `backend/apps/worker/src/handlers/event-handler.ts`
3. Emit event from domain service

### Adding a New API Endpoint

1. Add route handler in appropriate API (`public-api` or `admin-api`)
2. Use domain services (don't put business logic in controllers)
3. Emit events through domain services

### Testing

```bash
bun test
```

## Production Considerations

1. **Environment Variables**: Use secure secrets management
2. **Rate Limiting**: Implement Redis-based rate limiting for distributed systems
3. **Database Pooling**: Configure connection pooling for PostgreSQL
4. **Redis Clustering**: Use Redis Cluster for high availability
5. **Monitoring**: Add logging, metrics, and tracing
6. **Error Handling**: Implement dead letter queues for failed events
7. **Security**: Use HTTPS, CORS, and input validation

## License

MIT
