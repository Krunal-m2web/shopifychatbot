import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function testConnection() {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ No database URL configured');
    console.log('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }

  console.log('🔍 Testing database connection...');
  console.log(`📍 Host: ${new URL(databaseUrl).hostname}`);

  try {
    const sql = neon(databaseUrl);
    const result = await sql`SELECT version()`;

    console.log('✅ Database connection successful!');
    console.log(`📊 PostgreSQL version: ${result[0].version}`);

    // Test pgvector extension
    try {
      const extCheck = await sql`SELECT * FROM pg_extension WHERE extname = 'vector'`;
      if (extCheck.length > 0) {
        console.log('✅ pgvector extension is installed');
      } else {
        console.log('⚠️  pgvector extension not found - run: npm run db:vector-setup');
      }
    } catch (err) {
      console.log('⚠️  Could not check pgvector extension');
    }

    // Test if merchants table exists
    try {
      const tableCheck = await sql`SELECT COUNT(*) FROM merchants`;
      console.log(`✅ merchants table exists (${tableCheck[0].count} records)`);
    } catch (err) {
      console.log('⚠️  merchants table not found - run: npm run db:push');
    }

  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', (error as Error).message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your DATABASE_URL is correct');
    console.log('2. Ensure the database server is running');
    console.log('3. Check your network/firewall settings');
    console.log('4. Try creating a new Neon database: https://console.neon.tech');
    process.exit(1);
  }
}

testConnection();
