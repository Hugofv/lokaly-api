# Environment Configuration

Copy `.env.example` to `.env` in the root of the project and update with your actual values.

## Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for public API JWT tokens
- `ADMIN_JWT_SECRET`: Secret key for admin API JWT tokens

## Optional Variables

- `REDIS_CONSUMER_GROUP`: Consumer group name for worker (default: "worker-group")
- `REDIS_CONSUMER_NAME`: Consumer name for worker (default: "worker-{pid}")
- `PUBLIC_API_PORT`: Port for public API server (default: 3000)
- `ADMIN_API_PORT`: Port for admin API server (default: 3001)

