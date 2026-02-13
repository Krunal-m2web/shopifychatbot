import { query } from "../utils/pg.server";

export interface UserPreferences {
  sessionId: string;
  viewedProducts: string[];
  searchHistory: string[];
  pricePreference?: { min: number; max: number };
  categoryPreferences: Record<string, number>; // category -> weight
  lastUpdated: Date;
}

export async function getUserPreferences(sessionId: string): Promise<UserPreferences> {
  // Get session metadata
  const result = await query(
    'SELECT metadata FROM chat_sessions WHERE session_id = $1',
    [sessionId]
  );
  
  if (result.rows.length === 0) {
    return createDefaultPreferences(sessionId);
  }
  
  const metadata = result.rows[0].metadata || {};
  
  return {
    sessionId,
    viewedProducts: metadata.viewedProducts || [],
    searchHistory: metadata.searchHistory || [],
    pricePreference: metadata.pricePreference,
    categoryPreferences: metadata.categoryPreferences || {},
    lastUpdated: new Date()
  };
}

export async function updateUserPreferences(
  sessionId: string,
  updates: Partial<UserPreferences>
): Promise<void> {
  const current = await getUserPreferences(sessionId);
  
  const merged = {
    ...current,
    ...updates,
    lastUpdated: new Date()
  };
  
  await query(
    'UPDATE chat_sessions SET metadata = $1 WHERE session_id = $2',
    [JSON.stringify(merged), sessionId]
  );
}

export async function trackProductView(sessionId: string, productId: string): Promise<void> {
  const prefs = await getUserPreferences(sessionId);
  
  if (!prefs.viewedProducts.includes(productId)) {
    prefs.viewedProducts.push(productId);
    
    // Keep only last 20 viewed products
    if (prefs.viewedProducts.length > 20) {
      prefs.viewedProducts = prefs.viewedProducts.slice(-20);
    }
    
    await updateUserPreferences(sessionId, { viewedProducts: prefs.viewedProducts });
  }
}

export async function trackSearch(
  sessionId: string,
  searchQuery: string,
  categories: string[],
  collections?: string[] // Track collections separately
): Promise<void> {
  const prefs = await getUserPreferences(sessionId);
  
  // Update search history
  prefs.searchHistory.push(searchQuery);
  if (prefs.searchHistory.length > 10) {
    prefs.searchHistory = prefs.searchHistory.slice(-10);
  }
  
  // Update category preferences (tags)
  categories.forEach(category => {
    prefs.categoryPreferences[category] = (prefs.categoryPreferences[category] || 0) + 1;
  });
  
  // Update collection preferences (NEW)
  if (collections) {
    collections.forEach(collection => {
      prefs.categoryPreferences[collection] = (prefs.categoryPreferences[collection] || 0) + 1;
    });
  }
  
  await updateUserPreferences(sessionId, {
    searchHistory: prefs.searchHistory,
    categoryPreferences: prefs.categoryPreferences
  });
}

export interface RecentProduct {
  id: string;
  title: string;
  price: number;
  timestamp: string;
}

/**
 * Get recently discussed products from session metadata
 */
export async function getRecentlyDiscussed(
  sessionId: string,
  limit: number = 5
): Promise<RecentProduct[]> {
  const prefs = await getUserPreferences(sessionId);
  
  // Return the last N viewed products
  return prefs.viewedProducts
    .slice(-limit)
    .reverse()
    .map((productId, index) => ({
      id: productId,
      title: `Product ${productId}`, // Placeholder - would fetch from DB in production
      price: 0, // Placeholder
      timestamp: new Date(Date.now() - index * 60000).toISOString()
    }));
}

function createDefaultPreferences(sessionId: string): UserPreferences {
  return {
    sessionId,
    viewedProducts: [],
    searchHistory: [],
    categoryPreferences: {},
    lastUpdated: new Date()
  };
}
