// Centralized environment variable loader
// Import this file FIRST in any worker/script to ensure env vars are loaded

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Only load dotenv in non-production environments or if explicitly needed
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = join(__dirname, '..', '..', '.env');

  dotenv.config({ path: envPath });
}

// Helper to get required env var
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

// Helper to get optional env var
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}
