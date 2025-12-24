/**
 * Database Seeder
 *
 * Seeds initial data into the database:
 * - Super admin user
 * - Basic units of measure
 * - Basic departments
 *
 * This script is idempotent - it checks if data exists before creating.
 */

import { initDb, getDrizzle } from './index';
import { users, units, departments, categories, subcategories } from './schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Default password - can be overridden via SUPER_ADMIN_PASSWORD env var
const DEFAULT_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Seed super admin user
 */
async function seedSuperAdmin() {
  const db = getDrizzle();

  console.log('[Seed] Checking for super admin...');

  // Check if super admin already exists
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@lokaly.com'))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log('[Seed] Super admin already exists, skipping...');
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  await db.insert(users).values({
    email: 'admin@lokaly.com',
    passwordHash,
    role: 'super_admin',
    firstName: 'Super',
    lastName: 'Admin',
    department: 'operations',
    isActive: true,
    emailVerified: true,
    emailVerifiedAt: new Date(),
  });

  console.log('[Seed] ✅ Super admin created successfully!');
  console.log(`[Seed] Email: admin@lokaly.com`);
  console.log(`[Seed] Password: ${DEFAULT_PASSWORD}`);
  console.log(`[Seed] ⚠️  Please change the password after first login!`);
}

/**
 * Seed basic units of measure
 */
async function seedUnits() {
  const db = getDrizzle();

  console.log('[Seed] Checking for units...');

  const basicUnits = [
    // Weight units
    {
      code: 'kg',
      name: 'Quilograma',
      abbreviation: 'kg',
      type: 'weight',
      conversionFactor: '1.000000',
    },
    {
      code: 'g',
      name: 'Grama',
      abbreviation: 'g',
      type: 'weight',
      conversionFactor: '0.001000',
      baseUnitCode: 'kg',
    },
    {
      code: 'mg',
      name: 'Miligrama',
      abbreviation: 'mg',
      type: 'weight',
      conversionFactor: '0.000001',
      baseUnitCode: 'kg',
    },

    // Volume units
    {
      code: 'L',
      name: 'Litro',
      abbreviation: 'L',
      type: 'volume',
      conversionFactor: '1.000000',
    },
    {
      code: 'ml',
      name: 'Mililitro',
      abbreviation: 'ml',
      type: 'volume',
      conversionFactor: '0.001000',
      baseUnitCode: 'L',
    },

    // Unit (count)
    {
      code: 'un',
      name: 'Unidade',
      abbreviation: 'un',
      type: 'unit',
      conversionFactor: '1.000000',
    },
    {
      code: 'cx',
      name: 'Caixa',
      abbreviation: 'cx',
      type: 'unit',
      conversionFactor: '1.000000',
    },
    {
      code: 'pct',
      name: 'Pacote',
      abbreviation: 'pct',
      type: 'unit',
      conversionFactor: '1.000000',
    },

    // Length units
    {
      code: 'm',
      name: 'Metro',
      abbreviation: 'm',
      type: 'length',
      conversionFactor: '1.000000',
    },
    {
      code: 'cm',
      name: 'Centímetro',
      abbreviation: 'cm',
      type: 'length',
      conversionFactor: '0.010000',
      baseUnitCode: 'm',
    },

    // Area units
    {
      code: 'm2',
      name: 'Metro Quadrado',
      abbreviation: 'm²',
      type: 'area',
      conversionFactor: '1.000000',
    },
  ];

  // Get existing units
  const existingUnits = await db.select().from(units);
  const existingCodes = new Set(existingUnits.map((u) => u.code));

  // Find base unit IDs for units that need them
  const baseUnitMap = new Map<string, number>();
  for (const unit of existingUnits) {
    baseUnitMap.set(unit.code, unit.id);
  }

  let createdCount = 0;
  for (const unitData of basicUnits) {
    if (existingCodes.has(unitData.code)) {
      continue; // Skip if already exists
    }

    const baseUnitId = unitData.baseUnitCode
      ? baseUnitMap.get(unitData.baseUnitCode)
      : undefined;

    await db.insert(units).values({
      code: unitData.code,
      name: unitData.name,
      abbreviation: unitData.abbreviation,
      type: unitData.type,
      conversionFactor: unitData.conversionFactor,
      baseUnitId: baseUnitId || null,
      isActive: true,
      displayOrder: createdCount,
    });

    // Update base unit map for next iterations
    const insertedUnit = await db
      .select()
      .from(units)
      .where(eq(units.code, unitData.code))
      .limit(1);

    if (insertedUnit.length > 0 && insertedUnit[0]) {
      baseUnitMap.set(unitData.code, insertedUnit[0].id);
    }

    createdCount++;
  }

  if (createdCount > 0) {
    console.log(`[Seed] ✅ Created ${createdCount} units`);
  } else {
    console.log('[Seed] Units already exist, skipping...');
  }
}

/**
 * Seed basic departments
 */
async function seedDepartments() {
  const db = getDrizzle();

  console.log('[Seed] Checking for departments...');

  const basicDepartments = [
    {
      code: 'ALIM',
      name: 'Alimentos',
      description: 'Alimentos em geral',
      displayOrder: 1,
    },
    {
      code: 'BEB',
      name: 'Bebidas',
      description: 'Bebidas alcoólicas e não alcoólicas',
      displayOrder: 2,
    },
    {
      code: 'LIMPEZA',
      name: 'Limpeza',
      description: 'Produtos de limpeza e higiene',
      displayOrder: 3,
    },
    {
      code: 'HIGIENE',
      name: 'Higiene Pessoal',
      description: 'Produtos de higiene pessoal',
      displayOrder: 4,
    },
    {
      code: 'HORTIFRUTI',
      name: 'Hortifruti',
      description: 'Frutas, verduras e legumes',
      displayOrder: 5,
    },
    {
      code: 'CARNES',
      name: 'Carnes',
      description: 'Carnes, aves e peixes',
      displayOrder: 6,
    },
    {
      code: 'LATICINIOS',
      name: 'Laticínios',
      description: 'Leite, queijos e derivados',
      displayOrder: 7,
    },
    {
      code: 'PADARIA',
      name: 'Padaria',
      description: 'Pães, bolos e produtos de padaria',
      displayOrder: 8,
    },
    {
      code: 'CONGELADOS',
      name: 'Congelados',
      description: 'Produtos congelados',
      displayOrder: 9,
    },
    {
      code: 'BEBIDAS',
      name: 'Bebidas',
      description: 'Bebidas diversas',
      displayOrder: 10,
    },
  ];

  // Get existing departments
  const existingDepartments = await db.select().from(departments);
  const existingCodes = new Set(existingDepartments.map((d) => d.code));

  let createdCount = 0;
  for (const deptData of basicDepartments) {
    if (existingCodes.has(deptData.code)) {
      continue; // Skip if already exists
    }

    await db.insert(departments).values({
      code: deptData.code,
      name: deptData.name,
      description: deptData.description,
      displayOrder: deptData.displayOrder,
      isActive: true,
    });

    createdCount++;
  }

  if (createdCount > 0) {
    console.log(`[Seed] ✅ Created ${createdCount} departments`);
  } else {
    console.log('[Seed] Departments already exist, skipping...');
  }
}

/**
 * Seed categories
 */
async function seedCategories() {
  const db = getDrizzle();

  console.log('[Seed] Checking for categories...');

  // Get all departments to map codes to IDs
  const allDepartments = await db.select().from(departments);
  const departmentMap = new Map<string, number>();
  for (const dept of allDepartments) {
    departmentMap.set(dept.code, dept.id);
  }

  // Categories organized by department
  const categoriesData = [
    // ALIM - Alimentos
    {
      deptCode: 'ALIM',
      code: 'CEREAIS',
      name: 'Cereais e Grãos',
      description: 'Arroz, feijão, massas e cereais',
      displayOrder: 1,
    },
    {
      deptCode: 'ALIM',
      code: 'CONSERVAS',
      name: 'Conservas',
      description: 'Enlatados e conservas',
      displayOrder: 2,
    },
    {
      deptCode: 'ALIM',
      code: 'DOCES',
      name: 'Doces e Sobremesas',
      description: 'Doces, chocolates e sobremesas',
      displayOrder: 3,
    },
    {
      deptCode: 'ALIM',
      code: 'SALGADINHOS',
      name: 'Salgadinhos',
      description: 'Chips, salgadinhos e snacks',
      displayOrder: 4,
    },
    {
      deptCode: 'ALIM',
      code: 'BISCOITOS',
      name: 'Biscoitos',
      description: 'Biscoitos doces e salgados',
      displayOrder: 5,
    },

    // BEB - Bebidas
    {
      deptCode: 'BEB',
      code: 'REFRIGERANTES',
      name: 'Refrigerantes',
      description: 'Refrigerantes e bebidas gaseificadas',
      displayOrder: 1,
    },
    {
      deptCode: 'BEB',
      code: 'SUCOS',
      name: 'Sucos',
      description: 'Sucos naturais e industrializados',
      displayOrder: 2,
    },
    {
      deptCode: 'BEB',
      code: 'AGUAS',
      name: 'Águas',
      description: 'Águas minerais e saborizadas',
      displayOrder: 3,
    },
    {
      deptCode: 'BEB',
      code: 'ENERGETICOS',
      name: 'Energéticos',
      description: 'Bebidas energéticas',
      displayOrder: 4,
    },
    {
      deptCode: 'BEB',
      code: 'ALCOOLICAS',
      name: 'Bebidas Alcoólicas',
      description: 'Cervejas, vinhos e destilados',
      displayOrder: 5,
    },

    // LIMPEZA
    {
      deptCode: 'LIMPEZA',
      code: 'DETERGENTES',
      name: 'Detergentes',
      description: 'Detergentes e sabões',
      displayOrder: 1,
    },
    {
      deptCode: 'LIMPEZA',
      code: 'DESINFETANTES',
      name: 'Desinfetantes',
      description: 'Desinfetantes e sanitizantes',
      displayOrder: 2,
    },
    {
      deptCode: 'LIMPEZA',
      code: 'LIMPADORES',
      name: 'Limpeza Geral',
      description: 'Produtos de limpeza geral',
      displayOrder: 3,
    },
    {
      deptCode: 'LIMPEZA',
      code: 'PAPEL',
      name: 'Papel Higiênico e Toalhas',
      description: 'Papel higiênico, toalhas e guardanapos',
      displayOrder: 4,
    },

    // HIGIENE
    {
      deptCode: 'HIGIENE',
      code: 'SHAMPOO',
      name: 'Shampoo e Condicionador',
      description: 'Cuidados com cabelo',
      displayOrder: 1,
    },
    {
      deptCode: 'HIGIENE',
      code: 'SABONETES',
      name: 'Sabonetes',
      description: 'Sabonetes líquidos e em barra',
      displayOrder: 2,
    },
    {
      deptCode: 'HIGIENE',
      code: 'CREMES',
      name: 'Cremes e Hidratantes',
      description: 'Cuidados com a pele',
      displayOrder: 3,
    },
    {
      deptCode: 'HIGIENE',
      code: 'DENTAL',
      name: 'Higiene Bucal',
      description: 'Pastas de dente, escovas e fio dental',
      displayOrder: 4,
    },
    {
      deptCode: 'HIGIENE',
      code: 'DESODORANTES',
      name: 'Desodorantes',
      description: 'Desodorantes e antitranspirantes',
      displayOrder: 5,
    },

    // HORTIFRUTI
    {
      deptCode: 'HORTIFRUTI',
      code: 'FRUTAS',
      name: 'Frutas',
      description: 'Frutas frescas',
      displayOrder: 1,
    },
    {
      deptCode: 'HORTIFRUTI',
      code: 'VERDURAS',
      name: 'Verduras',
      description: 'Verduras frescas',
      displayOrder: 2,
    },
    {
      deptCode: 'HORTIFRUTI',
      code: 'LEGUMES',
      name: 'Legumes',
      description: 'Legumes frescos',
      displayOrder: 3,
    },
    {
      deptCode: 'HORTIFRUTI',
      code: 'TEMPEROS',
      name: 'Temperos e Ervas',
      description: 'Temperos frescos e secos',
      displayOrder: 4,
    },

    // CARNES
    {
      deptCode: 'CARNES',
      code: 'CARNE_BOVINA',
      name: 'Carne Bovina',
      description: 'Carnes bovinas',
      displayOrder: 1,
    },
    {
      deptCode: 'CARNES',
      code: 'CARNE_SUINA',
      name: 'Carne Suína',
      description: 'Carnes suínas',
      displayOrder: 2,
    },
    {
      deptCode: 'CARNES',
      code: 'AVES',
      name: 'Aves',
      description: 'Frango, peru e outras aves',
      displayOrder: 3,
    },
    {
      deptCode: 'CARNES',
      code: 'PEIXES',
      name: 'Peixes e Frutos do Mar',
      description: 'Peixes frescos e frutos do mar',
      displayOrder: 4,
    },
    {
      deptCode: 'CARNES',
      code: 'EMBUTIDOS',
      name: 'Embutidos',
      description: 'Linguiças, salsichas e embutidos',
      displayOrder: 5,
    },

    // LATICINIOS
    {
      deptCode: 'LATICINIOS',
      code: 'LEITE',
      name: 'Leite',
      description: 'Leite e derivados',
      displayOrder: 1,
    },
    {
      deptCode: 'LATICINIOS',
      code: 'QUEIJOS',
      name: 'Queijos',
      description: 'Queijos diversos',
      displayOrder: 2,
    },
    {
      deptCode: 'LATICINIOS',
      code: 'IOGURTES',
      name: 'Iogurtes',
      description: 'Iogurtes e bebidas lácteas',
      displayOrder: 3,
    },
    {
      deptCode: 'LATICINIOS',
      code: 'MANTEIGAS',
      name: 'Manteigas e Margarinas',
      description: 'Manteigas e margarinas',
      displayOrder: 4,
    },

    // PADARIA
    {
      deptCode: 'PADARIA',
      code: 'PAES',
      name: 'Pães',
      description: 'Pães frescos e de forma',
      displayOrder: 1,
    },
    {
      deptCode: 'PADARIA',
      code: 'BOLOS',
      name: 'Bolos e Tortas',
      description: 'Bolos e tortas',
      displayOrder: 2,
    },
    {
      deptCode: 'PADARIA',
      code: 'DOCES_PADARIA',
      name: 'Doces de Padaria',
      description: 'Doces e confeitos',
      displayOrder: 3,
    },

    // CONGELADOS
    {
      deptCode: 'CONGELADOS',
      code: 'CARNES_CONG',
      name: 'Carnes Congeladas',
      description: 'Carnes congeladas',
      displayOrder: 1,
    },
    {
      deptCode: 'CONGELADOS',
      code: 'PRATOS_PONTOS',
      name: 'Pratos Prontos',
      description: 'Pratos prontos congelados',
      displayOrder: 2,
    },
    {
      deptCode: 'CONGELADOS',
      code: 'SORVETES',
      name: 'Sorvetes',
      description: 'Sorvetes e picolés',
      displayOrder: 3,
    },
    {
      deptCode: 'CONGELADOS',
      code: 'HORTIFRUTI_CONG',
      name: 'Hortifruti Congelado',
      description: 'Frutas e legumes congelados',
      displayOrder: 4,
    },
  ];

  // Get existing categories
  const existingCategories = await db.select().from(categories);
  const existingCategoryKeys = new Set(
    existingCategories.map((c) => `${c.departmentId}-${c.code}`)
  );

  let createdCount = 0;
  for (const catData of categoriesData) {
    const departmentId = departmentMap.get(catData.deptCode);
    if (!departmentId) {
      console.warn(
        `[Seed] Department ${catData.deptCode} not found, skipping category ${catData.code}`
      );
      continue;
    }

    const categoryKey = `${departmentId}-${catData.code}`;
    if (existingCategoryKeys.has(categoryKey)) {
      continue; // Skip if already exists
    }

    await db.insert(categories).values({
      departmentId,
      code: catData.code,
      name: catData.name,
      description: catData.description,
      displayOrder: catData.displayOrder,
      isActive: true,
    });

    createdCount++;
  }

  if (createdCount > 0) {
    console.log(`[Seed] ✅ Created ${createdCount} categories`);
  } else {
    console.log('[Seed] Categories already exist, skipping...');
  }
}

/**
 * Seed subcategories
 */
async function seedSubcategories() {
  const db = getDrizzle();

  console.log('[Seed] Checking for subcategories...');

  // Get all categories to map codes to IDs
  const allCategories = await db.select().from(categories);
  const categoryMap = new Map<string, number>();
  for (const cat of allCategories) {
    // Use departmentId-categoryCode as key
    const key = `${cat.departmentId}-${cat.code}`;
    categoryMap.set(key, cat.id);
  }

  // Get departments for mapping
  const allDepartments = await db.select().from(departments);
  const departmentMap = new Map<string, number>();
  for (const dept of allDepartments) {
    departmentMap.set(dept.code, dept.id);
  }

  // Subcategories organized by category
  const subcategoriesData = [
    // CEREAIS (ALIM)
    {
      deptCode: 'ALIM',
      catCode: 'CEREAIS',
      code: 'ARROZ',
      name: 'Arroz',
      description: 'Arroz branco, integral, parboilizado',
      displayOrder: 1,
    },
    {
      deptCode: 'ALIM',
      catCode: 'CEREAIS',
      code: 'FEIJAO',
      name: 'Feijão',
      description: 'Feijão preto, carioca, branco',
      displayOrder: 2,
    },
    {
      deptCode: 'ALIM',
      catCode: 'CEREAIS',
      code: 'MASSAS',
      name: 'Massas',
      description: 'Macarrão, espaguete, penne',
      displayOrder: 3,
    },
    {
      deptCode: 'ALIM',
      catCode: 'CEREAIS',
      code: 'FARINHAS',
      name: 'Farinhas',
      description: 'Farinha de trigo, mandioca, etc',
      displayOrder: 4,
    },
    {
      deptCode: 'ALIM',
      catCode: 'CEREAIS',
      code: 'CEREAIS_MATINAIS',
      name: 'Cereais Matinais',
      description: 'Cereais para café da manhã',
      displayOrder: 5,
    },

    // CONSERVAS (ALIM)
    {
      deptCode: 'ALIM',
      catCode: 'CONSERVAS',
      code: 'MILHO',
      name: 'Milho',
      description: 'Milho em conserva',
      displayOrder: 1,
    },
    {
      deptCode: 'ALIM',
      catCode: 'CONSERVAS',
      code: 'ERVILHA',
      name: 'Ervilha',
      description: 'Ervilha em conserva',
      displayOrder: 2,
    },
    {
      deptCode: 'ALIM',
      catCode: 'CONSERVAS',
      code: 'PALMITO',
      name: 'Palmito',
      description: 'Palmito em conserva',
      displayOrder: 3,
    },
    {
      deptCode: 'ALIM',
      catCode: 'CONSERVAS',
      code: 'ATUM',
      name: 'Atum',
      description: 'Atum em conserva',
      displayOrder: 4,
    },
    {
      deptCode: 'ALIM',
      catCode: 'CONSERVAS',
      code: 'SARDINHA',
      name: 'Sardinha',
      description: 'Sardinha em conserva',
      displayOrder: 5,
    },

    // DOCES (ALIM)
    {
      deptCode: 'ALIM',
      catCode: 'DOCES',
      code: 'CHOCOLATES',
      name: 'Chocolates',
      description: 'Chocolates e barras',
      displayOrder: 1,
    },
    {
      deptCode: 'ALIM',
      catCode: 'DOCES',
      code: 'BALAS',
      name: 'Balas',
      description: 'Balas e confeitos',
      displayOrder: 2,
    },
    {
      deptCode: 'ALIM',
      catCode: 'DOCES',
      code: 'GELATINAS',
      name: 'Gelatinas',
      description: 'Gelatinas em pó',
      displayOrder: 3,
    },
    {
      deptCode: 'ALIM',
      catCode: 'DOCES',
      code: 'ACHOCOLATADOS',
      name: 'Achocolatados',
      description: 'Achocolatados em pó',
      displayOrder: 4,
    },

    // REFRIGERANTES (BEB)
    {
      deptCode: 'BEB',
      catCode: 'REFRIGERANTES',
      code: 'COLA',
      name: 'Cola',
      description: 'Refrigerantes de cola',
      displayOrder: 1,
    },
    {
      deptCode: 'BEB',
      catCode: 'REFRIGERANTES',
      code: 'GUARANA',
      name: 'Guaraná',
      description: 'Refrigerantes de guaraná',
      displayOrder: 2,
    },
    {
      deptCode: 'BEB',
      catCode: 'REFRIGERANTES',
      code: 'LARANJA',
      name: 'Laranja',
      description: 'Refrigerantes de laranja',
      displayOrder: 3,
    },
    {
      deptCode: 'BEB',
      catCode: 'REFRIGERANTES',
      code: 'LIMONADA',
      name: 'Limonada',
      description: 'Refrigerantes de limão',
      displayOrder: 4,
    },

    // SUCOS (BEB)
    {
      deptCode: 'BEB',
      catCode: 'SUCOS',
      code: 'SUCO_NATURAL',
      name: 'Suco Natural',
      description: 'Sucos naturais',
      displayOrder: 1,
    },
    {
      deptCode: 'BEB',
      catCode: 'SUCOS',
      code: 'SUCO_CAIXA',
      name: 'Suco de Caixa',
      description: 'Sucos industrializados',
      displayOrder: 2,
    },
    {
      deptCode: 'BEB',
      catCode: 'SUCOS',
      code: 'NECTAR',
      name: 'Néctar',
      description: 'Néctares de frutas',
      displayOrder: 3,
    },
    {
      deptCode: 'BEB',
      catCode: 'SUCOS',
      code: 'POLPA',
      name: 'Polpa de Fruta',
      description: 'Polpas congeladas',
      displayOrder: 4,
    },

    // AGUAS (BEB)
    {
      deptCode: 'BEB',
      catCode: 'AGUAS',
      code: 'AGUA_MINERAL',
      name: 'Água Mineral',
      description: 'Águas minerais',
      displayOrder: 1,
    },
    {
      deptCode: 'BEB',
      catCode: 'AGUAS',
      code: 'AGUA_SABORIZADA',
      name: 'Água Saborizada',
      description: 'Águas com sabor',
      displayOrder: 2,
    },

    // DETERGENTES (LIMPEZA)
    {
      deptCode: 'LIMPEZA',
      catCode: 'DETERGENTES',
      code: 'DETERGENTE_LIQUIDO',
      name: 'Detergente Líquido',
      description: 'Detergentes líquidos',
      displayOrder: 1,
    },
    {
      deptCode: 'LIMPEZA',
      catCode: 'DETERGENTES',
      code: 'SABAO_BARRA',
      name: 'Sabão em Barra',
      description: 'Sabões em barra',
      displayOrder: 2,
    },
    {
      deptCode: 'LIMPEZA',
      catCode: 'DETERGENTES',
      code: 'SABAO_PO',
      name: 'Sabão em Pó',
      description: 'Sabões em pó',
      displayOrder: 3,
    },

    // SHAMPOO (HIGIENE)
    {
      deptCode: 'HIGIENE',
      catCode: 'SHAMPOO',
      code: 'SHAMPOO_ADULTO',
      name: 'Shampoo Adulto',
      description: 'Shampoos para adultos',
      displayOrder: 1,
    },
    {
      deptCode: 'HIGIENE',
      catCode: 'SHAMPOO',
      code: 'SHAMPOO_INFANTIL',
      name: 'Shampoo Infantil',
      description: 'Shampoos para crianças',
      displayOrder: 2,
    },
    {
      deptCode: 'HIGIENE',
      catCode: 'SHAMPOO',
      code: 'CONDICIONADOR',
      name: 'Condicionador',
      description: 'Condicionadores',
      displayOrder: 3,
    },

    // DENTAL (HIGIENE)
    {
      deptCode: 'HIGIENE',
      catCode: 'DENTAL',
      code: 'PASTA_DENTE',
      name: 'Pasta de Dente',
      description: 'Pastas de dente',
      displayOrder: 1,
    },
    {
      deptCode: 'HIGIENE',
      catCode: 'DENTAL',
      code: 'ESCOVAS',
      name: 'Escovas de Dente',
      description: 'Escovas dentais',
      displayOrder: 2,
    },
    {
      deptCode: 'HIGIENE',
      catCode: 'DENTAL',
      code: 'FIO_DENTAL',
      name: 'Fio Dental',
      description: 'Fios dentais',
      displayOrder: 3,
    },
    {
      deptCode: 'HIGIENE',
      catCode: 'DENTAL',
      code: 'ENXAGUANTE',
      name: 'Enxaguante Bucal',
      description: 'Enxaguantes bucais',
      displayOrder: 4,
    },

    // FRUTAS (HORTIFRUTI)
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'FRUTAS',
      code: 'BANANA',
      name: 'Banana',
      description: 'Bananas diversas',
      displayOrder: 1,
    },
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'FRUTAS',
      code: 'MACA',
      name: 'Maçã',
      description: 'Maçãs diversas',
      displayOrder: 2,
    },
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'FRUTAS',
      code: 'LARANJA_FRUTA',
      name: 'Laranja',
      description: 'Laranjas',
      displayOrder: 3,
    },
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'FRUTAS',
      code: 'MELANCIA',
      name: 'Melancia',
      description: 'Melancias',
      displayOrder: 4,
    },
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'FRUTAS',
      code: 'MAMAO',
      name: 'Mamão',
      description: 'Mamões',
      displayOrder: 5,
    },

    // VERDURAS (HORTIFRUTI)
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'VERDURAS',
      code: 'ALFACE',
      name: 'Alface',
      description: 'Alfaces diversas',
      displayOrder: 1,
    },
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'VERDURAS',
      code: 'COUVE',
      name: 'Couve',
      description: 'Couves',
      displayOrder: 2,
    },
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'VERDURAS',
      code: 'RUCULA',
      name: 'Rúcula',
      description: 'Rúcula',
      displayOrder: 3,
    },
    {
      deptCode: 'HORTIFRUTI',
      catCode: 'VERDURAS',
      code: 'ESPINAFRE',
      name: 'Espinafre',
      description: 'Espinafre',
      displayOrder: 4,
    },

    // CARNE_BOVINA (CARNES)
    {
      deptCode: 'CARNES',
      catCode: 'CARNE_BOVINA',
      code: 'PATINHO',
      name: 'Patinho',
      description: 'Carne patinho',
      displayOrder: 1,
    },
    {
      deptCode: 'CARNES',
      catCode: 'CARNE_BOVINA',
      code: 'ALCATRA',
      name: 'Alcatra',
      description: 'Carne alcatra',
      displayOrder: 2,
    },
    {
      deptCode: 'CARNES',
      catCode: 'CARNE_BOVINA',
      code: 'MAMINHA',
      name: 'Maminha',
      description: 'Carne maminha',
      displayOrder: 3,
    },
    {
      deptCode: 'CARNES',
      catCode: 'CARNE_BOVINA',
      code: 'COSTELA',
      name: 'Costela',
      description: 'Costela bovina',
      displayOrder: 4,
    },

    // AVES (CARNES)
    {
      deptCode: 'CARNES',
      catCode: 'AVES',
      code: 'FRANGO_INTEIRO',
      name: 'Frango Inteiro',
      description: 'Frango inteiro',
      displayOrder: 1,
    },
    {
      deptCode: 'CARNES',
      catCode: 'AVES',
      code: 'PEITO_FRANGO',
      name: 'Peito de Frango',
      description: 'Peito de frango',
      displayOrder: 2,
    },
    {
      deptCode: 'CARNES',
      catCode: 'AVES',
      code: 'COXA_SOBRECOXA',
      name: 'Coxa e Sobrecoxa',
      description: 'Coxas e sobrecoxas',
      displayOrder: 3,
    },
    {
      deptCode: 'CARNES',
      catCode: 'AVES',
      code: 'ASA_FRANGO',
      name: 'Asa de Frango',
      description: 'Asas de frango',
      displayOrder: 4,
    },

    // LEITE (LATICINIOS)
    {
      deptCode: 'LATICINIOS',
      catCode: 'LEITE',
      code: 'LEITE_INTEGRAL',
      name: 'Leite Integral',
      description: 'Leite integral',
      displayOrder: 1,
    },
    {
      deptCode: 'LATICINIOS',
      catCode: 'LEITE',
      code: 'LEITE_DESNATADO',
      name: 'Leite Desnatado',
      description: 'Leite desnatado',
      displayOrder: 2,
    },
    {
      deptCode: 'LATICINIOS',
      catCode: 'LEITE',
      code: 'LEITE_SEMI',
      name: 'Leite Semi-desnatado',
      description: 'Leite semi-desnatado',
      displayOrder: 3,
    },
    {
      deptCode: 'LATICINIOS',
      catCode: 'LEITE',
      code: 'LEITE_LONGA_VIDA',
      name: 'Leite Longa Vida',
      description: 'Leite UHT',
      displayOrder: 4,
    },

    // QUEIJOS (LATICINIOS)
    {
      deptCode: 'LATICINIOS',
      catCode: 'QUEIJOS',
      code: 'MUSSARELA',
      name: 'Mussarela',
      description: 'Queijo mussarela',
      displayOrder: 1,
    },
    {
      deptCode: 'LATICINIOS',
      catCode: 'QUEIJOS',
      code: 'PRATO',
      name: 'Queijo Prato',
      description: 'Queijo prato',
      displayOrder: 2,
    },
    {
      deptCode: 'LATICINIOS',
      catCode: 'QUEIJOS',
      code: 'MINAS',
      name: 'Queijo Minas',
      description: 'Queijo minas',
      displayOrder: 3,
    },
    {
      deptCode: 'LATICINIOS',
      catCode: 'QUEIJOS',
      code: 'RICOTA',
      name: 'Ricota',
      description: 'Ricota',
      displayOrder: 4,
    },

    // PAES (PADARIA)
    {
      deptCode: 'PADARIA',
      catCode: 'PAES',
      code: 'PAO_FRANCES',
      name: 'Pão Francês',
      description: 'Pão francês',
      displayOrder: 1,
    },
    {
      deptCode: 'PADARIA',
      catCode: 'PAES',
      code: 'PAO_DOCE',
      name: 'Pão Doce',
      description: 'Pães doces',
      displayOrder: 2,
    },
    {
      deptCode: 'PADARIA',
      catCode: 'PAES',
      code: 'PAO_INTEGRAL',
      name: 'Pão Integral',
      description: 'Pães integrais',
      displayOrder: 3,
    },
    {
      deptCode: 'PADARIA',
      catCode: 'PAES',
      code: 'PAO_FORMA',
      name: 'Pão de Forma',
      description: 'Pães de forma',
      displayOrder: 4,
    },

    // SORVETES (CONGELADOS)
    {
      deptCode: 'CONGELADOS',
      catCode: 'SORVETES',
      code: 'SORVETE_POTE',
      name: 'Sorvete em Pote',
      description: 'Sorvetes em potes',
      displayOrder: 1,
    },
    {
      deptCode: 'CONGELADOS',
      catCode: 'SORVETES',
      code: 'PICOLES',
      name: 'Picolés',
      description: 'Picolés',
      displayOrder: 2,
    },
    {
      deptCode: 'CONGELADOS',
      catCode: 'SORVETES',
      code: 'ACAI',
      name: 'Açaí',
      description: 'Açaí congelado',
      displayOrder: 3,
    },
  ];

  // Get existing subcategories
  const existingSubcategories = await db.select().from(subcategories);
  const existingSubcategoryKeys = new Set(
    existingSubcategories.map((s) => `${s.categoryId}-${s.code}`)
  );

  let createdCount = 0;
  for (const subcatData of subcategoriesData) {
    const departmentId = departmentMap.get(subcatData.deptCode);
    if (!departmentId) {
      console.warn(
        `[Seed] Department ${subcatData.deptCode} not found, skipping subcategory ${subcatData.code}`
      );
      continue;
    }

    const categoryKey = `${departmentId}-${subcatData.catCode}`;
    const categoryId = categoryMap.get(categoryKey);
    if (!categoryId) {
      console.warn(
        `[Seed] Category ${subcatData.catCode} not found, skipping subcategory ${subcatData.code}`
      );
      continue;
    }

    const subcategoryKey = `${categoryId}-${subcatData.code}`;
    if (existingSubcategoryKeys.has(subcategoryKey)) {
      continue; // Skip if already exists
    }

    await db.insert(subcategories).values({
      categoryId,
      code: subcatData.code,
      name: subcatData.name,
      description: subcatData.description,
      displayOrder: subcatData.displayOrder,
      isActive: true,
    });

    createdCount++;
  }

  if (createdCount > 0) {
    console.log(`[Seed] ✅ Created ${createdCount} subcategories`);
  } else {
    console.log('[Seed] Subcategories already exist, skipping...');
  }
}

/**
 * Main seed function
 */
export async function seed() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://lokaly:lokaly@localhost:5432/lokaly';

  console.log('[Seed] Starting database seeding...');
  console.log(`[Seed] Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

  try {
    // Initialize database connection
    await initDb(databaseUrl);

    // Run migrations first (if needed)
    // Note: Migrations should be run separately, but we ensure DB is initialized

    // Seed data (order matters due to foreign keys)
    await seedSuperAdmin();
    await seedUnits();
    await seedDepartments();
    await seedCategories(); // Must be after departments
    await seedSubcategories(); // Must be after categories

    console.log('[Seed] ✅ Seeding completed successfully!');
  } catch (error) {
    console.error('[Seed] ❌ Error during seeding:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.main) {
  seed()
    .then(() => {
      console.log('[Seed] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Seed] Fatal error:', error);
      process.exit(1);
    });
}
