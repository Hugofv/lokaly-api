# Docker Configuration

Esta pasta contém todos os arquivos relacionados ao Docker.

## Estrutura de Arquivos

```
docker/
├── docker-compose.yml          # Configuração principal (produção/desenvolvimento)
├── docker-compose.dev.yml      # Overrides para desenvolvimento
├── Dockerfile.public-api       # Dockerfile para Public API
├── Dockerfile.admin-api         # Dockerfile para Admin API
├── Dockerfile.worker           # Dockerfile para Worker
├── .dockerignore               # Arquivos ignorados no build
└── README.md                   # Esta documentação
```

## Convenções de Nomenclatura

- **docker-compose.yml**: Arquivo principal do Docker Compose
- **docker-compose.{env}.yml**: Arquivos de override por ambiente (dev, prod, test)
- **Dockerfile.{service}**: Dockerfiles específicos por serviço
- **.dockerignore**: Arquivos ignorados no contexto de build

## Uso

### Comandos Básicos

Todos os comandos devem ser executados a partir da raiz do projeto ou usando o Makefile:

```bash
# Da raiz do projeto
cd docker && docker-compose up -d

# Ou usando Makefile (recomendado)
make up
```

### Build de Imagens

```bash
cd docker && docker-compose build
```

### Desenvolvimento

```bash
# Modo desenvolvimento com hot reload
cd docker && docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Contexto de Build

Os Dockerfiles usam o contexto da raiz do projeto (`..`), então os caminhos nos `COPY` devem ser relativos à raiz:

```dockerfile
COPY ../package.json ./
COPY ../backend ./backend
```

## Volumes

Os volumes são montados relativos à raiz do projeto:

```yaml
volumes:
  - ..:/app:cached  # Monta a raiz do projeto em /app
```

## Variáveis de Ambiente

As variáveis de ambiente podem ser definidas em:
1. Arquivo `.env` na raiz do projeto
2. Diretamente no `docker-compose.yml`
3. Via `docker-compose.override.yml` (não versionado)

## Serviços

### PostgreSQL
- **Porta**: 5432
- **User**: lokaly
- **Password**: lokaly
- **Database**: lokaly

### Redis
- **Porta**: 6379
- **Persistência**: Habilitada (AOF)

### Public API
- **Porta**: 3000
- **Hot Reload**: Habilitado em desenvolvimento

### Admin API
- **Porta**: 3001
- **Hot Reload**: Habilitado em desenvolvimento

### Worker
- **Sem porta exposta**
- **Hot Reload**: Habilitado em desenvolvimento

## Troubleshooting

### Problemas com caminhos

Se houver problemas com caminhos, verifique:
1. Os Dockerfiles usam `../` para acessar a raiz
2. Os volumes montam `..` (raiz do projeto)
3. O working directory está correto

### Rebuild completo

```bash
cd docker && docker-compose down -v
cd docker && docker-compose build --no-cache
cd docker && docker-compose up -d
```

## Convenções Adotadas

1. **Nomes de containers**: `lokaly-{service}`
2. **Nomes de volumes**: `{service}-data`
3. **Nomes de networks**: `lokaly-network`
4. **Imagens base**: `oven/bun:latest` para serviços Node.js/Bun
5. **Health checks**: Todos os serviços críticos têm health checks

