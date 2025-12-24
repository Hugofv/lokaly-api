# Troubleshooting Migrations

## Erro: "relation already exists" ou "sequence already exists"

Este erro ocorre quando objetos do banco (tabelas, sequências, índices) já existem mas a migração tenta criá-los novamente.

### Solução Rápida (Recomendada)

```bash
cd backend/packages/db
bun run db:push
```

O `db:push` sincroniza o schema diretamente e resolve a maioria dos problemas de migração em desenvolvimento.

### Soluções Alternativas

#### 1. Usar `db:push` em desenvolvimento (recomendado)

`db:push` sincroniza o schema diretamente sem usar migrações:

```bash
cd backend/packages/db
bun run db:push
```

**⚠️ Atenção:** `db:push` é apenas para desenvolvimento. Em produção, sempre use migrações.

#### 2. Limpar e recriar o banco (apenas desenvolvimento)

```bash
# Conectar ao PostgreSQL
psql -U lokaly -d lokaly

# Dropar e recriar o banco
DROP DATABASE lokaly;
CREATE DATABASE lokaly;

# Sair do psql
\q

# Rodar migrações novamente
cd backend/packages/db
bun run db:migrate
```

#### 2. Usar script de correção automática

```bash
cd backend/packages/db
bun run db:fix
```

Este script detecta e remove sequências órfãs automaticamente.

#### 3. Corrigir delivery_assignments especificamente

Se o erro for especificamente com `delivery_assignments`:

```bash
cd backend/packages/db
bun run db:fix-delivery
```

Este script remove a tabela e sequência problemáticas para permitir recriação.

#### 4. Remover objetos órfãos manualmente

Se apenas alguns objetos estão causando problemas:

```sql
-- Conectar ao PostgreSQL
psql -U lokaly -d lokaly

-- Verificar se a sequência existe
SELECT * FROM pg_sequences WHERE sequencename = 'delivery_assignments_id_seq';

-- Se existir e a tabela não existir, remover a sequência
DROP SEQUENCE IF EXISTS delivery_assignments_id_seq CASCADE;

-- Ou remover a tabela e sequência juntos
DROP TABLE IF EXISTS delivery_assignments CASCADE;
```

#### 5. Verificar estado das migrações

```bash
# Ver quais migrações foram aplicadas
psql -U lokaly -d lokaly -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;"
```

### Prevenção

1. **Sempre use `db:generate` antes de `db:migrate`** para criar migrações corretas
2. **Em desenvolvimento**, prefira `db:push` para sincronização rápida
3. **Em produção**, sempre use `db:migrate` e teste em staging primeiro
4. **Nunca edite migrações já aplicadas** - crie novas migrações para corrigir problemas

### Comandos Úteis

```bash
# Gerar nova migração baseada no schema atual
bun run db:generate

# Aplicar migrações pendentes
bun run db:migrate

# Sincronizar schema diretamente (dev only)
bun run db:push

# Ver schema no Drizzle Studio
bun run db:studio
```
