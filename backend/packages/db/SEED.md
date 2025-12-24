# Database Seeding Guide

## Overview

The seed script (`src/seed.ts`) populates the database with initial data required for the application to function properly.

## What Gets Seeded

### 1. Super Admin User

- **Email:** `admin@lokaly.com`
- **Password:** `admin123` (⚠️ **CHANGE THIS IN PRODUCTION!**)
- **Role:** `super_admin`
- **Status:** Active and email verified

### 2. Units of Measure

Basic units for products:

- **Weight:** kg, g, mg
- **Volume:** L, ml
- **Count:** un (unidade), cx (caixa), pct (pacote)
- **Length:** m, cm
- **Area:** m²

### 3. Departments

Basic supermarket departments:

- Alimentos
- Bebidas
- Limpeza
- Higiene Pessoal
- Hortifruti
- Carnes
- Laticínios
- Padaria
- Congelados

### 4. Categories (~39 categories)

Categories organized by department:

- **Alimentos:** Cereais e Grãos, Conservas, Doces, Salgadinhos, Biscoitos
- **Bebidas:** Refrigerantes, Sucos, Águas, Energéticos, Bebidas Alcoólicas
- **Limpeza:** Detergentes, Desinfetantes, Limpeza Geral, Papel Higiênico
- **Higiene:** Shampoo, Sabonetes, Cremes, Higiene Bucal, Desodorantes
- **Hortifruti:** Frutas, Verduras, Legumes, Temperos
- **Carnes:** Carne Bovina, Carne Suína, Aves, Peixes, Embutidos
- **Laticínios:** Leite, Queijos, Iogurtes, Manteigas
- **Padaria:** Pães, Bolos, Doces de Padaria
- **Congelados:** Carnes Congeladas, Pratos Prontos, Sorvetes, Hortifruti Congelado

### 5. Subcategories (~66 subcategories)

Detailed subcategories for each category, including:

- **Cereais:** Arroz, Feijão, Massas, Farinhas, Cereais Matinais
- **Conservas:** Milho, Ervilha, Palmito, Atum, Sardinha
- **Refrigerantes:** Cola, Guaraná, Laranja, Limonada
- **Sucos:** Suco Natural, Suco de Caixa, Néctar, Polpa
- **Carnes:** Patinho, Alcatra, Maminha, Costela, Peito de Frango, etc.
- **Queijos:** Mussarela, Prato, Minas, Ricota
- And many more...

## Running the Seed

```bash
cd backend/packages/db
bun run db:seed
```

Or set DATABASE_URL and run:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" bun run db:seed
```

## Idempotency

The seed script is **idempotent** - it checks if data already exists before creating:

- If super admin exists, it skips creation
- If units exist, it only creates missing ones
- If departments exist, it only creates missing ones
- If categories exist, it only creates missing ones (checks by department + code)
- If subcategories exist, it only creates missing ones (checks by category + code)

This means you can safely run the seed multiple times without creating duplicates.

## Data Hierarchy

The seed creates data in the following order (due to foreign key dependencies):

1. Super Admin (no dependencies)
2. Units (no dependencies)
3. Departments (no dependencies)
4. Categories (depends on Departments)
5. Subcategories (depends on Categories)

## Production Considerations

1. **Change Default Password:** The super admin password is hardcoded as `admin123`. Change this immediately after first login or modify the seed script to use an environment variable.

2. **Environment Variables:** Consider using environment variables for sensitive data:

   ```typescript
   const DEFAULT_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
   ```

3. **Custom Seeds:** You can extend the seed script to add more initial data as needed (brands, categories, warehouses, etc.).

## Extending the Seed

To add more seed data, add new functions following the same pattern:

```typescript
async function seedBrands() {
  const db = getDrizzle();
  // Check existing, insert missing
}
```

Then call it in the main `seed()` function.
