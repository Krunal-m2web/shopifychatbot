import { createClient } from "@supabase/supabase-js";

let supabaseInstance: any = null;

function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseKey === "your_supabase_key") {
      throw new Error("Supabase configuration (URL/Key) is missing in environment variables.");
    }
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
}

export interface ProductEmbedding {
  id?: number;
  merchant_id: number;
  product_id: string;
  content: string;
  embedding: number[];
  metadata: any;
}

// Insert product embedding
export async function insertEmbedding(embedding: ProductEmbedding) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("product_embeddings")
    .insert({
      merchant_id: embedding.merchant_id,
      product_id: embedding.product_id,
      content: embedding.content,
      embedding: embedding.embedding,
      metadata: embedding.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting embedding:", error);
    throw error;
  }

  return data;
}

// Batch insert embeddings
export async function insertEmbeddings(embeddings: ProductEmbedding[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("product_embeddings").insert(embeddings);

  if (error) {
    console.error("Error inserting embeddings:", error);
    throw error;
  }

  return data;
}

// Delete all embeddings for a merchant
export async function deleteEmbeddingsByMerchant(merchantId: number) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("product_embeddings")
    .delete()
    .eq("merchant_id", merchantId);

  if (error) {
    console.error("Error deleting embeddings:", error);
    throw error;
  }
}

// Search embeddings using vector similarity
export async function searchEmbeddings(
  merchantId: number,
  queryEmbedding: number[],
  limit: number = 5
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("match_product_embeddings", {
    query_embedding: queryEmbedding,
    merchant_id: merchantId,
    match_count: limit,
  });

  if (error) {
    console.error("Error searching embeddings:", error);
    throw error;
  }

  return data;
}

export const supabase = {
  get instance() {
    return getSupabase();
  }
};
