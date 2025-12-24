# @lokaly/db

Database package for Lokaly project using Drizzle ORM with PostgreSQL.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure database connection:
   Set `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/lokaly"
```

## Scripts

### Generate migrations

```bash
bun run db:generate
```

### Run migrations

```bash
bun run db:migrate
```

### Push schema to database (dev only)

```bash
bun run db:push
```

### Open Drizzle Studio

```bash
bun run db:studio
```

### Seed database

```bash
bun run db:seed
```

This will create:

- Super admin user (admin@lokaly.com / admin123)
- Basic units of measure (kg, g, L, ml, un, etc.)
- Basic departments (Alimentos, Bebidas, Limpeza, etc.)
- Categories (~39 categories organized by department)
- Subcategories (~66 subcategories for detailed product classification)

**⚠️ Important:** Change the default password after first login!

## Usage

```typescript
import { initDb, getDb, getDrizzle } from '@lokaly/db';
import { users } from '@lokaly/db/schema';
import { eq } from 'drizzle-orm';

// Initialize connection
const db = await initDb(process.env.DATABASE_URL);

// Use Drizzle ORM (recommended)
const drizzleDb = getDrizzle();
const user = await drizzleDb
  .select()
  .from(users)
  .where(eq(users.email, 'admin@lokaly.com'));

// Use raw SQL (legacy compatibility)
const result = await db.query('SELECT * FROM users WHERE email = $1', [
  'admin@lokaly.com',
]);
```

## Schema

All schema definitions are in `src/schema.ts`. The schema uses:

- `snake_case` for database columns
- `camelCase` for TypeScript properties
- `bigint` IDs mapped to `number` in TypeScript
- Timestamps: `created_at`, `updated_at`, `deleted_at`

## Enums

TypeScript enums are defined in `src/enums.ts` and used in the backend, not stored as database enums.
