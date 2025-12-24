# Admin API Controllers

## Estrutura

Os controllers foram criados na pasta `src/controllers/` e organizados por entidade.

## Controllers Implementados

### ✅ Base Controller (`base.ts`)

- Helpers para respostas HTTP
- `jsonResponse()` - Resposta JSON padrão
- `errorResponse()` - Resposta de erro
- `parseId()` - Parse de IDs da URL
- `parseQueryParams()` - Parse de query parameters

### ✅ Users Controller (`usersController.ts`)

- `GET /api/admin/users` - Listar usuários (com paginação e filtros)
- `GET /api/admin/users/:id` - Buscar por ID
- `GET /api/admin/users/search?email=...` - Buscar por email
- `POST /api/admin/users` - Criar usuário
- `PATCH /api/admin/users/:id` - Atualizar usuário
- `DELETE /api/admin/users/:id` - Deletar usuário

### ✅ Customers Controller (`customersController.ts`)

- `GET /api/admin/customers` - Listar clientes (com paginação e filtros)
- `GET /api/admin/customers/:id` - Buscar por ID
- `GET /api/admin/customers/search?q=...` - Buscar clientes
- `POST /api/admin/customers` - Criar cliente
- `PATCH /api/admin/customers/:id` - Atualizar cliente
- `DELETE /api/admin/customers/:id` - Deletar cliente

### ✅ Addresses Controller (`addressesController.ts`)

- `GET /api/admin/addresses/:id` - Buscar por ID
- `GET /api/admin/customers/:id/addresses` - Buscar endereços do cliente
- `POST /api/admin/customers/:id/addresses` - Criar endereço
- `PATCH /api/admin/addresses/:id` - Atualizar endereço
- `DELETE /api/admin/addresses/:id` - Deletar endereço

### ✅ Couriers Controller (`couriersController.ts`)

- `GET /api/admin/couriers` - Listar entregadores (com paginação e filtros)
- `GET /api/admin/couriers/:id` - Buscar por ID
- `GET /api/admin/couriers/available` - Buscar entregadores disponíveis
- `GET /api/admin/couriers/search?q=...` - Buscar entregadores
- `POST /api/admin/couriers` - Criar entregador
- `PATCH /api/admin/couriers/:id` - Atualizar entregador
- `PATCH /api/admin/couriers/:id/location` - Atualizar localização
- `PATCH /api/admin/couriers/:id/availability` - Alterar disponibilidade
- `DELETE /api/admin/couriers/:id` - Deletar entregador

### ✅ Products Controller (`productsController.ts`)

- `GET /api/admin/products` - Listar produtos (com paginação e filtros)
- `GET /api/admin/products/:id` - Buscar por ID
- `GET /api/admin/products/by-sku?sku=...` - Buscar por SKU
- `GET /api/admin/products/search?q=...` - Buscar produtos
- `POST /api/admin/products` - Criar produto
- `PATCH /api/admin/products/:id` - Atualizar produto
- `DELETE /api/admin/products/:id` - Deletar produto

## Router

O `router.ts` conecta todas as rotas aos controllers apropriados.

## Próximos Controllers a Implementar

- Departments Controller
- Categories Controller
- Subcategories Controller
- Brands Controller
- Units Controller
- Warehouses Controller
- Product Images Controller
- Product Variants Controller
- Product Stock Controller
- Product Prices Controller
- Product Reviews Controller

## Uso

Os controllers são automaticamente registrados no `index.ts` através do `AdminRouter`. Todas as rotas requerem autenticação admin e respeitam RBAC.
