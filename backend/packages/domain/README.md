# Domain Package - CRUDs com Cache Redis

Este package contém os CRUDs para as entidades principais do sistema com cache estratégico usando Redis.

## Estrutura

- **users**: CRUD para administradores/staff
- **customers**: CRUD para clientes
- **addresses**: CRUD para endereços de clientes
- **couriers**: CRUD para entregadores

## Estratégia de Cache

### TTLs (Time To Live)

- **Entidades individuais**: 5 minutos (300s)
  - `users:${id}`, `customers:${id}`, `addresses:${id}`, `couriers:${id}`
- **Listas paginadas**: 2 minutos (120s)
  - `list:users:*`, `list:customers:*`, `list:couriers:*`
- **Busca**: 1 minuto (60s)
  - `search:customers:*`, `search:couriers:*`
- **Disponibilidade de entregadores**: 30 segundos (30s)
  - `couriers:available:*` (muda frequentemente)
- **Códigos de referência**: 10 minutos (600s)
  - `customers:referral:*` (não muda)

### Invalidação de Cache

O cache é automaticamente invalidado quando:

1. **CREATE**: Invalida listas relacionadas
2. **UPDATE**: Invalida entidade específica + listas
3. **DELETE**: Invalida entidade específica + listas
4. **Operações especiais**:
   - Atualização de localização de entregador → invalida `couriers:available:*`
   - Mudança de disponibilidade → invalida `couriers:available:*`
   - Mudança de endereço padrão → invalida caches de endereços do cliente

## Uso

### Inicialização

```typescript
import { getDb } from '@lokaly/db';
import { getCache } from '@lokaly/cache';
import {
  UsersService,
  CustomersService,
  AddressesService,
  CouriersService,
} from '@lokaly/domain';

// Inicializar cache
const cache = getCache(process.env.REDIS_URL, 300); // TTL padrão: 5 minutos

// Inicializar serviços
const db = getDb();
const usersService = new UsersService(db, cache);
const customersService = new CustomersService(db, cache);
const addressesService = new AddressesService(db, cache);
const couriersService = new CouriersService(db, cache);
```

### Exemplos

#### Users

```typescript
// Buscar por ID (com cache)
const user = await usersService.findById(1);

// Buscar por email (com cache)
const user = await usersService.findByEmail('admin@lokaly.com');

// Listar com filtros e paginação
const users = await usersService.findMany({
  limit: 20,
  offset: 0,
  orderBy: 'created_at',
  orderDirection: 'desc',
  filters: {
    role: 'admin',
    isActive: true,
  },
});

// Criar
const newUser = await usersService.create({
  email: 'newadmin@lokaly.com',
  passwordHash: await hashPassword('senha123'),
  role: 'admin',
  firstName: 'João',
  lastName: 'Silva',
  isActive: true,
  emailVerified: true,
});

// Atualizar
const updated = await usersService.update(1, {
  department: 'operations',
});

// Deletar (soft delete)
await usersService.delete(1);
```

#### Customers

```typescript
// Buscar por ID
const customer = await customersService.findById(1);

// Buscar por CPF
const customer = await customersService.findByCpf('123.456.789-00');

// Buscar por código de referência
const customer = await customersService.findByReferralCode('REF123');

// Buscar
const results = await customersService.search('Maria', 10);

// Listar com filtros
const customers = await customersService.findMany({
  filters: {
    status: 'active',
    loyaltyTier: 'gold',
  },
});
```

#### Addresses

```typescript
// Buscar endereços de um cliente
const addresses = await addressesService.findByCustomerId(customerId);

// Buscar endereço padrão
const defaultAddress = await addressesService.findDefaultByCustomerId(
  customerId
);

// Criar
const address = await addressesService.create({
  customerId: 1,
  type: 'home',
  label: 'Casa',
  isDefault: true,
  street: 'Rua das Flores',
  number: '123',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01234-567',
  country: 'BR',
});

// Definir como padrão
await addressesService.setDefault(customerId, addressId);
```

#### Couriers

```typescript
// Buscar entregadores disponíveis
const available = await couriersService.findAvailable({
  limit: 10,
  vehicleType: 'motorcycle',
  minRating: 4.0,
});

// Atualizar localização
await couriersService.updateLocation(courierId, -23.5505, -46.6333);

// Alterar disponibilidade
await couriersService.setAvailability(courierId, false);

// Buscar
const results = await couriersService.search('Pedro', 10);
```

## Performance

### Cache Hits

- **Leituras frequentes**: Cache reduz carga no banco em ~80-90%
- **Listas paginadas**: Cache reduz tempo de resposta de ~50-100ms para ~1-5ms
- **Busca**: Cache reduz tempo de resposta de ~30-50ms para ~1-3ms

### Cache Misses

- Primeira leitura após invalidação: Query no banco + cache
- Após cache miss: Próximas leituras são instantâneas

## Monitoramento

Para monitorar o uso do cache:

```typescript
// Verificar se uma chave existe
const exists = await cache.exists(`users:${id}`);

// Verificar TTL restante
const ttl = await cache.getTTL(`users:${id}`);
```

## Boas Práticas

1. **Não cachear dados sensíveis**: Senhas nunca são cacheadas
2. **TTL apropriado**: Dados que mudam frequentemente têm TTL menor
3. **Invalidação proativa**: Sempre invalidar cache em mutações
4. **Cache warming**: Para dados críticos, pré-carregar no cache
5. **Fallback**: Se Redis falhar, o sistema continua funcionando (cache miss)

## Troubleshooting

### Cache não está funcionando

1. Verificar conexão com Redis: `redis-cli ping`
2. Verificar variável de ambiente `REDIS_URL`
3. Verificar logs do cache service

### Dados desatualizados

1. Verificar se invalidação está sendo chamada após mutações
2. Verificar TTL das chaves: `redis-cli TTL lokaly:users:1`
3. Limpar cache manualmente se necessário: `redis-cli FLUSHDB`
