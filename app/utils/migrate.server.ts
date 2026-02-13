// This script is used to migrate the database schema
import "dotenv/config";
import fs from "fs";
import path from "path";
import pool from "./pg.server";

export async function runMigration() {
  const client = await pool.connect();

  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Run base schema if needed
    const baseSchemaPath = path.join(process.cwd(), "app/utils/schema.sql");
    if (fs.existsSync(baseSchemaPath)) {
      console.log("📋 Running base schema...");
      const schema = fs.readFileSync(baseSchemaPath, "utf8");
      await client.query(schema);
      console.log("✅ Base schema applied");
    }

    // Run versioned migrations
    const migrationsDir = path.join(process.cwd(), "app/utils/migrations");
    
    if (!fs.existsSync(migrationsDir)) {
      console.log("⚠️  No migrations directory found, skipping versioned migrations");
      return;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const version = file.replace(".sql", "");

      // Check if already applied
      const result = await client.query(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [version]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Migration ${version} already applied, skipping`);
        continue;
      }

      // Apply migration
      console.log(`🔄 Applying migration: ${version}`);
      const migrationSQL = fs.readFileSync(
        path.join(migrationsDir, file),
        "utf8"
      );

      await client.query(migrationSQL);

      // Record as applied
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [version]
      );

      console.log(`✅ Migration ${version} applied successfully`);
    }

    console.log("✅ All database migrations completed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}
