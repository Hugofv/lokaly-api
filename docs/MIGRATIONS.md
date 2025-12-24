# Database Migrations

## Overview

Database migrations are **NOT** run automatically when the application starts. This is a best practice to ensure:

- **Control**: Migrations are run explicitly when needed
- **Safety**: Prevents accidental schema changes in production
- **CI/CD**: Migrations can be run as part of deployment pipeline
- **Performance**: Faster application startup

## Running Migrations

### Development

For development, use `db:push` to sync schema directly:

```bash
cd backend/packages/db
bun run db:push
```

### Production / Staging

For production and staging, use migrations:

```bash
cd backend/packages/db
bun run db:migrate
```

## When to Run Migrations

1. **Before starting the application** (first time setup)
2. **After pulling new code** that includes schema changes
3. **As part of CI/CD pipeline** before deploying
4. **Manually** when you need to apply schema changes

## Migration Workflow

1. **Generate migration** (after schema changes):
   ```bash
   cd backend/packages/db
   bun run db:generate
   ```

2. **Review the generated migration** in `drizzle/` folder

3. **Apply migration**:
   ```bash
   bun run db:migrate
   ```

4. **Or use push** (dev only):
   ```bash
   bun run db:push
   ```

## Troubleshooting

If you encounter migration errors, see [MIGRATION_TROUBLESHOOTING.md](./MIGRATION_TROUBLESHOOTING.md)

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run migrations
  run: |
    cd backend/packages/db
    bun run db:migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Important Notes

- ⚠️ **Never run migrations automatically on application startup**
- ✅ **Always test migrations in staging before production**
- ✅ **Review generated migrations before applying**
- ✅ **Use `db:push` only in development**
