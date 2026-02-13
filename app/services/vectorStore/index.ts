import { VectorStore } from './types';
import { NeonVectorStore } from './neon';

/**
 * Singleton vector store instance using Neon pgvector
 */
export const vectorStore: VectorStore = new NeonVectorStore();

console.log('✅ Using Neon pgvector store');

// Re-export types for convenience
export * from './types';
