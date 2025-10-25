import cron from 'node-cron';
import { mastra } from './mastra/index.js';

export function startScheduler() {
  console.log('Starting AI News scheduler...');
  console.log('Schedule: Daily at 8:00 AM');

  // Schedule: Run every day at 8:00 AM
  // Cron format: minute hour day month weekday
  const task = cron.schedule('0 8 * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] Starting daily AI news workflow...`);

    try {
      const workflow = mastra.getWorkflow('dailyNewsWorkflow');
      
      if (!workflow) {
        throw new Error('dailyNewsWorkflow not found');
      }

      const result = await workflow.execute({});
      
      console.log(`[${new Date().toISOString()}] Workflow completed successfully`);
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Workflow error:`, error);
    }
  });

  console.log('Scheduler started successfully');
  console.log('Next execution: Daily at 8:00 AM');

  return task;
}

// For manual testing: run the workflow immediately
export async function runWorkflowNow() {
  console.log('Running workflow manually...');
  
    try {
      const workflow = mastra.getWorkflow('dailyNewsWorkflow');
      
      if (!workflow) {
        throw new Error('dailyNewsWorkflow not found');
      }

    const result = await workflow.execute({});
    console.log('Workflow completed successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Workflow error:', error);
    throw error;
  }
}

