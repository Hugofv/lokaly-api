#!/usr/bin/env bun
/**
 * Script para corrigir erros de migração
 * Remove objetos órfãos (sequências sem tabelas, etc)
 */

import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://lokaly:lokaly@localhost:5432/lokaly';

async function fixMigrationErrors() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('[Fix] Verificando objetos órfãos...');

    // Verificar sequências órfãs (sequências sem tabelas correspondentes)
    const orphanSequences = await sql`
      SELECT 
        s.sequence_name,
        s.sequence_schema
      FROM information_schema.sequences s
      LEFT JOIN information_schema.tables t 
        ON t.table_schema = s.sequence_schema 
        AND t.table_name = REPLACE(s.sequence_name, '_id_seq', '')
      WHERE s.sequence_schema = 'public'
        AND t.table_name IS NULL
    `;

    if (orphanSequences.length > 0) {
      console.log(
        `[Fix] Encontradas ${orphanSequences.length} sequências órfãs:`
      );
      for (const seq of orphanSequences) {
        console.log(`  - ${seq.sequence_schema}.${seq.sequence_name}`);
        try {
          await sql.unsafe(
            `DROP SEQUENCE IF EXISTS ${seq.sequence_schema}.${seq.sequence_name} CASCADE;`
          );
          console.log(`  ✅ Removida: ${seq.sequence_name}`);
        } catch (error: any) {
          console.log(
            `  ⚠️  Erro ao remover ${seq.sequence_name}: ${error.message}`
          );
        }
      }
    } else {
      console.log('[Fix] Nenhuma sequência órfã encontrada.');
    }

    // Verificar se a tabela delivery_assignments existe mas tem problemas
    const deliveryAssignmentsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_assignments'
      )
    `;

    if (deliveryAssignmentsExists[0]?.exists) {
      console.log('[Fix] Tabela delivery_assignments existe.');

      // Verificar se a sequência está vinculada corretamente
      const sequenceCheck = await sql`
        SELECT 
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'delivery_assignments'
          AND column_name = 'id'
      `;

      if (sequenceCheck.length > 0) {
        console.log('[Fix] Coluna id encontrada na tabela.');
        console.log(`[Fix] Default: ${sequenceCheck[0].column_default}`);
      }
    } else {
      console.log('[Fix] Tabela delivery_assignments não existe.');

      // Se a tabela não existe mas a sequência sim, remover a sequência
      const sequenceExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.sequences
          WHERE sequence_schema = 'public'
          AND sequence_name = 'delivery_assignments_id_seq'
        )
      `;

      if (sequenceExists[0]?.exists) {
        console.log(
          '[Fix] Removendo sequência órfã delivery_assignments_id_seq...'
        );
        await sql.unsafe(
          'DROP SEQUENCE IF EXISTS delivery_assignments_id_seq CASCADE;'
        );
        console.log('[Fix] ✅ Sequência removida.');
      }
    }

    console.log('[Fix] ✅ Correção concluída!');
    console.log('[Fix] Agora você pode executar: bun run db:migrate');
  } catch (error: any) {
    console.error('[Fix] ❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

fixMigrationErrors();
