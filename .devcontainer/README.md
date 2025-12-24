# Dev Container Setup

Este diretório contém a configuração para usar o projeto em um Dev Container no VS Code ou Cursor.

## Como Usar

### VS Code / Cursor

1. **Instale a extensão Dev Containers:**
   - VS Code: "Dev Containers" (ms-vscode-remote.remote-containers)
   - Cursor: Já vem instalado

2. **Abra o projeto:**
   - Abra a pasta raiz do projeto no VS Code/Cursor

3. **Reabra no Container:**
   - Pressione `F1` ou `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows/Linux)
   - Digite: "Dev Containers: Reopen in Container"
   - Selecione a opção

4. **Aguarde a construção:**
   - O container será construído automaticamente
   - PostgreSQL e Redis serão iniciados
   - Dependências serão instaladas

## O que está incluído

- **Bun runtime** - Última versão do Bun
- **PostgreSQL** - Banco de dados rodando no container
- **Redis** - Cache e fila de eventos
- **Extensões recomendadas:**
  - Bun for VS Code
  - ESLint
  - Prettier
  - TypeScript

## Portas Forwardadas

- `3000` - Public API
- `3001` - Admin API
- `5432` - PostgreSQL
- `6379` - Redis

## Comandos Úteis

Uma vez dentro do container:

```bash
# Instalar/atualizar dependências
bun install

# Rodar todos os serviços
bun run dev:all

# Rodar serviços individualmente
bun run dev:public-api
bun run dev:admin-api
bun run dev:worker

# Testes
bun test

# Ver logs do PostgreSQL
docker-compose logs postgres

# Ver logs do Redis
docker-compose logs redis
```

## Variáveis de Ambiente

As variáveis de ambiente são configuradas automaticamente no `devcontainer.json`:

- `DATABASE_URL` - Conexão com PostgreSQL
- `REDIS_URL` - Conexão com Redis
- `JWT_SECRET` - Secret para JWT da API pública
- `ADMIN_JWT_SECRET` - Secret para JWT da API admin

## Troubleshooting

### Container não inicia

1. Verifique se o Docker está rodando
2. Verifique os logs: `docker-compose logs`
3. Tente rebuild: `F1` → "Dev Containers: Rebuild Container"

### Portas em conflito

Se as portas estiverem em uso, você pode alterá-las no `.devcontainer/docker-compose.yml`.

### Dependências não instaladas

Execute manualmente:
```bash
bun install
```

### Problemas com volumes

Se os arquivos não estiverem sincronizando:
1. Verifique se o Docker tem permissões adequadas
2. Tente rebuild do container

## Personalização

Você pode personalizar o Dev Container editando:
- `.devcontainer/devcontainer.json` - Configuração principal
- `.devcontainer/docker-compose.yml` - Serviços Docker

## Mais Informações

- [Documentação Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [Docker Compose](https://docs.docker.com/compose/)

