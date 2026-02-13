// Database Connection
import { Pool } from "pg";

function normalizeDatabaseUrl(url?: string) {
  if (!url) return url;
  const trimmed = url.trim();
  const normalized = trimmed.replace("aws-neon.tech", "aws.neon.tech");
  if (trimmed !== normalized) {
    console.warn("Normalized DATABASE_URL host from aws-neon.tech to aws.neon.tech");
  }
  return normalized;
}

const isProduction = process.env.NODE_ENV === "production";
const useSsl = process.env.DATABASE_URL?.includes("sslmode=require") || isProduction;

const pool = new Pool({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();

  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export default pool;
