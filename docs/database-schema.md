# Database Schema Documentation

Documentação completa do schema do banco de dados do sistema Lokaly.

## Índice

1. [Visão Geral](#visão-geral)
2. [Convenções e Padrões](#convenções-e-padrões)
3. [Gestão de Usuários](#gestão-de-usuários)
4. [Sistema de Pedidos](#sistema-de-pedidos)
5. [Catálogo de Produtos](#catálogo-de-produtos)
6. [Gestão de Estoque](#gestão-de-estoque)
7. [Relacionamentos](#relacionamentos)
8. [Enums e Validações](#enums-e-validações)
9. [Exemplos Práticos](#exemplos-práticos)

---

## Visão Geral

O schema foi projetado para suportar um sistema completo de delivery de supermercado, incluindo:

- **Gestão de Usuários**: Administradores, clientes e entregadores
- **Gestão de Pedidos**: Criação, rastreamento e entrega de pedidos
- **Catálogo de Produtos**: Hierarquia completa de categorias, produtos e variantes
- **Gestão de Estoque**: Controle multi-warehouse com reservas e rastreamento
- **Sistema de Preços**: Preços flexíveis com suporte a promoções
- **Avaliações**: Sistema de reviews e ratings de produtos

### Tecnologias

- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **IDs**: BigInt (bigserial) mapeados para `number` em TypeScript
- **Soft Delete**: Todas as tabelas possuem `deleted_at` para soft delete
- **Timestamps**: `created_at` e `updated_at` automáticos em todas as tabelas

---

## Convenções e Padrões

### Naming Convention

- **Tabelas**: `snake_case` (ex: `order_items`, `product_stock`)
- **Colunas**: `snake_case` (ex: `customer_id`, `created_at`)
- **Enums**: Gerenciados no backend, não no banco de dados
- **Foreign Keys**: `{table}_id` (ex: `order_id`, `product_id`)

### Tipos de Dados

- **IDs**: `bigint` (BigInt) mapeado para `number` em TypeScript
- **Valores Monetários**: `decimal(10, 2)` para preços e valores
- **Quantidades**: `integer` para quantidades e contadores
- **Textos**: `text` para strings de tamanho variável
- **Timestamps**: `timestamp` com `defaultNow()`

### Constraints

- **Primary Keys**: Todos os IDs são `bigint` com `generatedAlwaysAsIdentity()`
- **Foreign Keys**: Configuradas com ações apropriadas (`cascade`, `restrict`, `set null`)
- **Unique Constraints**: Aplicadas onde necessário (SKU, códigos, combinações)
- **Índices**: Criados para campos frequentemente consultados

---

## Gestão de Usuários

O sistema possui três tipos principais de usuários: **Administradores/Staff**, **Clientes** e **Entregadores**.

### Tabela: `users`

Usuários administrativos e staff do sistema (roles: `admin`, `super_admin`).

#### Campos Principais

- `id`: BigInt (PK, auto-increment)
- `email`: Text (unique) - Email do usuário
- `password_hash`: Text - Hash da senha (bcrypt/argon2)
- `role`: Text - `admin` ou `super_admin`
- `first_name`: Text - Nome
- `last_name`: Text - Sobrenome
- `phone`: Text (nullable) - Telefone
- `department`: Text (nullable) - Departamento (sales, operations, finance, support, etc)
- `permissions`: Text (nullable) - JSON array de permissões específicas
- `is_active`: Boolean - Se o usuário está ativo
- `email_verified`: Boolean - Se o email foi verificado
- `two_factor_enabled`: Boolean - Se 2FA está habilitado
- `last_login_at`: Timestamp (nullable) - Último login
- `last_login_ip`: Text (nullable) - IP do último login
- `created_at`, `updated_at`, `deleted_at`: Timestamps padrão

#### Índices

- `email` (unique)
- `role`

#### Exemplo

```typescript
const admin = await db.insert(users).values({
  email: 'admin@lokaly.com',
  passwordHash: await hashPassword('senha123'),
  role: 'admin',
  firstName: 'João',
  lastName: 'Silva',
  department: 'operations',
  isActive: true,
  emailVerified: true,
});
```

---

### Tabela: `customers`

Contas de clientes do e-commerce (role: `customer`).

#### Campos Principais

- `id`: BigInt (PK, auto-increment)
- `email`: Text (unique) - Email do cliente
- `password_hash`: Text (nullable) - Hash da senha (nullable para login social)
- `first_name`: Text - Nome
- `last_name`: Text - Sobrenome
- `phone`: Text (nullable) - Telefone
- `phone_verified`: Boolean - Se o telefone foi verificado
- `date_of_birth`: Timestamp (nullable) - Data de nascimento
- `gender`: Text (nullable) - `male`, `female`, `other`, `prefer_not_to_say`
- `cpf`: Text (nullable, unique) - CPF (Brasil)
- `cnpj`: Text (nullable, unique) - CNPJ (para empresas)
- `company_name`: Text (nullable) - Nome da empresa (se PJ)
- `status`: Text - `active`, `inactive`, `suspended`, `verified`, `unverified`
- `email_verified`: Boolean - Se o email foi verificado
- `language`: Text - Idioma preferido (default: `pt-BR`)
- `currency`: Text - Moeda preferida (default: `BRL`)
- `timezone`: Text - Fuso horário (default: `America/Sao_Paulo`)
- `marketing_consent`: Boolean - Consentimento para marketing
- `loyalty_points`: Integer - Pontos de fidelidade
- `loyalty_tier`: Text - Nível de fidelidade (`bronze`, `silver`, `gold`, `platinum`)
- `total_orders`: Integer - Total de pedidos realizados
- `total_spent`: Decimal - Total gasto
- `referral_code`: Text (unique) - Código de referência único do cliente
- `referred_by`: BigInt (nullable, FK) - Cliente que indicou (self-reference)
- `social_provider`: Text (nullable) - Provedor de login social (`google`, `facebook`, `apple`)
- `social_id`: Text (nullable) - ID externo do provedor social
- `created_at`, `updated_at`, `deleted_at`: Timestamps padrão

#### Índices

- `email` (unique)
- `phone`
- `cpf`
- `status`
- `referral_code` (unique)

#### Relacionamentos

- `referred_by` → `customers.id` (SET NULL)

#### Exemplo

```typescript
const customer = await db.insert(customers).values({
  email: 'cliente@example.com',
  passwordHash: await hashPassword('senha123'),
  firstName: 'Maria',
  lastName: 'Santos',
  phone: '+5511999999999',
  cpf: '123.456.789-00',
  status: 'active',
  emailVerified: false,
  language: 'pt-BR',
  currency: 'BRL',
  loyaltyPoints: 0,
  loyaltyTier: 'bronze',
  totalOrders: 0,
  totalSpent: 0,
  referralCode: generateReferralCode(),
});
```

---

### Tabela: `addresses`

Múltiplos endereços por cliente (relacionamento 1:N).

#### Campos Principais

- `id`: BigInt (PK, auto-increment)
- `customer_id`: BigInt (FK) - Referência ao cliente
- `type`: Text - Tipo de endereço (`home`, `work`, `other`)
- `label`: Text (nullable) - Rótulo personalizado (ex: "Casa", "Escritório")
- `is_default`: Boolean - Se é o endereço padrão
- `recipient_name`: Text (nullable) - Nome do destinatário
- `recipient_phone`: Text (nullable) - Telefone do destinatário
- `street`: Text - Rua
- `number`: Text - Número
- `complement`: Text (nullable) - Complemento (apto, bloco, etc)
- `neighborhood`: Text - Bairro
- `city`: Text - Cidade
- `state`: Text - Estado (UF)
- `zip_code`: Text - CEP
- `country`: Text - País (default: `BR`)
- `latitude`: Decimal (nullable) - Latitude para geolocalização
- `longitude`: Decimal (nullable) - Longitude para geolocalização
- `delivery_instructions`: Text (nullable) - Instruções especiais para entrega
- `is_active`: Boolean - Se o endereço está ativo
- `created_at`, `updated_at`, `deleted_at`: Timestamps padrão

#### Índices

- `customer_id`
- `zip_code`

#### Relacionamentos

- `customer_id` → `customers.id` (CASCADE)

#### Exemplo

```typescript
const address = await db.insert(addresses).values({
  customerId: customer.id,
  type: 'home',
  label: 'Casa',
  isDefault: true,
  recipientName: 'Maria Santos',
  recipientPhone: '+5511999999999',
  street: 'Rua das Flores',
  number: '123',
  complement: 'Apto 45',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01234-567',
  country: 'BR',
  latitude: -23.5505,
  longitude: -46.6333,
  deliveryInstructions: 'Portão azul, tocar interfone 45',
  isActive: true,
});
```

---

### Tabela: `couriers`

Entregadores do sistema (role: `courier`).

#### Campos Principais

- `id`: BigInt (PK, auto-increment)
- `email`: Text (unique) - Email do entregador
- `password_hash`: Text - Hash da senha
- `first_name`: Text - Nome
- `last_name`: Text - Sobrenome
- `phone`: Text - Telefone
- `phone_verified`: Boolean - Se o telefone foi verificado
- `date_of_birth`: Timestamp (nullable) - Data de nascimento
- `cpf`: Text (unique) - CPF
- `rg`: Text (nullable) - RG
- `cnh`: Text (nullable) - CNH (carteira de motorista)
- `cnh_category`: Text (nullable) - Categoria da CNH (A, B, C, D, E)
- `vehicle_type`: Text - Tipo de veículo (`bicycle`, `motorcycle`, `car`, `van`, `walking`)
- `vehicle_brand`: Text (nullable) - Marca do veículo
- `vehicle_model`: Text (nullable) - Modelo do veículo
- `vehicle_year`: Integer (nullable) - Ano do veículo
- `license_plate`: Text (nullable) - Placa do veículo
- `vehicle_color`: Text (nullable) - Cor do veículo
- `status`: Text - Status (`active`, `inactive`, `busy`, `offline`, `suspended`)
- `is_available`: Boolean - Se está disponível para entregas
- `current_latitude`: Decimal (nullable) - Latitude atual
- `current_longitude`: Decimal (nullable) - Longitude atual
- `last_location_update`: Timestamp (nullable) - Última atualização de localização
- `total_deliveries`: Integer - Total de entregas realizadas
- `total_rating`: Decimal (nullable) - Média de avaliações (1-5)
- `total_ratings`: Integer - Número de avaliações recebidas
- `on_time_delivery_rate`: Decimal (nullable) - Taxa de entregas no prazo (%)
- `is_verified`: Boolean - Se foi verificado por um admin
- `verified_at`: Timestamp (nullable) - Data de verificação
- `verified_by`: BigInt (nullable, FK) - Admin que verificou
- `last_login_at`: Timestamp (nullable) - Último login
- `last_login_ip`: Text (nullable) - IP do último login
- `created_at`, `updated_at`, `deleted_at`: Timestamps padrão

#### Índices

- `email` (unique)
- `phone`
- `cpf` (unique)
- `status`
- `is_available`

#### Relacionamentos

- `verified_by` → `users.id` (SET NULL)

#### Exemplo

```typescript
const courier = await db.insert(couriers).values({
  email: 'entregador@lokaly.com',
  passwordHash: await hashPassword('senha123'),
  firstName: 'Pedro',
  lastName: 'Oliveira',
  phone: '+5511888888888',
  cpf: '987.654.321-00',
  cnh: '123456789',
  cnhCategory: 'B',
  vehicleType: 'motorcycle',
  vehicleBrand: 'Honda',
  vehicleModel: 'CG 160',
  vehicleYear: 2023,
  licensePlate: 'ABC-1234',
  vehicleColor: 'Vermelho',
  status: 'active',
  isAvailable: true,
  totalDeliveries: 0,
  totalRatings: 0,
  isVerified: false,
});
```

---

## Sistema de Pedidos

### Tabela: `orders`

Armazena informações dos pedidos dos clientes.

#### Campos Principais

| Campo                    | Tipo          | Descrição                                   |
| ------------------------ | ------------- | ------------------------------------------- |
| `id`                     | bigint (PK)   | ID único do pedido                          |
| `customer_id`            | bigint (FK)   | ID do cliente (FK para customers)           |
| `customer_name`          | text          | Nome do cliente (denormalizado)             |
| `customer_phone`         | text          | Telefone do cliente (denormalizado)         |
| `customer_email`         | text          | Email do cliente (denormalizado)            |
| `delivery_address_id`    | bigint (FK)   | ID do endereço (FK para addresses)          |
| `delivery_address`       | text          | Endereço de entrega (denormalizado)         |
| `delivery_instructions`  | text          | Instruções especiais de entrega             |
| `status`                 | text          | Status do pedido (ver enums)                |
| `order_number`           | text (unique) | Número do pedido (ex: ORD-2024-001234)      |
| `total_amount`           | decimal(10,2) | Valor total do pedido                       |
| `subtotal_amount`        | decimal(10,2) | Subtotal (sem taxas)                        |
| `tax_amount`             | decimal(10,2) | Valor dos impostos                          |
| `delivery_fee`           | decimal(10,2) | Taxa de entrega                             |
| `discount_amount`        | decimal(10,2) | Total de descontos aplicados                |
| `payment_status`         | text          | Status do pagamento (ver enums)             |
| `payment_method`         | text          | Método de pagamento (ver enums)             |
| `payment_transaction_id` | text          | ID da transação de pagamento                |
| `payment_gateway`        | text          | Gateway de pagamento (stripe, pagarme, etc) |
| `notes`                  | text          | Observações do cliente                      |
| `internal_notes`         | text          | Observações internas (staff)                |
| `cancelled_at`           | timestamp     | Data de cancelamento (se cancelado)         |
| `cancelled_by`           | bigint (FK)   | ID do admin que cancelou (FK para users)    |
| `cancellation_reason`    | text          | Motivo do cancelamento                      |

#### Exemplo

#### Relacionamentos

- `customer_id` → `customers.id` (RESTRICT)
- `delivery_address_id` → `addresses.id` (SET NULL)
- `cancelled_by` → `users.id` (SET NULL)

#### Índices

- `customer_id`
- `status`
- `order_number` (unique)
- `created_at`

#### Exemplo

```typescript
const order = await db.insert(orders).values({
  customerId: customer.id,
  customerName: customer.firstName + ' ' + customer.lastName,
  customerPhone: customer.phone,
  customerEmail: customer.email,
  deliveryAddressId: address.id,
  deliveryAddress: `${address.street}, ${address.number} - ${address.city}, ${address.state}`,
  status: 'pending',
  orderNumber: generateOrderNumber(),
  totalAmount: 150.5,
  subtotalAmount: 140.0,
  taxAmount: 5.0,
  deliveryFee: 5.5,
  discountAmount: 0,
  paymentStatus: 'pending',
  paymentMethod: 'credit_card',
});
```

### Tabela: `order_items`

Itens que compõem um pedido. Mantém dados denormalizados para histórico.

#### Campos Principais

| Campo                | Tipo          | Descrição                                |
| -------------------- | ------------- | ---------------------------------------- |
| `id`                 | bigint (PK)   | ID único do item                         |
| `order_id`           | bigint (FK)   | Referência ao pedido                     |
| `product_id`         | bigint (FK)   | Referência ao produto                    |
| `product_variant_id` | bigint (FK)   | Referência à variante (opcional)         |
| `product_name`       | text          | Nome do produto (denormalizado)          |
| `product_sku`        | text          | SKU do produto (denormalizado)           |
| `quantity`           | integer       | Quantidade do item                       |
| `unit_price`         | decimal(10,2) | Preço unitário no momento da compra      |
| `subtotal`           | decimal(10,2) | Subtotal do item (quantity × unit_price) |

#### Relacionamentos

- `order_id` → `orders.id` (CASCADE)
- `product_id` → `products.id` (RESTRICT)
- `product_variant_id` → `product_variants.id` (SET NULL)

#### Por que campos denormalizados?

A tabela `order_items` utiliza uma **abordagem híbrida** com campos denormalizados (`product_name`, `product_sku`, `unit_price`) além da foreign key (`product_id`). Isso é intencional e segue boas práticas de design de banco de dados para sistemas de e-commerce.

##### 1. Histórico Imutável

O pedido deve preservar **exatamente** o que foi vendido no momento da compra. Se o produto for alterado depois, o pedido histórico não muda.

**Cenário problemático sem denormalização:**

```
15/01/2024 - Cliente compra "Arroz Tio João 5kg" por R$ 25,00
20/01/2024 - Produto é renomeado para "Arroz Tio João Premium 5kg"
25/01/2024 - Cliente vê o pedido e aparece "Arroz Tio João Premium 5kg" ❌
```

**Com denormalização:**

```
15/01/2024 - Cliente compra "Arroz Tio João 5kg" por R$ 25,00
            → order_items.product_name = "Arroz Tio João 5kg" (salvo)
20/01/2024 - Produto é renomeado para "Arroz Tio João Premium 5kg"
25/01/2024 - Cliente vê o pedido e aparece "Arroz Tio João 5kg" ✅
```

##### 2. Integridade de Dados Históricos

Se o produto for deletado ou alterado, o pedido histórico não perde informação.

**Sem denormalização:**

```sql
-- Produto é deletado (soft delete)
UPDATE products SET deleted_at = NOW() WHERE id = 789;

-- Agora ao buscar o pedido:
SELECT oi.*, p.name
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = 12345;

-- Resultado: product_name = NULL ❌ (perdeu a informação!)
```

**Com denormalização:**

```sql
-- Produto é deletado
UPDATE products SET deleted_at = NOW() WHERE id = 789;

-- Buscar o pedido:
SELECT oi.*
FROM order_items oi
WHERE oi.order_id = 12345;

-- Resultado: product_name = "Arroz Tio João 5kg" ✅ (preservado!)
```

##### 3. Performance

Evita JOINs desnecessários para exibir informações básicas do pedido.

**Sem denormalização (requer JOIN):**

```sql
SELECT oi.*, p.name, p.sku
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = 12345;
```

**Com denormalização (sem JOIN):**

```sql
SELECT oi.*
FROM order_items oi
WHERE oi.order_id = 12345;
-- Já tem product_name e product_sku! ✅
```

##### 4. Auditoria e Compliance

Para fins legais, fiscais e de auditoria, é necessário um **registro imutável** do que foi vendido.

**Exemplo real:**

- Nota fiscal deve mostrar exatamente o que foi vendido
- Se o produto mudar depois, a NF não pode mudar
- Para compliance, precisa de um snapshot do momento da venda

##### 5. Preço também é Denormalizado

Note que `unit_price` também é denormalizado pelo mesmo motivo:

```typescript
unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
```

**Por quê?**

- Se o preço do produto mudar, o pedido histórico mantém o preço original
- Importante para relatórios financeiros e histórico de vendas

##### Estrutura Híbrida

A tabela usa uma abordagem híbrida:

```typescript
productId: bigint(FK); // Para referência e integridade
productVariantId: bigint(FK); // Para referência (opcional)
productName: text(denormalizado); // Para histórico imutável
productSku: text(denormalizado); // Para histórico imutável
unitPrice: decimal(denormalizado); // Para histórico imutável
```

**Vantagens:**

- `product_id` garante integridade referencial (RESTRICT)
- `product_name` e `product_sku` preservam histórico
- `unit_price` preserva o preço do momento da venda

##### Quando Usar Cada Campo

**Use `product_id` para:**

- Validações (produto existe?)
- Relatórios agregados (vendas por produto)
- Buscar informações atuais do produto

**Use `product_name` e `product_sku` para:**

- Exibir o pedido ao cliente
- Gerar notas fiscais
- Relatórios históricos
- Auditoria

##### Exemplo Prático

```typescript
// Ao criar o pedido, copia os dados do produto
const product = await db.select().from(products).where(eq(products.id, 789));

await db.insert(orderItems).values({
  order_id: 12345,
  product_id: 789, // FK para integridade
  product_name: product.name, // Denormalizado ✅
  product_sku: product.sku, // Denormalizado ✅
  unit_price: currentPrice, // Denormalizado ✅
  quantity: 2,
  subtotal: currentPrice * 2,
});

// Meses depois, mesmo que o produto mude:
// - product.name = "Novo Nome"
// - product.sku = "NOVO-SKU"
// - product.base_price = 30.00

// O pedido histórico continua mostrando:
// - product_name = "Arroz Tio João 5kg" (original)
// - product_sku = "ARZ-TJ-5KG" (original)
// - unit_price = 25.00 (original)
```

#### Exemplo

```typescript
const orderItem = {
  id: 1,
  order_id: 12345,
  product_id: 789,
  product_variant_id: null, // Produto base, sem variante
  product_name: 'Arroz Tio João 5kg',
  product_sku: 'ARZ-TJ-5KG',
  quantity: 2,
  unit_price: 25.0,
  subtotal: 50.0,
};
```

### Tabela: `delivery_assignments`

Atribuições de entrega para entregadores.

#### Campos Principais

| Campo                     | Tipo        | Descrição                              |
| ------------------------- | ----------- | -------------------------------------- |
| `id`                      | bigint (PK) | ID único da atribuição                 |
| `order_id`                | bigint (FK) | Referência ao pedido                   |
| `courier_id`              | bigint (FK) | ID do entregador (FK para couriers)    |
| `courier_name`            | text        | Nome do entregador (denormalizado)     |
| `courier_phone`           | text        | Telefone do entregador (denormalizado) |
| `status`                  | text        | Status da entrega (ver enums)          |
| `pickup_address`          | text        | Endereço de coleta (denormalizado)     |
| `delivery_address`        | text        | Endereço de entrega (denormalizado)    |
| `delivery_instructions`   | text        | Instruções de entrega                  |
| `assigned_at`             | timestamp   | Quando foi atribuído                   |
| `accepted_at`             | timestamp   | Quando foi aceito                      |
| `rejected_at`             | timestamp   | Quando foi rejeitado                   |
| `rejection_reason`        | text        | Motivo da rejeição                     |
| `estimated_pickup_time`   | timestamp   | Tempo estimado de coleta               |
| `estimated_delivery_time` | timestamp   | Tempo estimado de entrega              |
| `actual_pickup_time`      | timestamp   | Tempo real de coleta                   |
| `actual_delivery_time`    | timestamp   | Tempo real de entrega                  |
| `estimated_distance`      | decimal     | Distância estimada (km)                |
| `actual_distance`         | decimal     | Distância real percorrida (km)         |
| `delivery_notes`          | text        | Notas da entrega                       |
| `customer_signature`      | text        | Assinatura do cliente (base64)         |
| `delivery_rating`         | integer     | Avaliação da entrega (1-5)             |
| `delivery_feedback`       | text        | Feedback do cliente                    |

#### Relacionamentos

- `order_id` → `orders.id` (CASCADE)
- `courier_id` → `couriers.id` (RESTRICT)

#### Índices

- `order_id`
- `courier_id`
- `status`

#### Exemplo

```typescript
const deliveryAssignment = {
  id: 1,
  order_id: 12345,
  courier_id: 'courier-001',
  courier_name: 'Maria Santos',
  courier_phone: '+5511888888888',
  status: 'assigned',
  pickup_address: 'Armazém Centro - Rua A, 100',
  delivery_address: 'Rua das Flores, 123 - São Paulo, SP',
  assigned_at: new Date('2024-01-15T10:30:00Z'),
  estimated_pickup_time: new Date('2024-01-15T11:00:00Z'),
  estimated_delivery_time: new Date('2024-01-15T12:00:00Z'),
};
```

---

## Catálogo de Produtos

### Hierarquia de Categorias

O sistema utiliza uma hierarquia de 3 níveis:

```
Departamento → Categoria → Subcategoria → Produto
```

**Exemplo:**

```
Mercearia → Cereais e Grãos → Arroz → Arroz Tio João 5kg
```

### Tabela: `departments`

Nível superior da hierarquia (ex: Mercearia, Perecíveis, Bebidas).

#### Campos Principais

| Campo           | Tipo          | Descrição                      |
| --------------- | ------------- | ------------------------------ |
| `id`            | bigint (PK)   | ID único do departamento       |
| `code`          | text (UNIQUE) | Código único (ex: "MERCEARIA") |
| `name`          | text          | Nome do departamento           |
| `description`   | text          | Descrição                      |
| `image_url`     | text          | URL da imagem                  |
| `display_order` | integer       | Ordem de exibição              |
| `is_active`     | boolean       | Se está ativo                  |

#### Exemplo

```typescript
const department = {
  id: 1,
  code: 'MERCEARIA',
  name: 'Mercearia',
  description: 'Produtos não perecíveis',
  display_order: 1,
  is_active: true,
};
```

### Tabela: `categories`

Segundo nível da hierarquia (ex: Cereais e Grãos, Carnes, Laticínios).

#### Campos Principais

| Campo           | Tipo        | Descrição                             |
| --------------- | ----------- | ------------------------------------- |
| `id`            | bigint (PK) | ID único da categoria                 |
| `department_id` | bigint (FK) | Referência ao departamento            |
| `code`          | text        | Código (único dentro do departamento) |
| `name`          | text        | Nome da categoria                     |
| `display_order` | integer     | Ordem de exibição                     |

#### Relacionamentos

- `department_id` → `departments.id` (CASCADE)

#### Exemplo

```typescript
const category = {
  id: 1,
  department_id: 1,
  code: 'CEREAIS',
  name: 'Cereais e Grãos',
  display_order: 1,
};
```

### Tabela: `subcategories`

Terceiro nível da hierarquia (ex: Arroz, Feijão, Massas).

#### Campos Principais

| Campo         | Tipo        | Descrição                          |
| ------------- | ----------- | ---------------------------------- |
| `id`          | bigint (PK) | ID único da subcategoria           |
| `category_id` | bigint (FK) | Referência à categoria             |
| `code`        | text        | Código (único dentro da categoria) |
| `name`        | text        | Nome da subcategoria               |

#### Relacionamentos

- `category_id` → `categories.id` (CASCADE)

#### Exemplo

```typescript
const subcategory = {
  id: 1,
  category_id: 1,
  code: 'ARROZ',
  name: 'Arroz',
  display_order: 1,
};
```

### Tabela: `units`

Unidades de medida para produtos (kg, litro, unidade, etc).

#### Campos Principais

| Campo               | Tipo          | Descrição                                  |
| ------------------- | ------------- | ------------------------------------------ |
| `id`                | bigint (PK)   | ID único da unidade                        |
| `code`              | text (UNIQUE) | Código (ex: "kg", "l", "un")               |
| `name`              | text          | Nome completo (ex: "Quilograma")           |
| `abbreviation`      | text          | Abreviação (ex: "kg")                      |
| `type`              | text          | Tipo: weight, volume, unit, length, area   |
| `conversion_factor` | decimal(10,6) | Fator de conversão para unidade base       |
| `base_unit_id`      | bigint (FK)   | Referência à unidade base (self-reference) |

#### Exemplo

```typescript
const unit = {
  id: 1,
  code: 'kg',
  name: 'Quilograma',
  abbreviation: 'kg',
  type: 'weight',
  conversion_factor: 1.0,
  base_unit_id: null, // É a unidade base
};

const unitGram = {
  id: 2,
  code: 'g',
  name: 'Grama',
  abbreviation: 'g',
  type: 'weight',
  conversion_factor: 0.001, // 1g = 0.001kg
  base_unit_id: 1, // Referência ao kg
};
```

### Tabela: `brands`

Marcas dos produtos (ex: Coca-Cola, Nestlé, Sadia).

#### Campos Principais

| Campo      | Tipo          | Descrição                     |
| ---------- | ------------- | ----------------------------- |
| `id`       | bigint (PK)   | ID único da marca             |
| `code`     | text (UNIQUE) | Código único (ex: "TIO-JOAO") |
| `name`     | text          | Nome da marca                 |
| `logo_url` | text          | URL do logo                   |
| `website`  | text          | Website da marca              |

#### Exemplo

```typescript
const brand = {
  id: 1,
  code: 'TIO-JOAO',
  name: 'Tio João',
  logo_url: 'https://example.com/logos/tio-joao.png',
  website: 'https://tiojoao.com.br',
};
```

### Tabela: `products`

Tabela principal do catálogo de produtos.

#### Campos Principais

**Identificação:**

- `id`: bigint (PK)
- `sku`: text (UNIQUE) - Stock Keeping Unit
- `barcode`: text (UNIQUE) - Código de barras (EAN, UPC)
- `name`: text - Nome do produto
- `display_name`: text - Nome para exibição

**Hierarquia:**

- `subcategory_id`: bigint (FK) → `subcategories.id`
- `brand_id`: bigint (FK) → `brands.id` (opcional)
- `unit_id`: bigint (FK) → `units.id`

**Dimensões:**

- `weight`: decimal(10,3) - Peso
- `volume`: decimal(10,3) - Volume
- `length`, `width`, `height`: decimal(10,2) - Dimensões em cm
- `package_quantity`: integer - Quantidade por embalagem

**Status e Flags:**

- `status`: text - active, inactive, discontinued, out_of_stock
- `is_perishable`: boolean - Produto perecível
- `requires_refrigeration`: boolean - Requer refrigeração
- `is_frozen`: boolean - Produto congelado
- `is_alcoholic`: boolean - Produto alcoólico
- `is_tobacco`: boolean - Produto de tabaco
- `min_age_restriction`: integer - Idade mínima para compra

**Informações Nutricionais:**

- `nutritional_info`: text (JSON) - Informações nutricionais
- `allergens`: text (JSON) - Lista de alérgenos
- `ingredients`: text - Ingredientes
- `origin`: text - País/região de origem

**Preços e Estoque:**

- `base_price`: decimal(10,2) - Preço base
- `cost_price`: decimal(10,2) - Preço de custo
- `min_stock_level`: integer - Nível mínimo de estoque
- `max_stock_level`: integer - Nível máximo de estoque

**SEO e Marketing:**

- `seo_title`, `seo_description`, `seo_keywords`: text
- `is_featured`: boolean - Produto em destaque
- `is_new`: boolean - Produto novo
- `is_best_seller`: boolean - Mais vendido

**Extensibilidade:**

- `tags`: text (JSON) - Tags do produto
- `custom_attributes`: text (JSON) - Atributos customizados

#### Exemplo

```typescript
const product = {
  id: 789,
  sku: 'ARZ-TJ-5KG',
  barcode: '7891000100103',
  name: 'Arroz Tio João Tipo 1 5kg',
  display_name: 'Arroz Tio João 5kg',
  subcategory_id: 1,
  brand_id: 1,
  unit_id: 1, // kg
  weight: 5.0,
  length: 30.0,
  width: 20.0,
  height: 10.0,
  package_quantity: 1,
  status: 'active',
  is_perishable: false,
  requires_refrigeration: false,
  base_price: 25.0,
  cost_price: 18.0,
  min_stock_level: 50,
  is_featured: true,
};
```

### Tabela: `product_images`

Múltiplas imagens por produto em diferentes tamanhos.

#### Campos Principais

| Campo             | Tipo        | Descrição                                          |
| ----------------- | ----------- | -------------------------------------------------- |
| `id`              | bigint (PK) | ID único da imagem                                 |
| `product_id`      | bigint (FK) | Referência ao produto                              |
| `url`             | text        | URL completa da imagem                             |
| `thumbnail_url`   | text        | URL da miniatura                                   |
| `size`            | text        | Tamanho: thumbnail, small, medium, large, original |
| `width`, `height` | integer     | Dimensões em pixels                                |
| `file_size`       | integer     | Tamanho do arquivo em bytes                        |
| `mime_type`       | text        | Tipo MIME (ex: "image/jpeg")                       |
| `alt_text`        | text        | Texto alternativo para acessibilidade              |
| `is_primary`      | boolean     | Se é a imagem principal                            |
| `display_order`   | integer     | Ordem de exibição                                  |

#### Relacionamentos

- `product_id` → `products.id` (CASCADE)

#### Exemplo

```typescript
const productImage = {
  id: 1,
  product_id: 789,
  url: 'https://cdn.example.com/products/arroz-tio-joao-large.jpg',
  thumbnail_url: 'https://cdn.example.com/products/arroz-tio-joao-thumb.jpg',
  size: 'large',
  width: 1200,
  height: 1200,
  file_size: 245760,
  mime_type: 'image/jpeg',
  alt_text: 'Arroz Tio João 5kg',
  is_primary: true,
  display_order: 1,
};
```

### Tabela: `product_variants`

Variantes de produtos (tamanhos, sabores, cores, etc).

#### Campos Principais

| Campo              | Tipo          | Descrição                                          |
| ------------------ | ------------- | -------------------------------------------------- |
| `id`               | bigint (PK)   | ID único da variante                               |
| `product_id`       | bigint (FK)   | Referência ao produto base                         |
| `sku`              | text (UNIQUE) | SKU específico da variante                         |
| `barcode`          | text (UNIQUE) | Código de barras da variante                       |
| `name`             | text          | Nome da variante (ex: "500g", "Sabor Morango")     |
| `variant_type`     | text          | Tipo: size, flavor, color, package, weight, volume |
| `variant_value`    | text          | Valor (ex: "500", "Morango")                       |
| `weight`, `volume` | decimal       | Atributos específicos da variante                  |
| `price_modifier`   | decimal(10,2) | Modificador de preço (+ ou -)                      |
| `is_active`        | boolean       | Se está ativa                                      |

#### Relacionamentos

- `product_id` → `products.id` (CASCADE)

#### Exemplo

```typescript
// Variante de tamanho
const variantSize = {
  id: 1,
  product_id: 789,
  sku: 'ARZ-TJ-1KG',
  name: '1kg',
  variant_type: 'size',
  variant_value: '1',
  weight: 1.0,
  price_modifier: -5.0, // R$ 5,00 mais barato que o produto base
  is_active: true,
};

// Variante de sabor (para outro produto)
const variantFlavor = {
  id: 2,
  product_id: 790,
  sku: 'IOG-MORANGO-500',
  name: 'Sabor Morango',
  variant_type: 'flavor',
  variant_value: 'Morango',
  price_modifier: 0.0,
  is_active: true,
};
```

### Tabela: `product_prices`

Sistema flexível de preços com suporte a promoções.

#### Campos Principais

| Campo              | Tipo          | Descrição                              |
| ------------------ | ------------- | -------------------------------------- |
| `id`               | bigint (PK)   | ID único do preço                      |
| `product_id`       | bigint (FK)   | Referência ao produto                  |
| `variant_id`       | bigint (FK)   | Referência à variante (opcional)       |
| `price`            | decimal(10,2) | Preço atual                            |
| `compare_at_price` | decimal(10,2) | Preço original (para mostrar desconto) |
| `cost_price`       | decimal(10,2) | Preço de custo                         |
| `price_type`       | text          | regular, sale, promotional, bulk       |
| `promotion_id`     | text          | ID da promoção                         |
| `promotion_name`   | text          | Nome da promoção                       |
| `valid_from`       | timestamp     | Data de início da validade             |
| `valid_until`      | timestamp     | Data de fim da validade                |
| `min_quantity`     | integer       | Quantidade mínima para este preço      |
| `max_quantity`     | integer       | Quantidade máxima                      |
| `is_active`        | boolean       | Se está ativo                          |
| `priority`         | integer       | Prioridade (maior = mais importante)   |

#### Relacionamentos

- `product_id` → `products.id` (CASCADE)
- `variant_id` → `product_variants.id` (CASCADE)

#### Exemplo

```typescript
// Preço regular
const regularPrice = {
  id: 1,
  product_id: 789,
  variant_id: null,
  price: 25.0,
  compare_at_price: null,
  price_type: 'regular',
  min_quantity: 1,
  is_active: true,
  priority: 0,
};

// Preço promocional
const promotionalPrice = {
  id: 2,
  product_id: 789,
  variant_id: null,
  price: 19.9,
  compare_at_price: 25.0,
  price_type: 'promotional',
  promotion_id: 'PROMO-JAN-2024',
  promotion_name: 'Promoção de Janeiro',
  valid_from: new Date('2024-01-01'),
  valid_until: new Date('2024-01-31'),
  min_quantity: 1,
  is_active: true,
  priority: 10, // Maior prioridade que o preço regular
};

// Preço por atacado (bulk)
const bulkPrice = {
  id: 3,
  product_id: 789,
  variant_id: null,
  price: 22.0,
  price_type: 'bulk',
  min_quantity: 10, // Mínimo 10 unidades
  max_quantity: null,
  is_active: true,
  priority: 5,
};
```

### Tabela: `product_reviews`

Avaliações e reviews dos clientes.

#### Campos Principais

| Campo                  | Tipo        | Descrição                                    |
| ---------------------- | ----------- | -------------------------------------------- |
| `id`                   | bigint (PK) | ID único da avaliação                        |
| `product_id`           | bigint (FK) | Referência ao produto                        |
| `customer_id`          | bigint (FK) | ID do cliente (FK para customers)            |
| `customer_name`        | text        | Nome do cliente (pode ser anônimo)           |
| `rating`               | integer     | Avaliação (1-5 estrelas)                     |
| `title`                | text        | Título da avaliação                          |
| `review`               | text        | Texto da avaliação                           |
| `is_verified_purchase` | boolean     | Se é compra verificada                       |
| `is_published`         | boolean     | Se está publicada                            |
| `helpful_count`        | integer     | Contador de "útil"                           |
| `order_id`             | bigint (FK) | Referência ao pedido (para verificar compra) |
| `moderated_by`         | bigint (FK) | Admin que moderou (FK para users)            |
| `moderated_at`         | timestamp   | Data de moderação                            |
| `moderation_notes`     | text        | Notas da moderação                           |

#### Relacionamentos

- `product_id` → `products.id` (CASCADE)
- `customer_id` → `customers.id` (CASCADE)
- `order_id` → `orders.id` (SET NULL)
- `moderated_by` → `users.id` (SET NULL)

#### Índices

- `product_id`
- `customer_id`
- `rating`

#### Exemplo

```typescript
const review = {
  id: 1,
  product_id: 789,
  customer_id: 'cust-001',
  customer_name: 'João Silva',
  rating: 5,
  title: 'Excelente qualidade',
  review: 'Arroz de ótima qualidade, superou minhas expectativas!',
  is_verified_purchase: true,
  is_published: true,
  helpful_count: 12,
};
```

---

## Gestão de Estoque

### Tabela: `warehouses`

Armazéns físicos onde os produtos são armazenados.

#### Campos Principais

| Campo                                  | Tipo          | Descrição                   |
| -------------------------------------- | ------------- | --------------------------- |
| `id`                                   | bigint (PK)   | ID único do armazém         |
| `code`                                 | text (UNIQUE) | Código único (ex: "WH-001") |
| `name`                                 | text          | Nome do armazém             |
| `address`                              | text          | Endereço completo           |
| `city`, `state`, `zip_code`, `country` | text          | Localização                 |
| `phone`, `email`                       | text          | Contato                     |
| `is_active`                            | boolean       | Se está ativo               |

#### Exemplo

```typescript
const warehouse = {
  id: 1,
  code: 'WH-SP-CENTRO',
  name: 'Armazém São Paulo Centro',
  address: 'Rua dos Armazéns, 1000',
  city: 'São Paulo',
  state: 'SP',
  zip_code: '01000-000',
  country: 'Brasil',
  phone: '+5511111111111',
  email: 'sp-centro@lokaly.com',
  is_active: true,
};
```

### Tabela: `product_stock`

Controle de estoque por produto/variante/warehouse.

#### Campos Principais

| Campo               | Tipo        | Descrição                         |
| ------------------- | ----------- | --------------------------------- |
| `id`                | bigint (PK) | ID único do registro              |
| `product_id`        | bigint (FK) | Referência ao produto             |
| `variant_id`        | bigint (FK) | Referência à variante (opcional)  |
| `warehouse_id`      | bigint (FK) | Referência ao armazém             |
| `quantity`          | integer     | Quantidade disponível             |
| `reserved_quantity` | integer     | Quantidade reservada para pedidos |
| `location_code`     | text        | Localização física no armazém     |
| `last_restocked_at` | timestamp   | Última reposição                  |
| `last_counted_at`   | timestamp   | Última contagem física            |
| `reorder_point`     | integer     | Ponto de reabastecimento          |
| `max_stock`         | integer     | Capacidade máxima                 |

#### Constraints

- **Unique**: `(product_id, variant_id, warehouse_id)` - Evita duplicatas
- **Índices**: `product_id`, `warehouse_id`, `variant_id`

#### Relacionamentos

- `product_id` → `products.id` (CASCADE)
- `variant_id` → `product_variants.id` (CASCADE)
- `warehouse_id` → `warehouses.id` (CASCADE)

#### Exemplo

```typescript
// Estoque do produto base
const stockBase = {
  id: 1,
  product_id: 789,
  variant_id: null, // Produto base
  warehouse_id: 1,
  quantity: 500, // 500 unidades disponíveis
  reserved_quantity: 10, // 10 unidades reservadas
  location_code: 'A-12-B-3', // Corredor A, Prateleira 12, Posição B-3
  reorder_point: 50,
  max_stock: 1000,
  last_restocked_at: new Date('2024-01-10T08:00:00Z'),
};

// Estoque de uma variante
const stockVariant = {
  id: 2,
  product_id: 789,
  variant_id: 1, // Variante de 1kg
  warehouse_id: 1,
  quantity: 200,
  reserved_quantity: 5,
  location_code: 'A-12-B-4',
};
```

### Tabela: `inventory_reservations`

Reservas de estoque para pedidos.

#### Campos Principais

| Campo                | Tipo        | Descrição                        |
| -------------------- | ----------- | -------------------------------- |
| `id`                 | bigint (PK) | ID único da reserva              |
| `order_id`           | bigint (FK) | Referência ao pedido             |
| `product_id`         | bigint (FK) | Referência ao produto            |
| `product_variant_id` | bigint (FK) | Referência à variante (opcional) |
| `warehouse_id`       | bigint (FK) | Armazém onde está reservado      |
| `quantity`           | integer     | Quantidade reservada             |
| `status`             | text        | reserved, released, fulfilled    |
| `location_code`      | text        | Localização no armazém           |
| `reserved_by`        | text        | Quem reservou                    |
| `released_by`        | text        | Quem liberou                     |
| `release_reason`     | text        | Motivo da liberação              |
| `expires_at`         | timestamp   | Quando a reserva expira          |

#### Relacionamentos

- `order_id` → `orders.id` (CASCADE)
- `product_id` → `products.id` (RESTRICT)
- `product_variant_id` → `product_variants.id` (SET NULL)
- `warehouse_id` → `warehouses.id` (SET NULL)

#### Fluxo de Reserva

```
1. Pedido criado → status: "pending"
2. Sistema cria inventory_reservation → status: "reserved"
3. Atualiza product_stock:
   - quantity: 500 → 498
   - reserved_quantity: 0 → 2
4. Se pedido confirmado → status: "fulfilled"
5. Se pedido cancelado → status: "released"
   - quantity: 498 → 500
   - reserved_quantity: 2 → 0
```

#### Exemplo

```typescript
const reservation = {
  id: 1,
  order_id: 12345,
  product_id: 789,
  product_variant_id: null,
  warehouse_id: 1,
  quantity: 2,
  status: 'reserved',
  location_code: 'A-12-B-3',
  reserved_by: 'system',
  expires_at: new Date('2024-01-15T10:15:00Z'), // 15 minutos
};
```

---

## Relacionamentos

### Diagrama de Relacionamentos Principais

```
users (admin/staff)
  ├── orders.cancelled_by (1:N)
  ├── couriers.verified_by (1:N)
  └── product_reviews.moderated_by (1:N)

customers
  ├── addresses (1:N)
  ├── orders (1:N)
  │     ├── order_items (1:N)
  │     │     ├── products (N:1)
  │     │     └── product_variants (N:1, opcional)
  │     ├── inventory_reservations (1:N)
  │     │     ├── products (N:1)
  │     │     ├── product_variants (N:1, opcional)
  │     │     └── warehouses (N:1)
  │     ├── delivery_assignments (1:N)
  │     │     └── couriers (N:1)
  │     └── addresses (N:1, opcional)
  └── product_reviews (1:N)
        └── products (N:1)

couriers
  ├── delivery_assignments (1:N)
  └── users.verified_by (N:1, opcional)

products
  ├── subcategories (N:1)
  │     └── categories (N:1)
  │           └── departments (N:1)
  ├── brands (N:1, opcional)
  ├── units (N:1)
  ├── product_images (1:N)
  ├── product_variants (1:N)
  ├── product_stock (1:N)
  │     ├── warehouses (N:1)
  │     └── product_variants (N:1, opcional)
  ├── product_prices (1:N)
  │     └── product_variants (N:1, opcional)
  └── product_reviews (1:N)
        └── customers (N:1)
```

### Ações de Foreign Keys

| Tabela                   | FK                    | Ação ao Deletar                                        |
| ------------------------ | --------------------- | ------------------------------------------------------ |
| **User Management**      |                       |                                                        |
| `addresses`              | `customer_id`         | CASCADE (deleta endereços)                             |
| `customers`              | `referred_by`         | SET NULL (mantém referência)                           |
| `couriers`               | `verified_by`         | SET NULL (mantém referência)                           |
| **Orders**               |                       |                                                        |
| `orders`                 | `customer_id`         | RESTRICT (não permite deletar cliente com pedidos)     |
| `orders`                 | `delivery_address_id` | SET NULL (mantém histórico)                            |
| `orders`                 | `cancelled_by`        | SET NULL (mantém histórico)                            |
| `order_items`            | `order_id`            | CASCADE (deleta itens)                                 |
| `order_items`            | `product_id`          | RESTRICT (não permite deletar produto com pedidos)     |
| `inventory_reservations` | `order_id`            | CASCADE                                                |
| `inventory_reservations` | `product_id`          | RESTRICT                                               |
| `delivery_assignments`   | `order_id`            | CASCADE                                                |
| `delivery_assignments`   | `courier_id`          | RESTRICT (não permite deletar entregador com entregas) |
| **Catalog**              |                       |                                                        |
| `categories`             | `department_id`       | CASCADE                                                |
| `subcategories`          | `category_id`         | CASCADE                                                |
| `products`               | `subcategory_id`      | RESTRICT                                               |
| `products`               | `brand_id`            | SET NULL (mantém produto)                              |
| `products`               | `unit_id`             | RESTRICT                                               |
| `product_images`         | `product_id`          | CASCADE                                                |
| `product_variants`       | `product_id`          | CASCADE                                                |
| `product_stock`          | `product_id`          | CASCADE                                                |
| `product_stock`          | `variant_id`          | CASCADE                                                |
| `product_stock`          | `warehouse_id`        | CASCADE                                                |
| `product_prices`         | `product_id`          | CASCADE                                                |
| `product_prices`         | `variant_id`          | CASCADE                                                |
| `product_reviews`        | `product_id`          | CASCADE                                                |
| `product_reviews`        | `customer_id`         | CASCADE                                                |
| `product_reviews`        | `order_id`            | SET NULL (mantém review)                               |
| `product_reviews`        | `moderated_by`        | SET NULL (mantém histórico)                            |
| **Units**                |                       |                                                        |
| `units`                  | `base_unit_id`        | SET NULL (self-reference)                              |

---

## Enums e Validações

### User Role

```typescript
UserRole = {
  ADMIN: 'admin', // Administrador
  SUPER_ADMIN: 'super_admin', // Super administrador
};
```

### Customer Status

```typescript
CustomerStatus = {
  ACTIVE: 'active', // Ativo
  INACTIVE: 'inactive', // Inativo
  SUSPENDED: 'suspended', // Suspenso
  VERIFIED: 'verified', // Verificado
  UNVERIFIED: 'unverified', // Não verificado
};
```

### Address Type

```typescript
AddressType = {
  HOME: 'home', // Residencial
  WORK: 'work', // Trabalho
  OTHER: 'other', // Outro
};
```

### Courier Status

```typescript
CourierStatus = {
  ACTIVE: 'active', // Ativo
  INACTIVE: 'inactive', // Inativo
  BUSY: 'busy', // Ocupado (em entrega)
  OFFLINE: 'offline', // Offline
  SUSPENDED: 'suspended', // Suspenso
};
```

### Vehicle Type

```typescript
VehicleType = {
  BICYCLE: 'bicycle', // Bicicleta
  MOTORCYCLE: 'motorcycle', // Motocicleta
  CAR: 'car', // Carro
  VAN: 'van', // Van
  WALKING: 'walking', // A pé
};
```

### Gender

```typescript
Gender = {
  MALE: 'male', // Masculino
  FEMALE: 'female', // Feminino
  OTHER: 'other', // Outro
  PREFER_NOT_TO_SAY: 'prefer_not_to_say', // Prefere não informar
};
```

### Order Status

```typescript
OrderStatus = {
  PENDING: 'pending', // Aguardando confirmação
  CONFIRMED: 'confirmed', // Confirmado, aguardando separação
  PICKING: 'picking', // Sendo separado no armazém
  READY: 'ready', // Pronto para coleta
  ASSIGNED: 'assigned', // Atribuído a um entregador
  PICKED_UP: 'picked_up', // Coletado pelo entregador
  IN_TRANSIT: 'in_transit', // Em trânsito
  DELIVERED: 'delivered', // Entregue
  CANCELLED: 'cancelled', // Cancelado
};
```

### Payment Status

```typescript
PaymentStatus = {
  PENDING: 'pending', // Aguardando pagamento
  PAID: 'paid', // Pago
  FAILED: 'failed', // Falhou
  REFUNDED: 'refunded', // Reembolsado
};
```

### Payment Method

```typescript
PaymentMethod = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  CASH: 'cash',
  PIX: 'pix',
  BANK_TRANSFER: 'bank_transfer',
  DIGITAL_WALLET: 'digital_wallet',
};
```

### Inventory Reservation Status

```typescript
InventoryReservationStatus = {
  RESERVED: 'reserved', // Reservado
  RELEASED: 'released', // Liberado
  FULFILLED: 'fulfilled', // Atendido
};
```

### Delivery Assignment Status

```typescript
DeliveryAssignmentStatus = {
  ASSIGNED: 'assigned', // Atribuído
  ACCEPTED: 'accepted', // Aceito pelo entregador
  REJECTED: 'rejected', // Rejeitado
  PICKED_UP: 'picked_up', // Coletado
  IN_TRANSIT: 'in_transit', // Em trânsito
  DELIVERED: 'delivered', // Entregue
  CANCELLED: 'cancelled', // Cancelado
};
```

### Product Status

```typescript
ProductStatus = {
  ACTIVE: 'active', // Ativo
  INACTIVE: 'inactive', // Inativo
  DISCONTINUED: 'discontinued', // Descontinuado
  OUT_OF_STOCK: 'out_of_stock', // Sem estoque
};
```

### Product Variant Type

```typescript
ProductVariantType = {
  SIZE: 'size', // Tamanho
  FLAVOR: 'flavor', // Sabor
  COLOR: 'color', // Cor
  PACKAGE: 'package', // Embalagem
  WEIGHT: 'weight', // Peso
  VOLUME: 'volume', // Volume
  OTHER: 'other', // Outro
};
```

### Product Image Size

```typescript
ProductImageSize = {
  THUMBNAIL: 'thumbnail', // Miniatura
  SMALL: 'small', // Pequena
  MEDIUM: 'medium', // Média
  LARGE: 'large', // Grande
  ORIGINAL: 'original', // Original
};
```

### Product Price Type

```typescript
ProductPriceType = {
  REGULAR: 'regular', // Regular
  SALE: 'sale', // Venda
  PROMOTIONAL: 'promotional', // Promocional
  BULK: 'bulk', // Atacado
};
```

### Unit Type

```typescript
UnitType = {
  WEIGHT: 'weight', // Peso
  VOLUME: 'volume', // Volume
  UNIT: 'unit', // Unidade
  LENGTH: 'length', // Comprimento
  AREA: 'area', // Área
};
```

---

## Exemplos Práticos

### Exemplo 1: Criar um Pedido Completo

```typescript
// 1. Criar o pedido
const order = await db
  .insert(orders)
  .values({
    customer_id: 'cust-001',
    customer_name: 'João Silva',
    customer_phone: '+5511999999999',
    customer_email: 'joao@email.com',
    status: 'pending',
    total_amount: 75.5,
    subtotal_amount: 70.0,
    tax_amount: 0.0,
    delivery_fee: 5.5,
    delivery_address: 'Rua das Flores, 123',
    payment_status: 'pending',
    payment_method: 'credit_card',
  })
  .returning();

// 2. Adicionar itens ao pedido
await db.insert(orderItems).values([
  {
    order_id: order[0].id,
    product_id: 789, // Arroz Tio João 5kg
    product_name: 'Arroz Tio João 5kg',
    product_sku: 'ARZ-TJ-5KG',
    quantity: 2,
    unit_price: 25.0,
    subtotal: 50.0,
  },
  {
    order_id: order[0].id,
    product_id: 790, // Feijão
    product_name: 'Feijão Carioca 1kg',
    product_sku: 'FEI-CAR-1KG',
    quantity: 1,
    unit_price: 8.0,
    subtotal: 8.0,
  },
]);

// 3. Reservar estoque
await db.insert(inventoryReservations).values([
  {
    order_id: order[0].id,
    product_id: 789,
    warehouse_id: 1,
    quantity: 2,
    status: 'reserved',
    expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
  },
]);

// 4. Atualizar estoque
await db
  .update(productStock)
  .set({
    quantity: db.$sql`quantity - 2`,
    reserved_quantity: db.$sql`reserved_quantity + 2`,
  })
  .where(
    and(
      eq(productStock.product_id, 789),
      eq(productStock.warehouse_id, 1),
      isNull(productStock.variant_id)
    )
  );
```

### Exemplo 2: Consultar Produtos com Estoque

```typescript
// Buscar produtos com estoque disponível
const productsWithStock = await db
  .select({
    product: products,
    stock: productStock,
    warehouse: warehouses,
  })
  .from(products)
  .innerJoin(productStock, eq(products.id, productStock.product_id))
  .innerJoin(warehouses, eq(productStock.warehouse_id, warehouses.id))
  .where(
    and(
      eq(products.status, 'active'),
      gt(productStock.quantity, 0),
      eq(warehouses.is_active, true)
    )
  )
  .groupBy(products.id, productStock.id, warehouses.id)
  .having(gt(sum(productStock.quantity), 0));
```

### Exemplo 3: Buscar Preço Ativo de um Produto

```typescript
// Buscar o preço ativo mais prioritário
const activePrice = await db
  .select()
  .from(productPrices)
  .where(
    and(
      eq(productPrices.product_id, 789),
      eq(productPrices.is_active, true),
      or(
        isNull(productPrices.valid_from),
        lte(productPrices.valid_from, new Date())
      ),
      or(
        isNull(productPrices.valid_until),
        gte(productPrices.valid_until, new Date())
      )
    )
  )
  .orderBy(desc(productPrices.priority), desc(productPrices.created_at))
  .limit(1);
```

### Exemplo 4: Hierarquia Completa de Categorias

```typescript
// Buscar hierarquia completa
const hierarchy = await db
  .select({
    department: departments,
    category: categories,
    subcategory: subcategories,
  })
  .from(departments)
  .innerJoin(categories, eq(departments.id, categories.department_id))
  .innerJoin(subcategories, eq(categories.id, subcategories.category_id))
  .where(
    and(
      eq(departments.is_active, true),
      eq(categories.is_active, true),
      eq(subcategories.is_active, true)
    )
  )
  .orderBy(
    departments.display_order,
    categories.display_order,
    subcategories.display_order
  );
```

### Exemplo 5: Produto com Todas as Informações

```typescript
// Buscar produto completo com relacionamentos
const productComplete = await db
  .select({
    product: products,
    brand: brands,
    subcategory: subcategories,
    category: categories,
    department: departments,
    unit: units,
    images: productImages,
    variants: productVariants,
    stock: productStock,
    prices: productPrices,
    reviews: productReviews,
  })
  .from(products)
  .leftJoin(brands, eq(products.brand_id, brands.id))
  .innerJoin(subcategories, eq(products.subcategory_id, subcategories.id))
  .innerJoin(categories, eq(subcategories.category_id, categories.id))
  .innerJoin(departments, eq(categories.department_id, departments.id))
  .innerJoin(units, eq(products.unit_id, units.id))
  .leftJoin(productImages, eq(products.id, productImages.product_id))
  .leftJoin(productVariants, eq(products.id, productVariants.product_id))
  .leftJoin(productStock, eq(products.id, productStock.product_id))
  .leftJoin(productPrices, eq(products.id, productPrices.product_id))
  .leftJoin(productReviews, eq(products.id, productReviews.product_id))
  .where(eq(products.id, 789))
  .groupBy(products.id);
```

### Exemplo 6: Rastreamento de Pedido

```typescript
// Buscar informações completas de um pedido
const orderTracking = await db
  .select({
    order: orders,
    items: orderItems,
    reservations: inventoryReservations,
    delivery: deliveryAssignments,
  })
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.order_id))
  .leftJoin(
    inventoryReservations,
    eq(orders.id, inventoryReservations.order_id)
  )
  .leftJoin(deliveryAssignments, eq(orders.id, deliveryAssignments.order_id))
  .where(eq(orders.id, 12345));
```

---

## Notas Importantes

### Soft Delete

Todas as tabelas possuem o campo `deleted_at`. Para consultas, sempre filtre por `deleted_at IS NULL`:

```typescript
.where(isNull(products.deleted_at))
```

### Timestamps Automáticos

Os campos `created_at` e `updated_at` são preenchidos automaticamente. O `updated_at` deve ser atualizado manualmente quando necessário:

```typescript
await db
  .update(products)
  .set({
    name: 'Novo Nome',
    updated_at: new Date(),
  })
  .where(eq(products.id, 789));
```

### Validação de Variantes

Quando usar `variant_id`, sempre valide que a variante pertence ao `product_id` correto. Isso deve ser feito na camada de aplicação.

### Imagem Primária

Apenas uma imagem por produto deve ter `is_primary = true`. Isso deve ser garantido na aplicação ou via unique partial index.

### Preços com Prioridade

Quando múltiplos preços estão ativos, o sistema deve usar o de maior `priority`. Se houver empate, usar o mais recente (`created_at`).

---

## Migrações

As migrações são gerenciadas pelo Drizzle Kit. Para gerar uma nova migração:

```bash
cd backend/packages/db
bun run db:generate
```

Para executar as migrações:

```bash
bun run db:migrate
```

---

## Conclusão

Este schema foi projetado para ser:

- **Escalável**: Suporta crescimento de dados e tráfego
- **Flexível**: Permite extensões via campos JSON
- **Consistente**: Segue padrões claros e convenções
- **Completo**: Cobre todos os aspectos de um sistema de delivery de supermercado
- **Type-Safe**: Tipos TypeScript gerados automaticamente pelo Drizzle

Para mais informações, consulte o código fonte em `backend/packages/db/src/schema.ts`.
