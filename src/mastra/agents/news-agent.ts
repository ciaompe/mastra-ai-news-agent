import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';
import { newsApiTool } from '../tools/newsapi.tool.js';
import { checkArticleTool } from '../tools/check-article.tool.js';
import { saveArticleTool } from '../tools/save-article.tool.js';
import { emailTool } from '../tools/email.tool.js';
import { hackerNewsApiTool } from '../tools/hackernews-api.tool.js';

export const newsAgent = new Agent({
  name: 'news-agent',
  instructions: `You are a news orchestrator. Your job is to:
  
1. Fetch AI news articles using the fetch-ai-news tool and the fetch-hn-news tool
2. Merge the articles from both tools
3. Check which articles are new (not yet processed) using the check-article-exists tool
4. Help coordinate the summarization of new articles
5. Save processed articles using the save-article tool
6. Send email digests using the send-email tool

Always check if articles exist before processing them to avoid duplicates.
Be efficient and organized in your coordination.`,
  model: openai('gpt-4o-mini', {
    structuredOutputs: true,
  }),
  tools: {
    'fetch-ai-news': newsApiTool,
    'fetch-hn-news': hackerNewsApiTool,
    'check-article-exists': checkArticleTool,
    'save-article': saveArticleTool,
    'send-email': emailTool,
  },
});
