import 'dotenv/config';
import { startScheduler, runWorkflowNow } from './scheduler.js';

console.log('🤖 AI News Agent Starting...\n');

// Check required environment variables
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'NEWS_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'EMAIL_TO',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Error: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease create a .env file with all required variables.');
  console.error('See .env.example for reference.\n');
  process.exit(1);
}

console.log('✅ Environment variables configured');
console.log('✅ Mastra instance initialized\n');

// Start the scheduler
const schedulerTask = startScheduler();

console.log('\n📅 Scheduler is running. Press Ctrl+C to stop.\n');

// Check if we should run immediately (for testing)
const args = process.argv.slice(2);
if (args.includes('--now') || args.includes('-n')) {
  console.log('🚀 Running workflow immediately (--now flag detected)...\n');
  runWorkflowNow().catch((error) => {
    console.error('Error running workflow:', error);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  schedulerTask.stop();
  console.log('✅ Scheduler stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  schedulerTask.stop();
  console.log('✅ Scheduler stopped');
  process.exit(0);
});

