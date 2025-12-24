# CRUDs Implementados

Todos os CRUDs foram implementados com cache Redis estratégico e invalidação inteligente.

## CRUDs de Gestão de Usuários

### ✅ Users Service (`users/`)

- `findById(id)` - Buscar por ID
- `findByEmail(email)` - Buscar por email
- `findMany(options)` - Listar com paginação e filtros
- `create(data)` - Criar usuário
- `update(id, data)` - Atualizar usuário
- `delete(id)` - Soft delete
- `count(filters)` - Contar usuários

**Cache**: 5 min (entidades), 2 min (listas)

---

### ✅ Customers Service (`customers/`)

- `findById(id)` - Buscar por ID
- `findByEmail(email)` - Buscar por email
- `findByCpf(cpf)` - Buscar por CPF
- `findByReferralCode(code)` - Buscar por código de referência
- `findMany(options)` - Listar com paginação e filtros
- `search(query, limit)` - Buscar por nome/email
- `create(data)` - Criar cliente
- `update(id, data)` - Atualizar cliente
- `delete(id)` - Soft delete
- `count(filters)` - Contar clientes

**Cache**: 5 min (entidades), 10 min (referral codes), 1 min (busca)

---

### ✅ Addresses Service (`addresses/`)

- `findById(id)` - Buscar por ID
- `findByCustomerId(customerId)` - Buscar endereços do cliente
- `findDefaultByCustomerId(customerId)` - Buscar endereço padrão
- `create(data)` - Criar endereço
- `update(id, data)` - Atualizar endereço
- `delete(id)` - Soft delete
- `setDefault(customerId, addressId)` - Definir endereço padrão

**Cache**: 5 min

---

### ✅ Couriers Service (`couriers/`)

- `findById(id)` - Buscar por ID
- `findByEmail(email)` - Buscar por email
- `findByCpf(cpf)` - Buscar por CPF
- `findAvailable(options)` - Buscar entregadores disponíveis
- `findMany(options)` - Listar com paginação e filtros
- `search(query, limit)` - Buscar por nome/email
- `create(data)` - Criar entregador
- `update(id, data)` - Atualizar entregador
- `delete(id)` - Soft delete
- `updateLocation(id, lat, lng)` - Atualizar localização
- `setAvailability(id, isAvailable)` - Alterar disponibilidade
- `count(filters)` - Contar entregadores

**Cache**: 3 min (entidades), 30 seg (disponibilidade), 2 min (listas)

---

## CRUDs de Catálogo

### ✅ Products Service (`products/`)

- `findById(id)` - Buscar por ID
- `findBySku(sku)` - Buscar por SKU
- `findByBarcode(barcode)` - Buscar por código de barras
- `findMany(options)` - Listar com paginação e filtros
- `search(query, limit)` - Buscar produtos
- `create(data)` - Criar produto
- `update(id, data)` - Atualizar produto
- `delete(id)` - Soft delete
- `count(filters)` - Contar produtos

**Cache**: 5 min (entidades), 2 min (listas), 1 min (busca)

---

### ✅ Departments Service (`departments/`)

- `findById(id)` - Buscar por ID
- `findByCode(code)` - Buscar por código
- `findMany(options)` - Listar com paginação
- `create(data)` - Criar departamento
- `update(id, data)` - Atualizar departamento
- `delete(id)` - Soft delete

**Cache**: 5 min (entidades), 2 min (listas)

---

### ✅ Categories Service (`categories/`)

- `findById(id)` - Buscar por ID
- `findByDepartmentId(departmentId)` - Buscar categorias do departamento
- `create(data)` - Criar categoria
- `update(id, data)` - Atualizar categoria
- `delete(id)` - Soft delete

**Cache**: 5 min (entidades), 5 min (por departamento)

---

### ✅ Subcategories Service (`subcategories/`)

- `findById(id)` - Buscar por ID
- `findByCategoryId(categoryId)` - Buscar subcategorias da categoria
- `create(data)` - Criar subcategoria
- `update(id, data)` - Atualizar subcategoria
- `delete(id)` - Soft delete

**Cache**: 5 min (entidades), 5 min (por categoria)

---

### ✅ Brands Service (`brands/`)

- `findById(id)` - Buscar por ID
- `findByCode(code)` - Buscar por código
- `findMany(options)` - Listar marcas
- `create(data)` - Criar marca
- `update(id, data)` - Atualizar marca
- `delete(id)` - Soft delete

**Cache**: 5 min (entidades), 2 min (listas)

---

### ✅ Units Service (`units/`)

- `findById(id)` - Buscar por ID
- `findByCode(code)` - Buscar por código
- `findByType(type)` - Buscar por tipo
- `findMany()` - Listar todas as unidades
- `create(data)` - Criar unidade
- `update(id, data)` - Atualizar unidade
- `delete(id)` - Soft delete

**Cache**: 10 min (unidades mudam raramente)

---

### ✅ Warehouses Service (`warehouses/`)

- `findById(id)` - Buscar por ID
- `findByCode(code)` - Buscar por código
- `findMany(isActive)` - Listar armazéns
- `create(data)` - Criar armazém
- `update(id, data)` - Atualizar armazém
- `delete(id)` - Soft delete

**Cache**: 5 min (entidades), 5 min (listas)

---

## CRUDs de Produtos (Detalhes)

### ✅ Product Images Service (`product-images/`)

- `findById(id)` - Buscar por ID
- `findByProductId(productId)` - Buscar imagens do produto
- `findPrimaryByProductId(productId)` - Buscar imagem primária
- `create(data)` - Criar imagem
- `update(id, data)` - Atualizar imagem
- `delete(id)` - Soft delete
- `setPrimary(productId, imageId)` - Definir imagem primária

**Cache**: 5 min

---

### ✅ Product Variants Service (`product-variants/`)

- `findById(id)` - Buscar por ID
- `findByProductId(productId)` - Buscar variantes do produto
- `findBySku(sku)` - Buscar por SKU
- `create(data)` - Criar variante
- `update(id, data)` - Atualizar variante
- `delete(id)` - Soft delete

**Cache**: 5 min (entidades), 5 min (por produto)

---

### ✅ Product Stock Service (`product-stock/`)

- `findById(id)` - Buscar por ID
- `findByProductAndWarehouse(productId, warehouseId, variantId?)` - Buscar estoque específico
- `findByProductId(productId)` - Buscar estoque do produto
- `findByWarehouseId(warehouseId)` - Buscar estoque do armazém
- `create(data)` - Criar registro de estoque
- `update(id, data)` - Atualizar estoque
- `updateQuantity(productId, warehouseId, variantId, quantity)` - Atualizar quantidade
- `delete(id)` - Soft delete

**Cache**: 60 seg (estoque muda frequentemente)

---

### ✅ Product Prices Service (`product-prices/`)

- `findById(id)` - Buscar por ID
- `findByProductId(productId, variantId?)` - Buscar preços do produto
- `findActiveByProductId(productId, variantId?)` - Buscar preços ativos
- `create(data)` - Criar preço
- `update(id, data)` - Atualizar preço
- `delete(id)` - Soft delete

**Cache**: 3 min (preços mudam mais que produtos)

---

### ✅ Product Reviews Service (`product-reviews/`)

- `findById(id)` - Buscar por ID
- `findByProductId(productId, options)` - Buscar reviews do produto
- `findByCustomerId(customerId)` - Buscar reviews do cliente
- `getAverageRating(productId)` - Obter média de avaliações
- `create(data)` - Criar review
- `update(id, data)` - Atualizar review
- `delete(id)` - Soft delete

**Cache**: 5 min (entidades), 2 min (listas), 5 min (média)

---

## Estratégia de Cache

### TTLs por Tipo de Dado

| Tipo de Dado                 | TTL    | Motivo                       |
| ---------------------------- | ------ | ---------------------------- |
| Entidades individuais        | 5 min  | Dados relativamente estáveis |
| Listas paginadas             | 2 min  | Mudam com frequência         |
| Busca                        | 1 min  | Resultados dinâmicos         |
| Estoque                      | 60 seg | Muda muito frequentemente    |
| Disponibilidade entregadores | 30 seg | Muda em tempo real           |
| Preços                       | 3 min  | Mudam mais que produtos      |
| Unidades                     | 10 min | Raramente mudam              |
| Códigos de referência        | 10 min | Nunca mudam                  |

### Invalidação de Cache

**CREATE**: Invalida listas relacionadas
**UPDATE**: Invalida entidade + listas + relacionadas
**DELETE**: Invalida entidade + listas + relacionadas

**Operações especiais**:

- Atualização de localização → invalida disponibilidade
- Mudança de disponibilidade → invalida disponibilidade
- Mudança de endereço padrão → invalida caches de endereços
- Mudança de imagem primária → invalida caches de imagens
- Atualização de estoque → invalida caches de estoque

---

## Total de CRUDs

**19 CRUDs completos** implementados com:

- ✅ Cache Redis estratégico
- ✅ Invalidação inteligente
- ✅ Soft delete
- ✅ Paginação
- ✅ Filtros
- ✅ Busca
- ✅ Ordenação
- ✅ TypeScript types completos

Todos prontos para uso em produção! 🚀
