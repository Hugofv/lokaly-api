# Architecture Documentation

## Overview

This backend follows a **monorepo architecture** with **event-driven design** principles. The architecture is designed for scalability, maintainability, and clear separation of concerns.

## Folder Structure

```
/backend
  /apps
    /public-api     → Public-facing API (Port 3000)
    /admin-api      → Admin-only API (Port 3001)
    /worker         → Background job processor
  /packages
    /domain         → Business logic (framework-agnostic)
    /events         → Event contracts
    /db             → Database schemas & migrations
    /auth           → Authentication & authorization
    /utils          → Shared utilities
  /infra
    /redis          → Redis configuration
    /postgres       → PostgreSQL configuration
    /env           → Environment variable templates
```

## Architecture Principles

### 1. Separated APIs

**Critical**: `public-api` and `admin-api` are completely separate servers.

- **Different Ports**: Public API (3000), Admin API (3001)
- **Different Authentication**: Public uses customer/courier JWT, Admin uses admin JWT
- **Different Rate Limits**: Public has stricter limits, Admin allows heavier queries
- **Different Middleware**: Each has its own middleware stack
- **Shared Code Only Through Packages**: No direct imports between apps

### 2. Event-Driven Architecture

Domain services **emit events**, they don't call other services directly.

**Flow:**
1. API receives request
2. Domain service processes business logic
3. Domain service emits event to Redis
4. Worker consumes event and triggers async processing

**Benefits:**
- Decoupling: Services don't know about each other
- Scalability: Async processing handles high loads
- Resilience: Failed events can be retried
- Flexibility: Easy to add new handlers

**Event Transport:**
- Currently: Redis Streams
- Future: Can replace with RabbitMQ/SQS without changing domain logic

### 3. Framework-Agnostic Domain

The domain layer has **zero framework dependencies**.

- No Bun-specific code in domain
- No HTTP-specific code in domain
- Pure TypeScript business logic
- Easy to test without framework setup

### 4. Package Boundaries

**Packages are independent:**
- `@lokaly/domain` - Business rules only
- `@lokaly/events` - Event contracts only
- `@lokaly/db` - Database access only
- `@lokaly/auth` - Authentication only
- `@lokaly/utils` - Shared helpers

**Apps depend on packages, not each other:**
- `public-api` imports from packages
- `admin-api` imports from packages
- `worker` imports from packages
- Apps never import from each other

## Data Flow Examples

### Creating an Order

```
1. Client → POST /api/orders (Public API)
2. Public API → OrderService.createOrder()
3. OrderService:
   - Validates business rules
   - Saves to database (transaction)
   - Emits order.created event to Redis
4. Worker consumes order.created event
5. Worker:
   - Reserves inventory (emits inventory.reserved)
   - Updates order status to "confirmed"
```

### Admin Viewing Orders

```
1. Admin → GET /api/admin/orders (Admin API)
2. Admin API → Validates admin JWT
3. Admin API → Queries database directly
4. Returns order list
```

### Real-Time Order Tracking

```
1. Client → WebSocket /ws/orders/:id (Public API)
2. Public API → Validates JWT & authorization
3. Establishes WebSocket connection
4. When order status changes:
   - Domain service emits order.status_changed event
   - Public API broadcasts update to WebSocket clients
```

## Domain Events

All domain events follow the pattern: `<domain>.<action>`

**Order Events:**
- `order.created`
- `order.status_changed`
- `order.cancelled`

**Inventory Events:**
- `inventory.reserved`
- `inventory.released`

**Picking Events:**
- `picking.started`
- `picking.completed`

**Delivery Events:**
- `delivery.assigned`
- `delivery.picked_up`
- `delivery.completed`

## Authentication & Authorization

### Public API
- **JWT Tokens**: Customers and couriers
- **Roles**: `customer`, `courier`
- **Rate Limiting**: 100 requests/minute per IP

### Admin API
- **JWT Tokens**: Admin users only
- **Roles**: `admin`, `super_admin`
- **RBAC**: Different permissions per role
- **No Rate Limiting**: Admin operations need flexibility

## Database

- **PostgreSQL**: Primary database
- **Shared Connection**: All apps use same connection pool
- **Transactions**: Handled in domain layer
- **Migrations**: Run automatically on startup

## Redis

- **Event Transport**: Domain events published to Redis streams
- **Job Queue**: Worker consumes from Redis streams
- **Idempotency**: Events processed with deduplication
- **Retry Logic**: Exponential backoff for failed events

## Worker

The worker service:
- Consumes events from Redis
- Processes async tasks:
  - Inventory reservations
  - Order status transitions
  - Notifications
  - Delivery assignments
- Implements idempotent processing
- Retries failed events with exponential backoff

## Scalability Considerations

### Horizontal Scaling
- **Public API**: Can run multiple instances (stateless)
- **Admin API**: Can run multiple instances (stateless)
- **Worker**: Can run multiple instances (Redis consumer groups handle distribution)

### Database Scaling
- Connection pooling configured
- Read replicas can be added for admin queries
- Indexes on frequently queried columns

### Event Processing Scaling
- Multiple workers can process events in parallel
- Redis consumer groups distribute load
- Dead letter queue for failed events

## Security Considerations

1. **JWT Secrets**: Separate secrets for public and admin APIs
2. **Rate Limiting**: Prevents abuse on public API
3. **RBAC**: Role-based access control on admin API
4. **Input Validation**: All inputs validated in domain layer
5. **SQL Injection**: Parameterized queries only
6. **CORS**: Configure appropriately for production

## Testing Strategy

1. **Unit Tests**: Domain logic (framework-agnostic)
2. **Integration Tests**: API endpoints
3. **Event Tests**: Event handlers
4. **E2E Tests**: Full workflows

## Deployment

### Development
```bash
bun run dev:all  # Starts all services
```

### Production
- Use process manager (PM2, systemd)
- Environment variables from secure store
- Health checks on `/health` endpoints
- Graceful shutdown handling

## Future Enhancements

1. **Replace Redis**: Can swap to RabbitMQ/SQS without changing domain
2. **Add GraphQL**: Can add GraphQL layer on top of domain
3. **Microservices**: Can split into separate services if needed
4. **CQRS**: Can add read models for complex queries
5. **Event Sourcing**: Can add event store for audit trail

