# Event Publisher & Domain Events

## Visão Geral

Este documento explica como o domínio emite eventos e como eles são transportados via Redis usando o `RedisEventPublisher`. O objetivo é desacoplar a lógica de negócio da infraestrutura (Redis, filas, etc.).

## Componentes Principais

### 1. Interface `EventPublisher` (Domínio)

Arquivo: `backend/packages/domain/src/order/index.ts`

```ts
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
```

- O domínio **só conhece essa interface**.
- Não sabe se os eventos vão para Redis, Kafka, RabbitMQ etc.
- Serviços como `OrderService`, `InventoryService` e `DeliveryService` recebem um `EventPublisher` no construtor.

### 2. Serviços de Domínio que emitem eventos

Exemplo: `OrderService` (`backend/packages/domain/src/order/index.ts`)

- Após criar um pedido, ele emite um `OrderCreatedEvent`:

```ts
const event: OrderCreatedEvent = {
  type: 'order.created',
  payload: {
    orderId: order.id.toString(),
    customerId: input.customerId.toString(),
    items: input.items.map(/* ... */),
    totalAmount: totalAmount.toString(),
  },
  metadata: {
    eventId: crypto.randomUUID(),
    timestamp: Date.now(),
    source: 'order-service',
    correlationId: order.id.toString(),
  },
};

await this.eventPublisher.publish(event);
```

- Ao mudar o status do pedido, emite `order.status_changed`.
- `InventoryService` e `DeliveryService` seguem o mesmo padrão (emitindo eventos como `inventory.reservation_created`, `delivery.assignment_created`, etc.).

### 3. Implementação Concreta: `RedisEventPublisher`

Cada app (admin-api, public-api, worker) fornece uma implementação concreta da interface `EventPublisher` para Redis.

#### 3.1. Public API

Arquivo: `backend/apps/public-api/src/infra/redis-publisher.ts`

```ts
export class RedisEventPublisher implements EventPublisher {
  private redis: any; // conexão Redis

  async connect(redisUrl: string): Promise<void> {
    console.log(`[Redis Publisher] Connecting to ${redisUrl}`);
    // Aqui entraria a conexão real com Redis (Bun.redis ou ioredis)
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventJson = JSON.stringify(event);

    // Exemplos de estratégias (comentadas no código):
    // - Redis Streams (xadd)
    // - Pub/Sub (publish)

    console.log(
      `[Redis Publisher] Published event: ${event.type} (${event.metadata.eventId})`
    );
  }

  async disconnect(): Promise<void> {
    console.log('[Redis Publisher] Disconnected');
  }
}
```

#### 3.2. Admin API

Arquivo: `backend/apps/admin-api/src/infra/redis-publisher.ts`

- Implementação equivalente à da public-api, usada quando o admin cria/atualiza entidades que disparam eventos de domínio.

### 4. Onde o `EventPublisher` é instanciado

#### 4.1. Admin API

Arquivo: `backend/apps/admin-api/src/index.ts`

```ts
import { RedisEventPublisher } from './infra/redis-publisher';

let eventPublisher: RedisEventPublisher;

async function init() {
  // ... db, migrations, etc.

  // Initialize Redis event publisher
  eventPublisher = new RedisEventPublisher();
  await eventPublisher.connect(appConfig.redisUrl);

  // Initialize cache
  const cache = getCache(appConfig.redisUrl, 300);

  // Initialize domain services
  orderService = new OrderService(db, eventPublisher);

  // Initialize Elysia app
  app = createApp(db, cache, eventPublisher, jwtService);
}
```

- O `createApp` recebe `eventPublisher: EventPublisher` e pode repassar para outros serviços que também emitam eventos.

#### 4.2. Public API

Arquivo: `backend/apps/public-api/src/index.ts`

```ts
let eventPublisher: RedisEventPublisher;

async function init() {
  // ... db, migrations, etc.

  // Initialize Redis event publisher
  eventPublisher = new RedisEventPublisher();
  await eventPublisher.connect(process.env.REDIS_URL || 'redis://localhost:6379');

  // Initialize domain services
  orderService = new OrderService(db, eventPublisher);
}
```

#### 4.3. Worker

Arquivo: `backend/apps/worker/src/index.ts`

- O worker também instancia um `RedisEventPublisher` para publicar/consumir eventos enquanto processa filas e tarefas assíncronas.

## 5. Fluxo de Dados (End-to-End)

1. **Ação em uma API (Admin ou Public)**
   - Controller chama um serviço de domínio (por exemplo, `OrderService.createOrder`).

2. **Domínio executa regras de negócio**
   - Valida input.
   - Persiste no Postgres via Drizzle.
   - Monta um `DomainEvent` com `payload` + `metadata`.

3. **Emissão de Evento**
   - Serviço chama `eventPublisher.publish(event)`.
   - A implementação concreta (`RedisEventPublisher`) serializa para JSON e envia para Redis (Streams ou Pub/Sub).

4. **Consumo pelo Worker / Outros Serviços**
   - O Worker escuta o stream/canal de eventos (`domain-events`).
   - Para cada evento recebido, aplica ações assíncronas:
     - Enviar e-mail/SMS.
     - Chamar serviços externos (pagamento, antifraude, logística).
     - Atualizar projeções de leitura / caches.
     - Disparar notificações em tempo real.

## 6. Diagrama de Fluxo

```mermaid
flowchart LR
  AdminClient --> AdminAPI["Admin API"]
  PublicClient --> PublicAPI["Public API"]

  subgraph domain [Domain Layer]
    OrderService -->|publish(DomainEvent)| EventPublisherIface["EventPublisher (interface)"]
  end

  EventPublisherIface --> RedisPublisher["RedisEventPublisher"]
  RedisPublisher --> Redis["Redis (Streams/PubSub)"]
  Redis --> Worker["Worker (consome eventos)"]
  Worker --> SideEffects["E-mails, notificações, integrações, projeções"]
```

## 7. Benefícios Arquiteturais

- **Desacoplamento**: domínio não conhece Redis, apenas a interface `EventPublisher`.
- **Substituível**: é possível trocar Redis por Kafka, RabbitMQ, SQS etc. implementando outro `EventPublisher`.
- **Escalável**: APIs fazem apenas comando + emissão de evento; processamento pesado vai para o worker.
- **Observabilidade**: `metadata` rica em cada evento (`eventId`, `timestamp`, `source`, `correlationId`) facilita rastrear fluxos ponta a ponta.

