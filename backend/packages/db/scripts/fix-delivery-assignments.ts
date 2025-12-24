#!/usr/bin/env bun
/**
 * Script específico para corrigir delivery_assignments
 * Remove a tabela e sequência para permitir recriação correta
 */

import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://lokaly:lokaly@localhost:5432/lokaly';

async function fixDeliveryAssignments() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('[Fix] Verificando delivery_assignments...');

    // Verificar se a tabela existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_assignments'
      )
    `;

    if (tableExists[0]?.exists) {
      console.log('[Fix] Tabela delivery_assignments existe.');

      // Verificar o estado atual da coluna id
      const columnInfo = await sql`
        SELECT 
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'delivery_assignments'
          AND column_name = 'id'
      `;

      if (
        columnInfo.length > 0 &&
        !columnInfo[0].column_default?.includes('delivery_assignments_id_seq')
      ) {
        console.log(
          '[Fix] ⚠️  Coluna id não está vinculada à sequência corretamente.'
        );
        console.log('[Fix] Removendo tabela e sequência para recriação...');

        // Remover tabela (isso também remove a sequência se estiver vinculada)
        await sql.unsafe('DROP TABLE IF EXISTS delivery_assignments CASCADE;');
        console.log('[Fix] ✅ Tabela removida.');

        // Garantir que a sequência também foi removida
        await sql.unsafe(
          'DROP SEQUENCE IF EXISTS delivery_assignments_id_seq CASCADE;'
        );
        console.log('[Fix] ✅ Sequência removida.');
      } else {
        console.log('[Fix] Tabela parece estar correta.');
      }
    } else {
      // Se a tabela não existe, garantir que a sequência também não existe
      console.log(
        '[Fix] Tabela não existe. Removendo sequência órfã se existir...'
      );
      await sql.unsafe(
        'DROP SEQUENCE IF EXISTS delivery_assignments_id_seq CASCADE;'
      );
      console.log('[Fix] ✅ Verificação concluída.');
    }

    console.log('[Fix] ✅ Correção concluída!');
    console.log(
      '[Fix] Agora você pode executar: bun run db:push (recomendado) ou bun run db:migrate'
    );
  } catch (error: any) {
    console.error('[Fix] ❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

fixDeliveryAssignments();
