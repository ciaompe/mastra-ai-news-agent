import { createTool } from '@mastra/core';
import { z } from 'zod';
import axios from 'axios';

const newsApiSchema = z.object({
  pageSize: z.number().optional().default(10).describe('Number of articles to fetch'),
});

export const newsApiTool = createTool({
  id: 'fetch-ai-news',
  description: 'Fetches the latest AI and machine learning news articles from NewsAPI',
  inputSchema: newsApiSchema,
  outputSchema: z.object({
    articles: z.array(
      z.object({
        title: z.string(),
        description: z.string().nullable(),
        url: z.string(),
        publishedAt: z.string(),
        source: z.object({
          name: z.string(),
        }),
        content: z.string().nullable(),
      })
    ),
    totalResults: z.number(),
  }),
  execute: async ({ context: { pageSize } }) => {
    const apiKey = process.env.NEWS_API_KEY;
    
    if (!apiKey) {
      throw new Error('NEWS_API_KEY environment variable is not set');
    }

    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: '("artificial intelligence" OR "machine learning" OR "deep learning" OR LLM OR "Generative AI")',
          language: 'en',
          sortBy: 'publishedAt',
          pageSize,
          apiKey,
        },
      });

      return {
        articles: response.data.articles,
        totalResults: response.data.totalResults,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`NewsAPI error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  },
});

