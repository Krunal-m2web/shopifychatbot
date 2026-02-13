import OpenAI from 'openai';

// Lazy initialization to allow environment variables to load first
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

/**
 * Generate a single embedding vector from text using OpenAI's text-embedding-3-small model
 * @param text Input text to embed (max 8000 chars after truncation)
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // Truncate to model limit
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call (more efficient)
 * @param texts Array of texts to embed
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map(t => t.slice(0, 8000)),
    dimensions: 1536,
  });

  return response.data.map(d => d.embedding);
}
