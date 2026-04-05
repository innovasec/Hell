// src/router.ts
import { Hono } from 'hono';
import { DatabaseService } from './services/database'; // Assuming this service exists
import { StorageService } from './services/storage'; // Assuming this service exists
import { validateTelegramWebhook, getTelegramSecrets } from './utils/validation'; // Assuming these utils exist
import { TelegramWebhookUpdate, CommandQueueMessage } from './types'; // Assuming these types exist

// Define the environment type for this worker
type Env = {
  DB: D1Database;
  AI: Ai;
  MEMORY_BUCKET: R2Bucket;
  SECRETS: KVNamespace; // For storing tokens/secrets
  COMMAND_QUEUE: Queue<CommandQueueMessage>; // Producer binding for the command queue
  // Variables defined in wrangler.toml
  TELEGRAM_BOT_TOKEN_KEY: string;
  TELEGRAM_WEBHOOK_SECRET_KEY: string;
  SYSTEM_PROMPT_PATH: string;
  TOOLS_PATH: string;
  MAX_SHORT_TERM_ENTRIES: string;
  DAILY_AI_LIMIT: string;
  AI_INFERENCE_COUNTER_KV_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  const env = c.env;

  try {
    // 1. Validate Webhook Secret
    const secretToken = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    const { webhookSecret } = await getTelegramSecrets(env); // Fetch secret from KV
    if (!validateTelegramWebhook(secretToken, webhookSecret)) {
      console Invalid webhook secret token.');
      return c.text('Unauthorized', 401);
    }

    // 2. Parse Telegram Update
    const update: TelegramWebhookUpdate = await c.req.json();
    console.log("Received Telegram update:", JSON.stringify(update, null, 2)); // Log for debugging

    // 3. Extract message details
    const message = update.message;
    if (!message || !message.text) {
      console.warn('Received update without a text message.');
      return c.text('OK'); // Acknowledge to avoid retries
    }

    const chatId = message.chat.id;
    const messageId = message.message_id;
    const text = message.text.trim();

    if (chatId === undefined || messageId === undefined || !text) {
      console.warn('Missing required fields (chat_id, message_id, text) in update.');
      return c.text('OK'); // Acknowledge
    }

    // 4. Parse command and input
    let command = '';
    let userInput = text;
    if (text.startsWith('/')) {
      const parts = text.split(/\s+/, 2); // Split only on first space
      command = parts[0];
      userInput = parts[1] || ''; // Rest of the text, or empty string
    } else {
      command = '/default'; // Or handle plain text differently
    }

    // 5. Generate unique job ID
    const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 6. Initialize job status in D1
    const dbService = new DatabaseService(env.DB);
    await dbService.createJobStatus({
      id: jobId,
      chat_id: chatId,
      message_id: messageId,
      command: command,
      status: 'pending',
      details: `Command: ${command}, Input: ${userInput.substring(0, 100)}...` // Truncate for DB
    });

    // 7. Prepare message for Command Queue
    const commandMessageBody: CommandQueueMessage = {
      jobId,
      chatId,
      messageId,
      command,
      userInput
    };

    // 8. Send message to Command Queue
    try {
      await env.COMMAND_QUEUE.send(commandMessageBody);
      console.log(`Enqueued command message for job ${jobId}, command: ${command}`);
    } catch (queueError) {
      console.error(`Failed to enqueue command for job ${jobId}:`, queueError);
      // Update status to error if queue fails immediately
      await dbService.updateJobStatus(jobId, 'error', 'Failed to enqueue command.');
      return c.text('Internal Server Error', 500);
    }

    // 9. Respond immediately to Telegram (acknowledging receipt)
    return c.text('OK');

  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.text('Internal Server Error', 500);
  }
});

// Export the Hono app as the default handler
export default app;

// Export the queue consumers if they are defined in the same file
// Otherwise, they should be in their own files and deployed separately,
// linked via wrangler.toml consumers -> script + entrypoint
// Example exports if consumers are here (they should likely be in separate files):
//
// import { commandProcessor } from './workers/commandProcessor';
// import { llmTaskProcessor } from './workers/llmTaskProcessor';
// import { memoryManager } from './workers/memoryManager';
//
// export { commandProcessor, llmTaskProcessor, memoryManager };
