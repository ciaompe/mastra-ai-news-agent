# 🤖 AI News Agent

An automated AI news aggregator that fetches the latest AI and machine learning news, generates summaries using OpenAI, and sends daily email digests via Resend.

## Features

- ✨ **Automated News Fetching**: Pulls top 20 AI articles from NewsAPI.org daily
- 🧠 **AI-Powered Summaries**: Uses OpenAI GPT-4o-mini to generate concise article summaries
- 📧 **Email Delivery**: Sends beautifully formatted HTML emails via Resend
- 🗄️ **Smart Duplicate Prevention**: Detects duplicates by URL or by matching title + publication date to avoid repeating content
- ⏰ **Scheduled Execution**: Runs automatically every morning at 8:00 AM
- 🔧 **Clean Architecture**: Separate agents for summarization and orchestration
- ☁️ **Cloud Database**: Uses Supabase PostgreSQL for reliable data storage

## Architecture

### Agents
- **Filter Agent**: Filters out articles that are not related to AI and Machine Learning
- **Summarize Agent**: Dedicated LLM agent for creating concise article summaries
- **News Agent**: Orchestrates news fetching, duplicate checking, and email sending

### Tools
- **NewsAPI Tool**: Fetches AI news articles from NewsAPI.org
- **Check Article Tool**: Checks if an article has already been processed by URL or by matching title + publication date
- **Save Article Tool**: Saves a processed article to the database
- **Email Tool**: Sends emails via Resend

### Workflow
1. Fetch latest AI news articles (top 20)
2. Filter out already processed articles
3. Generate summaries for new articles
4. Save processed articles to Supabase database
5. Send email digest with all new summaries

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details and create
4. Go to **Settings → API** and copy:
   - Project URL
   - Anon Public Key

### 3. Create Resend Account

1. Go to https://resend.com
2. Sign up for a free account
3. Get your API key from the dashboard
4. Verify your sender email

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# NewsAPI Configuration
NEWS_API_KEY=your_newsapi_key_here

# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Resend Configuration
RESEND_API_KEY=your_resend_api_key_here

# Email Configuration
EMAIL_FROM=your_email_from_here
EMAIL_TO=recipient1@example.com,recipient2@example.com

```

### 5. Setup Supabase Database

Run this SQL in your Supabase **SQL Editor**:

```sql
CREATE TABLE IF NOT EXISTS processed_articles (
  id BIGSERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  published_at TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_normalized_title_date 
ON processed_articles(normalized_title, published_at);
```

### 6. Get Required API Keys

#### OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env` file

#### NewsAPI Key
1. Visit https://newsapi.org/register
2. Sign up for a free account
3. Copy your API key
4. Add it to your `.env` file

#### Resend API Key
1. Visit https://resend.com/api-keys
2. Create a new API key
3. Add it to your `.env` file
4. Verify your sender email in dashboard settings

## Usage

### Start the Scheduler

Run the scheduler to execute the workflow daily at 8:00 AM:

```bash
npm run scheduler
```

The scheduler will:
- Start immediately and wait for the scheduled time
- Run the workflow every day at 8:00 AM
- Continue running until stopped (Ctrl+C)

### Test Immediately

To test the workflow without waiting for the scheduled time:

```bash
npm run scheduler:now
```

This will:
- Start the scheduler
- Run the workflow immediately
- Continue with the regular schedule

### Development Mode

To run the Mastra development server:

```bash
npm run dev
```

## Project Structure

```
ai-news-agent/
├── src/
│   ├── mastra/
│   │   ├── agents/
│   │   │   ├── summarize-agent.ts    # AI summarization agent
│   │   │   ├── news-agent.ts         # News orchestration agent
│   │   │   └── filter-agent.ts       # Article filtering agent
│   │   ├── tools/
│   │   │   ├── newsapi.tool.ts       # NewsAPI integration
│   │   │   ├── check-article.tool.ts # Database article check
│   │   │   ├── save-article.tool.ts  # Database article save
│   │   │   └── email.tool.ts         # Email sending via Resend
│   │   ├── workflows/
│   │   │   └── daily-news.workflow.ts# Main workflow
│   │   └── index.ts                  # Mastra configuration
│   ├── lib/
│   │   └── articles.db.ts            # Supabase database client
│   ├── index.ts                      # Main entry point
│   └── scheduler.ts                  # Cron scheduler
├── .env                              # Environment variables (create this)
├── package.json
└── README.md
```

## How It Works

### Daily Workflow

1. **Fetch News**: Retrieves top 20 AI articles from NewsAPI using keywords like "artificial intelligence", "machine learning", "AI", and "deep learning"
2. **Filter Articles**: Filters out articles that have already been processed by URL or by matching title + publication date
3. **Verify Relevance**: Verifies if the article is relevant to AI and Machine Learning
4. **Summarize Articles**: For each new article:
   - Sends article content to the Summarize Agent
   - Generates a 2-3 sentence summary
5. **Send Email**: Compiles all summaries into a beautiful HTML email and sends it via Resend

### Database

The system uses **Supabase PostgreSQL** to store processed articles with smart duplicate detection:

```sql
CREATE TABLE processed_articles (
  id BIGSERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  published_at TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_normalized_title_date 
ON processed_articles(normalized_title, published_at)
```

**Duplicate Detection Strategy:**
- **By URL**: Exact URL match (prevents reprocessing the same link)
- **By Title + Date**: Normalized title match on the same publication date (catches republished stories with different URLs)

This prevents duplicate news stories like when the same article appears with different URLs (e.g., different article IDs from the same news source).

## Customization

### Change Schedule Time

Edit `src/scheduler.ts` and modify the cron expression:

```typescript
// Current: Daily at 8:00 AM
const task = cron.schedule('0 8 * * *', async () => {
  // ...
});

// Examples:
// '0 7 * * *'     - 7:00 AM daily
// '0 12 * * *'    - 12:00 PM daily
// '0 9 * * 1-5'   - 9:00 AM Monday-Friday
```

### Change Number of Articles

Edit `src/mastra/workflows/daily-news.workflow.ts`:

```typescript
const result = await newsApiTool.execute({
  context: { pageSize: 20 }, // Change this number
});
```

### Customize Email Template

Edit the HTML template in `src/mastra/workflows/daily-news.workflow.ts` in the `sendEmailStep`.

### Change AI Model

Edit the agents to use a different OpenAI model:

```typescript
// In src/mastra/agents/summarize-agent.ts or news-agent.ts
model: openai('gpt-4o', {  // Change from gpt-4o-mini to gpt-4o
  structuredOutputs: true,
}),
```

## Troubleshooting

### Environment Variable Errors

If you see "Missing required environment variables", ensure your `.env` file exists and contains all required variables: `OPENAI_API_KEY`, `NEWS_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `RESEND_API_KEY`.

### Email Not Sending

1. Verify your Resend API key is valid
2. Check that your sender email is verified in Resend dashboard
3. Ensure `EMAIL_FROM` and `EMAIL_TO` environment variables are set correctly
4. Check Resend dashboard for any delivery logs

### Database Connection Errors

1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
2. Ensure the `processed_articles` table exists in your Supabase project
3. Check that Row-Level Security (RLS) policies allow your queries (or disable RLS)
4. Verify your internet connection to Supabase

### No New Articles

If you run the workflow multiple times quickly, you may see "No new articles to send" because articles are stored as processed. This is normal behavior to prevent duplicate emails.

To reset the database:
```sql
-- Run this in Supabase SQL Editor
DELETE FROM processed_articles;
```

### NewsAPI Errors

- Free NewsAPI accounts have rate limits
- Check that your API key is valid
- Ensure you're not exceeding the daily request limit

## License

ISC

## Support

For issues and questions, please open an issue in the repository.

