# Database Documentation

Documentação completa do schema do banco de dados.

## Arquivos

- **[database-schema.md](./database-schema.md)** - Documentação completa e detalhada do schema

## Estrutura da Documentação

A documentação principal (`database-schema.md`) contém:

1. **Visão Geral** - Arquitetura e tecnologias utilizadas
2. **Convenções e Padrões** - Naming conventions e tipos de dados
3. **Sistema de Pedidos** - Tabelas relacionadas a pedidos
4. **Catálogo de Produtos** - Hierarquia, produtos, variantes, imagens, preços
5. **Gestão de Estoque** - Warehouses, estoque e reservas
6. **Relacionamentos** - Diagrama e explicação dos relacionamentos
7. **Enums e Validações** - Todos os enums disponíveis
8. **Exemplos Práticos** - Exemplos de queries e casos de uso

## Quick Start

Para entender rapidamente o schema:

1. Comece pela [Visão Geral](./database-schema.md#visão-geral)
2. Veja os [Relacionamentos](./database-schema.md#relacionamentos) para entender a estrutura
3. Consulte as seções específicas conforme necessário
4. Use os [Exemplos Práticos](./database-schema.md#exemplos-práticos) como referência

## Schema Source

O schema está definido em: `backend/packages/db/src/schema.ts`

## Migrações

As migrações estão em: `backend/packages/db/drizzle/`

Para gerar novas migrações:

```bash
cd backend/packages/db
bun run db:generate
```

Para executar migrações:

```bash
cd backend/packages/db
bun run db:migrate
```
