import { createTool } from '@mastra/core';
import { z } from 'zod';
import { saveArticle, initArticlesDb } from '../../lib/articles.db.ts';

const saveArticleSchema = z.object({
  url: z.string().describe('Article URL'),
  title: z.string().describe('Article title'),
  publishedAt: z.string().describe('Article publication date'),
});

export const saveArticleTool = createTool({
  id: 'save-article',
  description: 'Saves a processed article to the database',
  inputSchema: saveArticleSchema,
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context: { url, title, publishedAt } }) => {
    try {
      // Ensure the database is initialized
      await initArticlesDb();
      
      // Save the article
      return await saveArticle(url, title, publishedAt);
    } catch (error) {
      // If it's a unique constraint error, that's okay
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        return {
          success: true,
          message: 'Article already exists in database',
        };
      }
      
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

