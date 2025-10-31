import { createTool } from '@mastra/core';
import { z } from 'zod';
import axios from 'axios';

const hackerNewsApiSchema = z.object({
  limit: z.number().optional().default(20).describe('Number of articles to fetch'),
});

export const hackerNewsApiTool = createTool({
  id: 'fetch-hackernews-ai',
  description: 'Fetches the latest AI and machine learning news articles from Hacker News API',
  inputSchema: hackerNewsApiSchema,
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
  execute: async ({ context: { limit } }) => {
    try {
      // Fetch top story IDs
      const topStoriesResponse = await axios.get(
        'https://hacker-news.firebaseio.com/v0/topstories.json'
      );
      const storyIds = topStoriesResponse.data.slice(0, limit);

      // Fetch story details for each ID
      const storyPromises = storyIds.map(async (id: number) => {
        const storyResponse = await axios.get(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        return storyResponse.data;
      });

      const stories = await Promise.all(storyPromises);

      // Filter for AI-related stories
      const aiKeywords = [
        'ai', 'artificial intelligence', 'machine learning', 'llm', 'llms',
        'chatgpt', 'gpt', 'openai', 'deep learning', 'neural network',
        'transformer', 'transformer model', 'claude', 'gemini', 'anthropic'
      ];

      const articles = stories
        .filter(story => {
          if (!story || !story.title) return false;
          const title = story.title.toLowerCase();
          const text = story.text?.toLowerCase() || '';
          
          return aiKeywords.some(keyword => 
            title.includes(keyword) || text.includes(keyword)
          );
        })
        .map(story => ({
          title: story.title || 'Untitled',
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          description: story.text || null,
          publishedAt: story.time ? new Date(story.time * 1000).toISOString() : new Date().toISOString(),
          source: { name: 'Hacker News' },
          content: null,
        }));

      console.log(`✅ Found ${articles.length} AI-related stories out of ${stories.length} total HN stories`);

      return {
        articles,
        totalResults: articles.length,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Hacker News API error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  },
});

