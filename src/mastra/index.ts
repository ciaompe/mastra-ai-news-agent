
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { summarizeAgent } from './agents/summarize-agent.js';
import { newsAgent } from './agents/news-agent.js';
import { filterAgent } from './agents/filter-agent.js';
import { dailyNewsWorkflow } from './workflows/daily-news.workflow.js';

export const mastra = new Mastra({
  workflows: {
    dailyNewsWorkflow,
  },
  agents: {
    
    newsAgent,
    summarizeAgent,
    filterAgent
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, into persistent file storage
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
