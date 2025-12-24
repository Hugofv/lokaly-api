# Docker Setup Guide

Este projeto inclui configuração Docker completa para desenvolvimento e produção.

## Estrutura

- `docker/docker-compose.yml` - Configuração principal com todos os serviços
- `docker/docker-compose.dev.yml` - Overrides para desenvolvimento (hot reload)
- `docker/Dockerfile.*` - Dockerfiles individuais para cada serviço
- `docker/.dockerignore` - Arquivos ignorados no build Docker
- `.devcontainer/` - Configuração para VS Code/Cursor Dev Containers

## Serviços Incluídos

1. **PostgreSQL** (porta 5432)
   - Database: `lokaly`
   - User: `lokaly`
   - Password: `lokaly`

2. **Redis** (porta 6379)
   - Persistência habilitada

3. **Public API** (porta 3000)
   - API pública para clientes e entregadores

4. **Admin API** (porta 3001)
   - API administrativa

5. **Worker** (sem porta exposta)
   - Processamento de eventos em background

## Uso Básico

### Iniciar todos os serviços

```bash
# Usando Makefile (recomendado)
make up

# Ou diretamente
cd docker && docker-compose up -d
```

### Ver logs

```bash
# Usando Makefile
make logs

# Ou diretamente
cd docker && docker-compose logs -f

# Serviço específico
cd docker && docker-compose logs -f public-api
cd docker && docker-compose logs -f worker
```

### Parar serviços

```bash
# Usando Makefile
make down

# Ou diretamente
cd docker && docker-compose down
```

### Parar e remover volumes (limpar dados)

```bash
# Usando Makefile
make clean

# Ou diretamente
cd docker && docker-compose down -v
```

### Rebuild após mudanças

```bash
# Usando Makefile
make build

# Ou diretamente
cd docker && docker-compose build
cd docker && docker-compose up -d
```

## Desenvolvimento com Hot Reload

Para desenvolvimento com hot reload (mudanças no código refletem automaticamente):

```bash
# Usando Makefile
make dev

# Ou diretamente
cd docker && docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Ou use o modo de desenvolvimento que já está configurado no `docker/docker-compose.yml` principal.

## Dev Container (VS Code/Cursor)

O projeto inclui configuração para Dev Containers:

1. Abra o projeto no VS Code ou Cursor
2. Pressione `F1` ou `Cmd+Shift+P`
3. Selecione "Dev Containers: Reopen in Container"
4. Aguarde a construção do container

O Dev Container inclui:
- Bun instalado
- PostgreSQL e Redis rodando
- Portas forwardadas automaticamente
- Extensões recomendadas instaladas

### Comandos no Dev Container

Uma vez dentro do container:

```bash
# Instalar dependências
bun install

# Rodar serviços individualmente
bun run dev:public-api
bun run dev:admin-api
bun run dev:worker

# Ou rodar todos
bun run dev:all
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://lokaly:lokaly@postgres:5432/lokaly
REDIS_URL=redis://redis:6379
JWT_SECRET=your-public-api-secret
ADMIN_JWT_SECRET=your-admin-api-secret
REDIS_CONSUMER_GROUP=worker-group
REDIS_CONSUMER_NAME=worker-1
```

As variáveis são carregadas automaticamente pelo docker-compose.

## Acessando os Serviços

### Do host (sua máquina)

- Public API: http://localhost:3000
- Admin API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### De dentro dos containers

- Public API: http://public-api:3000
- Admin API: http://admin-api:3001
- PostgreSQL: postgres:5432
- Redis: redis:6379

## Troubleshooting

### Porta já em uso

Se alguma porta estiver em uso, você pode alterar no `docker-compose.yml`:

```yaml
ports:
  - "3002:3000"  # Mude 3000 para 3002
```

### Container não inicia

Verifique os logs:
```bash
cd docker && docker-compose logs public-api
```

### Dados não persistem

Certifique-se de que os volumes estão sendo criados:
```bash
docker volume ls | grep lokaly
```

### Rebuild completo

Para fazer um rebuild completo:
```bash
cd docker && docker-compose down -v
cd docker && docker-compose build --no-cache
cd docker && docker-compose up -d
```

## Produção

Para produção, você deve:

1. Remover volumes de desenvolvimento
2. Usar variáveis de ambiente seguras
3. Configurar health checks adequados
4. Usar imagens otimizadas
5. Configurar logging adequado

Exemplo de comando para produção:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Comandos Úteis

```bash
# Entrar no container (usando Makefile)
make shell-public
make shell-admin
make shell-worker
make shell-postgres
make shell-redis

# Ou diretamente
cd docker && docker-compose exec public-api sh

# Ver status dos containers
cd docker && docker-compose ps

# Ver uso de recursos
docker stats

# Limpar tudo (cuidado!)
cd docker && docker-compose down -v --rmi all
```

