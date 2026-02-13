import { neon, neonConfig, Pool } from '@neondatabase/serverless';

// Enable connection pooling for better serverless performance
neonConfig.fetchConnectionCache = true;

// Lazy initialization to allow environment variables to load first
let _sql: ReturnType<typeof neon> | null = null;
let _pool: Pool | null = null;

function getDatabaseUrl(): string {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL or DATABASE_URL environment variable is required');
  }

  return databaseUrl;
}

// Lazy-loaded SQL client for tagged template queries
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  apply(_target, _thisArg, args) {
    if (!_sql) {
      _sql = neon(getDatabaseUrl());
    }
    return _sql(...args);
  },
  get(_target, prop) {
    if (!_sql) {
      _sql = neon(getDatabaseUrl());
    }
    return (_sql as any)[prop];
  }
});

// Lazy-loaded connection pool for transactions
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    if (!_pool) {
      _pool = new Pool({ connectionString: getDatabaseUrl() });
    }
    return (_pool as any)[prop];
  }
});

// Helper for running database transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  if (!_pool) {
    _pool = new Pool({ connectionString: getDatabaseUrl() });
  }

  const client = await _pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
