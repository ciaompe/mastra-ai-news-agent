import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { newsApiTool } from '../tools/newsapi.tool.js';
import { hackerNewsApiTool } from '../tools/hackernews-api.tool.js';
import { checkArticleTool } from '../tools/check-article.tool.js';
import { saveArticleTool } from '../tools/save-article.tool.js';
import { emailTool } from '../tools/email.tool.js';
import { summarizeAgent } from '../agents/summarize-agent.js';
import { filterAgent } from '../agents/filter-agent.js';
import { generateEmailTemplate } from '../../utils/emailTemplate.js';

// Step 1: Fetch AI news articles from NewsAPI
const fetchNewsStep = createStep({
  id: 'fetch-news',
  description: 'Fetch latest AI news from NewsAPI',
  inputSchema: z.object({}),
  outputSchema: z.object({
    articles: z.array(z.any()),
    totalResults: z.number(),
  }),
  execute: async () => {
    const result = await newsApiTool.execute({
      context: { pageSize: 10 },
    });
    
    return {
      articles: result.articles,
      totalResults: result.totalResults,
    };
  },
});

// Step 1b: Fetch AI news articles from Hacker News
const fetchHnNewsStep = createStep({
  id: 'fetch-hn-news',
  description: 'Fetch latest AI news from Hacker News',
  inputSchema: z.object({}),
  outputSchema: z.object({
    articles: z.array(z.any()),
    totalResults: z.number(),
  }),
  execute: async () => {
    const result = await hackerNewsApiTool.execute({
      context: { limit: 20 },
    });
    
    return {
      articles: result.articles,
      totalResults: result.totalResults,
    };
  },
});

// Step 1c: Merge articles from both sources
const mergeArticlesStep = createStep({
  id: 'merge-articles',
  description: 'Merge articles from NewsAPI and Hacker News',
  inputSchema: z.object({
    newsApiArticles: z.array(z.any()),
    hnArticles: z.array(z.any()),
  }),
  outputSchema: z.object({
    articles: z.array(z.any()),
    totalResults: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { newsApiArticles = [], hnArticles = [] } = inputData;
    const mergedArticles = [...newsApiArticles, ...hnArticles];
    
    console.log(`✅ Merged ${newsApiArticles.length} NewsAPI articles with ${hnArticles.length} HN articles`);
    
    return {
      articles: mergedArticles,
      totalResults: mergedArticles.length,
    };
  },
});

// Step 2: Filter new articles (check for duplicates)
const filterNewArticlesStep = createStep({
  id: 'filter-new-articles',
  description: 'Filter out already processed articles',
  inputSchema: z.object({
    articles: z.array(z.any()),
    totalResults: z.number(),
  }),
  outputSchema: z.object({
    newArticles: z.array(z.any()),
    totalNew: z.number(),
    totalFetched: z.number(),
  }),
  execute: async ({ inputData }) => {
    const articles = inputData.articles || [];
    const newArticles = [];
    const skippedDuplicates: Array<{ title: string; matchedBy: string; existingUrl?: string }> = [];

    for (const article of articles) {
      try {
        // Enhanced duplicate check with title and date
        const result = await checkArticleTool.execute({
          context: { 
            url: article.url,
            title: article.title,
            publishedAt: article.publishedAt,
          },
        });

        if (!result.exists) {
          newArticles.push(article);
        } else {
          // Track why this was skipped
          skippedDuplicates.push({
            title: article.title,
            matchedBy: result.matchedBy || 'unknown',
            existingUrl: result.existingUrl,
          });
          console.log(`⏭️  Skipping duplicate: "${article.title}" (matched by ${result.matchedBy})`);
        }
      } catch (error) {
        console.error(`Error checking article ${article.url}:`, error);
      }
    }

    console.log(`✅ Found ${newArticles.length} new articles, skipped ${skippedDuplicates.length} duplicates`);

    return { 
      newArticles,
      totalNew: newArticles.length,
      totalFetched: articles.length,
    };
  },
});

// Step 3: Verify AI & ML relevance
const verifyRelevanceStep = createStep({
  id: 'verify-relevance',
  description: 'Verify if the article is relevant to AI and ML',
  inputSchema: z.object({
    newArticles: z.array(z.any()),
    totalNew: z.number(),
    totalFetched: z.number(),
  }),
  outputSchema: z.object({
    relevantArticles: z.array(z.any()),
    totalRelevant: z.number(),
  }),
  execute: async ({ inputData }) => {
    const newArticles = inputData.newArticles || [];
    const relevantArticles = [];

    for (const article of newArticles) {
      try {
        const response = await filterAgent.generate(
          `Is the following AI news article relevant to AI and ML?

Title: ${article.title}
Source: ${article.source.name}
Published: ${article.publishedAt}

Description: ${article.description || 'No description available'}

${article.content ? `Content: ${article.content}` : ''}

Please respond with "Yes" or "No".`
        );

        if (response.text.toLowerCase().includes('yes')) {
          relevantArticles.push(article);
        } else {
          console.log(`⏭️  Skipping non-relevant article: "${article.title}"`);
        }
      } catch (error) {
        console.error(`Error verifying relevance for article ${article.title}:`, error);
      }
    }

    console.log(`✅ Found ${relevantArticles.length} relevant articles, skipped ${newArticles.length - relevantArticles.length} non-relevant ones`);

    return {
      relevantArticles,
      totalRelevant: relevantArticles.length,
    };
  },
});

// Step 4: Summarize articles
const summarizeArticlesStep = createStep({
  id: 'summarize-articles',
  description: 'Generate summaries for new articles using AI',
  inputSchema: z.object({
    relevantArticles: z.array(z.any()),
    totalRelevant: z.number(),
    totalFetched: z.number(),
  }),
  outputSchema: z.object({
    summaries: z.array(z.object({
      title: z.string(),
      source: z.string(),
      url: z.string(),
      publishedAt: z.string(),
      summary: z.string(),
    })),
  }),
  execute: async ({ inputData }) => {
    const relevantArticles = inputData.relevantArticles || [];
    const summaries = [];

    for (const article of relevantArticles) {
      try {
        // Create content for summarization
        const content = `
Title: ${article.title}
Source: ${article.source.name}
Published: ${article.publishedAt}

Description: ${article.description || 'No description available'}

${article.content ? `Content: ${article.content}` : ''}
        `.trim();

        // Use summarize agent to create summary
        const response = await summarizeAgent.generate(
          `Summarize this AI news article in 2-3 concise sentences:\n\n${content}`
        );

        summaries.push({
          title: article.title,
          source: article.source.name,
          url: article.url,
          publishedAt: article.publishedAt,
          summary: response.text,
        });

        // Save article to database
        await saveArticleTool.execute({
          context: {
            url: article.url,
            title: article.title,
            publishedAt: article.publishedAt,
          },
        });
      } catch (error) {
        console.error(`Error processing article ${article.title}:`, error);
      }
    }

    return { summaries };
  },
});

// Step 5: Send email
const sendEmailStep = createStep({
  id: 'send-email',
  description: 'Send daily AI news digest email',
  inputSchema: z.object({
    summaries: z.array(z.object({
      title: z.string(),
      source: z.string(),
      url: z.string(),
      publishedAt: z.string(),
      summary: z.string(),
    })),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    articlesCount: z.number().optional(),
    messageId: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const summaries = inputData.summaries || [];

    if (summaries.length === 0) {
      return {
        sent: false,
        message: 'No new articles to send',
        articlesCount: 0,
      };
    }

    // Create HTML email content
    const htmlContent = generateEmailTemplate(summaries);

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });

    try {
      const result = await emailTool.execute({
        context: {
          subject: `🤖 Daily AI News Digest - ${today} (${summaries.length} new articles)`,
          htmlContent,
        },
      });

      return {
        sent: true,
        articlesCount: summaries.length,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },
});

// Create the workflow
export const dailyNewsWorkflow = createWorkflow({
  id: 'daily-ai-news',
  description: 'Daily AI news workflow that fetches from NewsAPI and Hacker News, filters, summarizes, and emails AI news articles',
  inputSchema: z.object({}),
  outputSchema: z.object({
    sent: z.boolean(),
    articlesCount: z.number().optional(),
    messageId: z.string().optional(),
    message: z.string().optional(),
  }),
})
  .parallel([fetchNewsStep, fetchHnNewsStep])
  .map(async ({ getStepResult }) => {
    const newsApiResult = getStepResult(fetchNewsStep);
    const hnResult = getStepResult(fetchHnNewsStep);
    
    return {
      newsApiArticles: newsApiResult.articles,
      hnArticles: hnResult.articles,
    };
  })
  .then(mergeArticlesStep)
  .map(async ({ inputData }) => ({
    articles: inputData.articles,
    totalResults: inputData.totalResults,
  }))
  .then(filterNewArticlesStep)
  .then(verifyRelevanceStep)
  .then(summarizeArticlesStep)
  .then(sendEmailStep)
  .commit();
