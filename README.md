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

