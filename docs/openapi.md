# OpenAPI / Swagger Documentation

Ambas as APIs (Admin e Public) estão configuradas com documentação OpenAPI/Swagger usando o plugin `@elysiajs/swagger` do Elysia.

## Acessando a Documentação

### Admin API

- **Swagger UI:** `http://localhost:3001/swagger`
- **OpenAPI JSON:** `http://localhost:3001/swagger/json`

### Public API

- **Swagger UI:** `http://localhost:3000/swagger`
- **OpenAPI JSON:** `http://localhost:3000/swagger/json`

## Funcionalidades

### 1. Interface Interativa (Swagger UI)

- Navegação por tags (Auth, Users, Products, etc.)
- Teste de endpoints diretamente na interface
- Visualização de schemas de request/response
- Autenticação JWT integrada

### 2. Documentação Automática

- Todos os endpoints são documentados automaticamente
- Validações (validators) são convertidas em schemas OpenAPI
- Tipos TypeScript são inferidos e documentados

### 3. Autenticação JWT

- Botão "Authorize" no Swagger UI
- Insira o token no formato: `Bearer <token>`
- Token obtido via `/api/admin/auth/login` (Admin API)

## Estrutura da Documentação

### Admin API Tags

- **Auth:** Login e refresh token
- **Users:** Gerenciamento de usuários admin
- **Customers:** Gerenciamento de clientes
- **Addresses:** Gerenciamento de endereços
- **Couriers:** Gerenciamento de entregadores
- **Products:** Gerenciamento de produtos
- **Health:** Health check

### Public API Tags

- **Catalog:** Catálogo de produtos (departments, categories, products)
- **Orders:** Gerenciamento de pedidos
- **Health:** Health check

## Exemplos de Uso

### 1. Testar Login (Admin API)

1. Acesse `http://localhost:3001/swagger`
2. Expanda o endpoint `POST /api/admin/auth/login`
3. Clique em "Try it out"
4. Preencha o body:

```json
{
  "email": "admin@lokaly.com",
  "passwordHash": "admin123"
}
```

5. Execute e copie o `accessToken` retornado

### 2. Usar Token em Endpoints Protegidos

1. Clique no botão "Authorize" no topo da página
2. Cole o token no campo (sem "Bearer")
3. Clique em "Authorize"
4. Agora todos os endpoints protegidos usarão esse token

### 3. Testar Listagem de Produtos (Public API)

1. Acesse `http://localhost:3000/swagger`
2. Expanda `GET /api/catalog/products`
3. Clique em "Try it out"
4. Configure parâmetros opcionais (limit, offset, filters)
5. Execute e veja a resposta paginada

## Configuração

A configuração do Swagger está em:

- **Admin API:** `backend/apps/admin-api/src/app.ts`
- **Public API:** `backend/apps/public-api/src/app.ts`

### Personalização

Para adicionar mais detalhes aos endpoints, use o parâmetro `detail`:

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
          description: 'Success response',
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

## Exportar Especificação OpenAPI

Para exportar a especificação OpenAPI completa:

```bash
# Admin API
curl http://localhost:3001/swagger/json > admin-api-openapi.json

# Public API
curl http://localhost:3000/swagger/json > public-api-openapi.json
```

Esses arquivos podem ser importados em ferramentas como:

- Postman
- Insomnia
- Swagger Editor
- Redoc

## Integração com CI/CD

Você pode gerar a documentação automaticamente em pipelines:

```yaml
# Exemplo GitHub Actions
- name: Generate OpenAPI docs
  run: |
    curl http://localhost:3001/swagger/json > docs/admin-api.json
    curl http://localhost:3000/swagger/json > docs/public-api.json
```
