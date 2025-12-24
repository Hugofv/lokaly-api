# API Documentation Guide

## OpenAPI / Swagger

Ambas as APIs estão documentadas com OpenAPI/Swagger e podem ser acessadas através de interfaces interativas.

### URLs de Acesso

#### Admin API
- **Swagger UI:** http://localhost:3001/swagger
- **OpenAPI JSON:** http://localhost:3001/swagger/json

#### Public API
- **Swagger UI:** http://localhost:3000/swagger
- **OpenAPI JSON:** http://localhost:3000/swagger/json

## Como Usar o Swagger UI

### 1. Autenticação

#### Admin API
1. Acesse `http://localhost:3001/swagger`
2. Expanda o endpoint `POST /api/admin/auth/login`
3. Clique em "Try it out"
4. Preencha:
```json
{
  "email": "admin@lokaly.com",
  "passwordHash": "admin123"
}
```
5. Execute e copie o `accessToken`
6. Clique no botão "Authorize" no topo
7. Cole o token (sem "Bearer") e clique em "Authorize"

#### Public API
- A autenticação é opcional para endpoints de catálogo
- Para endpoints de pedidos, siga o mesmo processo acima

### 2. Testar Endpoints

1. Expanda o endpoint desejado
2. Clique em "Try it out"
3. Preencha os parâmetros (se houver)
4. Clique em "Execute"
5. Veja a resposta na seção "Responses"

### 3. Exportar Especificação

```bash
# Admin API
curl http://localhost:3001/swagger/json > admin-api-openapi.json

# Public API
curl http://localhost:3000/swagger/json > public-api-openapi.json
```

## Estrutura da Documentação

### Admin API

#### Tags
- **Auth:** Autenticação (login, refresh)
- **Users:** Gerenciamento de usuários admin
- **Customers:** Gerenciamento de clientes
- **Addresses:** Gerenciamento de endereços
- **Couriers:** Gerenciamento de entregadores
- **Products:** Gerenciamento de produtos
- **Health:** Health check

#### Endpoints Principais

**Auth:**
- `POST /api/admin/auth/login` - Login admin
- `POST /api/admin/auth/refresh` - Refresh token

**Users:**
- `GET /api/admin/users` - Listar usuários (paginado)
- `GET /api/admin/users/search` - Buscar por email
- `GET /api/admin/users/:id` - Buscar por ID
- `POST /api/admin/users` - Criar usuário
- `PATCH /api/admin/users/:id` - Atualizar usuário
- `DELETE /api/admin/users/:id` - Deletar usuário

### Public API

#### Tags
- **Catalog:** Catálogo de produtos
- **Orders:** Pedidos
- **Health:** Health check

#### Endpoints Principais

**Catalog:**
- `GET /api/catalog/departments` - Listar departamentos
- `GET /api/catalog/categories?departmentId=X` - Listar categorias
- `GET /api/catalog/subcategories?categoryId=X` - Listar subcategorias
- `GET /api/catalog/brands` - Listar marcas
- `GET /api/catalog/products` - Listar produtos (paginado)
- `GET /api/catalog/products/:id` - Buscar produto por ID
- `GET /api/catalog/products/by-sku?sku=XXX` - Buscar por SKU
- `GET /api/catalog/products/search?q=XXX` - Buscar produtos

**Orders:**
- `POST /api/orders` - Criar pedido (requer auth)
- `GET /api/orders/:id` - Buscar pedido (requer auth)

## Respostas Padronizadas

### Paginação
Todos os endpoints de listagem retornam:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Erros
```json
{
  "error": "Error message"
}
```

## Integração com Ferramentas

### Postman
1. Importe o arquivo OpenAPI JSON
2. Configure a collection
3. Use variáveis de ambiente para tokens

### Insomnia
1. Importe o arquivo OpenAPI JSON
2. Configure autenticação JWT
3. Teste os endpoints

### Redoc
```bash
npx @redocly/cli preview-docs admin-api-openapi.json
```

## Desenvolvimento

Para adicionar documentação a novos endpoints, use o parâmetro `detail`:

```typescript
.get(
  '/endpoint',
  handler,
  {
    ...validators,
    detail: {
      tags: ['TagName'],
      summary: 'Short description',
      description: 'Long description',
      security: [{ bearerAuth: [] }], // Se requer auth
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              example: { /* exemplo */ }
            }
          }
        }
      }
    }
  }
)
```

Veja mais detalhes em `/docs/openapi.md`.
