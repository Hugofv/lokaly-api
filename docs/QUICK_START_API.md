# Quick Start - Testando as APIs

## 1. Iniciar os Servidores

### Admin API
```bash
cd backend/apps/admin-api
bun run dev
```
Acesse: http://localhost:3001

### Public API
```bash
cd backend/apps/public-api
bun run dev
```
Acesse: http://localhost:3000

## 2. Acessar Documentação Swagger

### Admin API Swagger
http://localhost:3001/swagger

### Public API Swagger
http://localhost:3000/swagger

## 3. Testar Autenticação (Admin API)

1. Acesse http://localhost:3001/swagger
2. Expanda `POST /api/admin/auth/login`
3. Clique em "Try it out"
4. Use as credenciais do seed:
```json
{
  "email": "admin@lokaly.com",
  "passwordHash": "admin123"
}
```
5. Execute e copie o `accessToken`
6. Clique em "Authorize" no topo
7. Cole o token e clique em "Authorize"

## 4. Testar Endpoints Protegidos

Agora você pode testar qualquer endpoint protegido:
- `GET /api/admin/users` - Listar usuários
- `GET /api/admin/products` - Listar produtos
- etc.

## 5. Testar Public API (Catálogo)

1. Acesse http://localhost:3000/swagger
2. Teste endpoints públicos (não requerem auth):
   - `GET /api/catalog/departments`
   - `GET /api/catalog/products`
   - `GET /api/catalog/products/search?q=arroz`

## 6. Exportar Especificação OpenAPI

```bash
# Admin API
curl http://localhost:3001/swagger/json > admin-api.json

# Public API
curl http://localhost:3000/swagger/json > public-api.json
```

## Próximos Passos

- Veja `/docs/openapi.md` para detalhes completos
- Veja `/docs/API_DOCUMENTATION.md` para guia completo
