import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { newsApiTool } from '../tools/newsapi.tool.js';
import { checkArticleTool } from '../tools/check-article.tool.js';
import { saveArticleTool } from '../tools/save-article.tool.js';
import { emailTool } from '../tools/email.tool.js';
import { summarizeAgent } from '../agents/summarize-agent.js';
import { filterAgent } from '../agents/filter-agent.js';

// Step 1: Fetch AI news articles
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
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .article {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .article:last-child {
      border-bottom: none;
    }
    .article-title {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    .article-meta {
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 12px;
    }
    .article-summary {
      color: #555;
      margin-bottom: 12px;
      line-height: 1.7;
    }
    .read-more {
      display: inline-block;
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    .read-more:hover {
      color: #2980b9;
      text-decoration: underline;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 Daily AI News Digest</h1>
    <p style="color: #7f8c8d; margin-bottom: 30px;">
      ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </p>
    <p style="margin-bottom: 30px;">
      Your daily selection of ${summaries.length} new AI and machine learning articles.
    </p>
    
    ${summaries.map((summary, index) => `
      <div class="article">
        <div class="article-title">${index + 1}. ${summary.title}</div>
        <div class="article-meta">
          ${summary.source} • ${new Date(summary.publishedAt).toLocaleDateString('en-US')}
        </div>
        <div class="article-summary">${summary.summary}</div>
        <a href="${summary.url}" class="read-more">Read full article →</a>
      </div>
    `).join('')}
    
    <div class="footer">
      <p>This is your automated AI news digest powered by Mastra.ai</p>
      <p>Stay informed about the latest developments in artificial intelligence.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

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
  description: 'Daily AI news workflow that fetches, filters, summarizes, and emails AI news articles',
  inputSchema: z.object({}),
  outputSchema: z.object({
    sent: z.boolean(),
    articlesCount: z.number().optional(),
    messageId: z.string().optional(),
    message: z.string().optional(),
  }),
})
  .then(fetchNewsStep)
  .then(filterNewArticlesStep)
  .then(verifyRelevanceStep)
  .then(summarizeArticlesStep)
  .then(sendEmailStep)
  .commit();
