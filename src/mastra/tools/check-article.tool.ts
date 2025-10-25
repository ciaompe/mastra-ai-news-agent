import { createTool } from '@mastra/core';
import { z } from 'zod';
import { checkArticleExists, initArticlesDb } from '../../lib/articles.db.ts';

const checkArticleSchema = z.object({
  url: z.string().describe('Article URL to check'),
  title: z.string().optional().describe('Article title for similarity checking'),
  publishedAt: z.string().optional().describe('Article publication date'),
});

export const checkArticleTool = createTool({
  id: 'check-article-exists',
  description: 'Checks if an article has already been processed (by URL or by similar title+date)',
  inputSchema: checkArticleSchema,
  outputSchema: z.object({
    exists: z.boolean(),
    processedAt: z.string().nullable(),
    matchedBy: z.enum(['url', 'title_and_date']).nullable(),
    existingUrl: z.string().optional(),
    existingTitle: z.string().optional(),
  }),
  execute: async ({ context: { url, title, publishedAt } }) => {
    try {
      // Ensure the database is initialized
      await initArticlesDb();
      
      // Check if article exists (enhanced with title+date checking)
      return await checkArticleExists(url, title, publishedAt);
    } catch (error) {
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

