import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';

export const summarizeAgent = new Agent({
  name: 'summarize-agent',
  instructions: `You are an AI news summarizer. Create concise, informative 2-3 sentence summaries of news articles. 
  
Focus on:
|- Key developments and breakthroughs
|- Important implications for the AI industry
|- Actionable insights for readers
|- Technical details that matter

Keep summaries clear, engaging, and suitable for a daily newsletter format.`,
  model: openai('gpt-4o-mini', {
    structuredOutputs: true,
  }),
});

