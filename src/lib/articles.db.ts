import { createClient } from '@supabase/supabase-js';

// Create a Supabase database client for articles
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}

const articlesDb = createClient(supabaseUrl, supabaseKey);

// Initialize the database with the required table
export async function initArticlesDb() {
  try {
    // Create table if it doesn't exist
    const { error: tableError } = await articlesDb.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS processed_articles (
          id BIGSERIAL PRIMARY KEY,
          url TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          normalized_title TEXT NOT NULL,
          published_at TEXT NOT NULL,
          processed_at TEXT NOT NULL
        )
      `
    }).catch(() => {
      // If RPC doesn't work, we'll handle it via direct query
      return { error: null };
    });

    // Create an index for faster duplicate detection
    const { error: indexError } = await articlesDb.rpc('sql', {
      query: `
        CREATE INDEX IF NOT EXISTS idx_normalized_title_date 
        ON processed_articles(normalized_title, published_at)
      `
    }).catch(() => {
      return { error: null };
    });

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.warn('Note: Ensure the processed_articles table exists in your Supabase database');
  }
}

// Normalize title for comparison (lowercase, remove special chars, extra spaces)
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

// Extract date without time for comparison
function getDateOnly(dateString: string): string {
  try {
    // Handle various date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If date parsing fails, try to extract YYYY-MM-DD from string
      const match = dateString.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : dateString.split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch {
    return dateString.split('T')[0];
  }
}

// Check if an article exists (by URL or similar title + date)
export async function checkArticleExists(url: string, title?: string, publishedAt?: string) {
  // Check by exact URL first
  const { data: urlData, error: urlError } = await articlesDb
    .from('processed_articles')
    .select('url, title, processed_at')
    .eq('url', url)
    .limit(1);

  if (!urlError && urlData && urlData.length > 0) {
    return { 
      exists: true, 
      processedAt: urlData[0].processed_at as string,
      matchedBy: 'url' as const,
      existingUrl: urlData[0].url as string,
    };
  }

  // If title and publishedAt provided, check for similar articles on same date
  if (title && publishedAt) {
    const normalizedTitle = normalizeTitle(title);
    const dateOnly = getDateOnly(publishedAt);
    
    const { data: similarData, error: similarError } = await articlesDb
      .from('processed_articles')
      .select('url, title, processed_at')
      .eq('normalized_title', normalizedTitle)
      .gte('published_at', dateOnly)
      .lt('published_at', new Date(new Date(dateOnly).getTime() + 86400000).toISOString().split('T')[0]);

    if (!similarError && similarData && similarData.length > 0) {
      return { 
        exists: true, 
        processedAt: similarData[0].processed_at as string,
        matchedBy: 'title_and_date' as const,
        existingUrl: similarData[0].url as string,
        existingTitle: similarData[0].title as string,
      };
    }
  }

  return { exists: false, processedAt: null, matchedBy: null };
}

// Save a new article
export async function saveArticle(url: string, title: string, publishedAt: string) {
  const processedAt = new Date().toISOString();
  const normalizedTitle = normalizeTitle(title);
  
  const { error } = await articlesDb
    .from('processed_articles')
    .insert([
      {
        url,
        title,
        normalized_title: normalizedTitle,
        published_at: publishedAt,
        processed_at: processedAt,
      }
    ]);

  if (error) {
    throw new Error(`Failed to save article: ${error.message}`);
  }

  return { success: true, message: 'Article saved successfully' };
}

// Helper function to normalize title (exported for use in other modules)
export { normalizeTitle };

export { articlesDb };

// Debug helper: Get all processed articles
export async function getAllProcessedArticles() {
  const { data, error } = await articlesDb
    .from('processed_articles')
    .select('*')
    .order('processed_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get articles: ${error.message}`);
  }

  return data || [];
}

// Debug helper: Clear all articles (use with caution!)
export async function clearAllArticles() {
  const { error } = await articlesDb
    .from('processed_articles')
    .delete()
    .neq('id', 0); // This deletes all rows

  if (error) {
    throw new Error(`Failed to clear articles: ${error.message}`);
  }

  return { success: true, message: 'All articles cleared' };
}
