import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function runMigration() {
  console.log('🔧 Running pgvector setup migration...');

  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: NEON_DATABASE_URL or DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // Use Pool instead of neon() for raw SQL execution
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, '..', 'prisma', 'migrations', '001_pgvector_setup.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration using Pool
    console.log('📦 Executing SQL migration...');
    await pool.query(migrationSQL);

    console.log('✅ pgvector setup completed successfully!');
    console.log('   - pgvector extension enabled');
    console.log('   - documents table created');
    console.log('   - HNSW vector index created');
    console.log('   - search_documents() function created');
    console.log('   - hybrid_search() function created');

    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
