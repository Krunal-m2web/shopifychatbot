import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

function getOpenAI() {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_key") {
      throw new Error("OPENAI_API_KEY is not configured in environment variables.");
    }
    openaiInstance = new OpenAI({
      apiKey,
    });
  }
  return openaiInstance;
}

/*
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      encoding_format: "float",
    });

    return response.data.map((item: any) => item.embedding);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw error;
  }
}
*/

export const openai = {
  get instance() {
    return getOpenAI();
  }
};

//////////////////
// Fake deterministic embeddings (free, local dev only)
// This creates a stable vector for the same input text every time.

const EMBEDDING_DIMENSION = 1536;

// Simple stop words to improve keyword focus
export const STOP_WORDS = new Set(["a", "an", "the", "and", "or", "but", "is", "if", "then", "else", "at", "by", "from", "for", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can", "will", "just", "should", "now", "i", "need", "have", "want", "do", "you"]);

function hashStringToSeed(str: string) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateWordVector(word: string): number[] {
  const seed = hashStringToSeed(word);
  const rand = seededRandom(seed);
  return Array.from({ length: EMBEDDING_DIMENSION }, () => rand() * 2 - 1);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log("🧪 Using Mock Semantic Embedding for:", text.substring(0, 30) + "...");
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  if (words.length === 0) {
    return Array.from({ length: EMBEDDING_DIMENSION }, () => 0);
  }

  const documentVector = new Array(EMBEDDING_DIMENSION).fill(0);

  for (const word of words) {
    const wordVector = generateWordVector(word);
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      documentVector[i] += wordVector[i];
    }
  }

  // Normalize
  const magnitude = Math.sqrt(documentVector.reduce((sum, val) => sum + val * val, 0));
  return documentVector.map(val => (magnitude > 0 ? val / magnitude : 0));
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (const text of texts) {
    vectors.push(await generateEmbedding(text));
  }
  return vectors;
}
