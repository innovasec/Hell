// src/types.ts

// Represents a message received from Telegram
export interface TelegramMessage {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
           type: string; // e.g., "private", "group"
    };
    date: number;
    text?: string;
  };
  // Add other fields as needed (e.g., callback_query, inline_query)
}

// Represents the full webhook update from Telegram (can include message, callback_query, etc.)
export interface TelegramWebhookUpdate extends TelegramMessage {
  callback_query?: any; // Simplified for this example, define properly if needed
}

// Represents a record of a job's status in D1
export interface JobStatusRecord {
  id: string; // Unique job ID (e.g., timestamp_random_suffix)
  chat_id: number; // Telegram chat ID
  message_id: number; // Original Telegram message ID that triggered the job
  command: string; // The command received (e.g., '/analyze', '/status')
  status: 'pending' | 'processing' | 'llm_done' | 'memory_done' | 'completed' | 'needs_approval' | 'error'; // Current state
  created_at: string; // ISO timestamp when the job was created
  updated_at: string; // ISO timestamp when the status was last updated
  details?: string; // Optional JSON string for complex details (e.g., LLM result, error message)
  result_message_id?: number; // Optional: Message ID of the bot's reply sent back to Telegram
}

// Message structure for the Command Queue
export interface CommandQueueMessage {
  jobId: string;
  chatId: number;
  messageId: number;
  command: string; // The command received
  userInput: string; // The rest of the user's input after the command
}

// Message structure for the LLM Task Queue
export interface LLMTaskQueueMessage {
  jobId: string;
  chatId: number;
  inputText: string;
  commandType: string; // Specific type derived from command (e.g., 'analyze_transcript')
  systemPrompt: string; // Loaded by CommandProcessor and passed along
  tools?: any; // Optional tools loaded from R2 (structure depends on your tool definition)
}

// Message structure for the Memory Update Queue
export interface MemoryUpdateQueueMessage {
  jobId: string;
  chatId: number;
  llmResult: any; // The structured result from the LLM task (LLMResult type defined below)
  action: 'update_short_term' | 'compress_long_term' | 'index_for_recall' | 'check_for_improvement'; // What action to take
   any; // Specific data related to the action
}

// Structure for the result returned by the LLM, reflecting potential Hermes-3 style outputs
export interface LLMResult {
  final_output: string; // The final text output from the LLM
  tool_calls?: Array<{ name: string; arguments: any }>; // List of tools the LLM wants to call
  intermediate_steps?: Array<{ tool_name: string; input: any; output: any }>; // Steps taken during reasoning
  confidence?: number; // Example metric for output confidence
  reasoning_trace?: string; // Optional trace of the reasoning process
}

// Structure for the agent's configuration loaded from R2
export interface AgentConfig {
  systemPrompt: string; // The main system prompt for the LLM
  tools: any; // Tools available to the agent (flexible structure)
  maxShortTermEntries: number; // Max entries to keep in short-term memory per chat
  dailyAILimit: number; // Daily AI inference limit (for rate limiting)
}
