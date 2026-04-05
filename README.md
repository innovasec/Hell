# Educational Serverless AI Agent (Telegram Bot)

This project is a personal, non-commercial learning sandbox to understand serverless architecture, event-driven AI agents, and structured memory using Cloudflare Workers.

> **Warning:** Access to certain external resources (like the Telegram Bot API domain `api.telegram.org` if accessed directly via browser from Nepal) might be restricted by the Nepal Telecommunication Authority based on local laws. This project operates *through* the Telegram platform's webhook mechanism, which may function differently. Ensure your usage complies with all applicable local and international laws and Cloudflare's Terms of Service.

## Architecture Overview

- **Frontend:** Telegram Bot (controlled by you via messages/commands)
- **Backend:** Cloudflare Workers (Router, Queue Consumers)
- **Storage:** Cloudflare D1 (structured state/indexing), R2 (file-based memory/configs)
- **AI:** Cloudflare Workers AI (Llama 3.1 8B Instruct, embedding models)
- **Orchestration:** Cloudflare Queues (async processing to handle 30s timeouts)

## Prerequisites (iOS Setup)

- A **Cloudflare Account** with access to Workers, D1, R2, Queues, and AI.
- A **GitHub Account**.
- The **GitHub Mobile App** installed on your iOS device.
- A **Telegram Account** and access to **BotFather** to create a bot.

## Step-by-Step Setup (iOS Only)

### 1. Create Telegram Bot

- Open Telegram.
- Search for `@BotFather`.
- Send `/newbot`.
- Follow the prompts to name your bot and get the **Bot Token**. Save this token securely.

### 2. Create GitHub Repository

- Open the **GitHub App**.
- Tap `+` -> `New repository`.
- Name it `educational-hermes-agent`.
- **Tick "Initialize with a README"**.
- Tap `Create repository`.

### 3. Create Cloudflare Resources

- Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
- Navigate to **Workers & Pages** -> Create Application -> **Create a Worker** (name it `educational-hermes-agent-router`). You don't need to upload code yet.
- Navigate to **D1** -> Create Database (name it `hermes-agent-db`).
- Navigate to **R2** -> Create Bucket (name it `hermes-agent-memory`).
- Navigate to **Workers & Pages** -> Your Worker -> Settings -> Triggers -> Queues -> Create Queues:
    - `cmd-processor-queue`
    - `llm-task-queue`
    - `memory-update-queue`
- Note down the **Database ID** (from D1) and **Bucket Name** (from R2). Ignore the Queue Consumer setup for now; it's handled by `wrangler.toml`.

### 4. Configure GitHub Repository (via GitHub App)

- In your `educational-hermes-agent` repository on the GitHub app, tap the `+` button.
- Create a new file named `wrangler.toml`.
- Paste the following content, **replacing `your-d1-database-id-placeholder` and `your-r2-bucket-name-placeholder`** with the actual IDs/names you noted earlier:

```toml
name = "educational-hermes-agent-router" # Matches your Cloudflare Worker name
main = "src/router.ts"

compatibility_date = "2024-04-05"
workers_dev = true

[[d1_databases]]
binding = "DB"
database_name = "hermes-agent-db"
database_id = "your-d1-database-id-placeholder" # <<<<< REPLACE THIS

[[r2_buckets]]
binding = "MEMORY_BUCKET"
bucket_name = "your-r2-bucket-name-placeholder" # <<<<< REPLACE THIS

[[queues.producers]]
binding = "COMMAND_QUEUE"
queue = "cmd-processor-queue"

[[queues.producers]]
binding = "LLM_TASK_QUEUE"
queue = "llm-task-queue"

[[queues.producers]]
binding = "MEMORY_UPDATE_QUEUE"
queue = "memory-update-queue"

[[queues.consumers]]
queue = "cmd-processor-queue"
max_batch_size = 1
max_retries = 3
dead_letter_queue = "dlq-cmd-processor"
message_retry_delay = 30

[[queues.consumers]]
queue = "llm-task-queue"
max_batch_size = 1
max_retries = 2
dead_letter_queue = "dlq-llm-task"
message_retry_delay = 60

[[queues.consumers]]
queue = "memory-update-queue"
max_batch_size = 1
max_retries = 3
dead_letter_queue = "dlq-memory-update"
message_retry_delay = 30

[[kv_namespaces]] # Optional for secrets
binding = "SECRETS"
id = "your-kv-namespace-id-placeholder" # Get this via wrangler CLI later if used

[vars]
# These will be fetched from KV or secrets
TELEGRAM_BOT_TOKEN_KEY = "TELEGRAM_BOT_TOKEN"
TELEGRAM_WEBHOOK_SECRET_KEY = "TELEGRAM_WEBHOOK_SECRET"
SYSTEM_PROMPT_PATH = "config/system_prompt_v1.txt"
MAX_SHORT_TERM_ENTRIES = 50
DAILY_AI_LIMIT = 10000
AI_INFERENCE_COUNTER_KV_KEY = "ai_inference_count_today"