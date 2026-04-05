
// Import the Env type defined in types.ts (or wherever it's defined, potentially router.ts needs to share it)
// For this file, we only need the part related to SECRETS and the specific variable names.
// We'll define a minimal interface for the environment needed by these functions.
interface ValidationEnv {
  SECRETS: KVNamespace;
  TELEGRAM_BOT_TOKEN_KEY: string;
  TELEGRAM_WEBHOOK_SECRET_KEY: string;
  AI_INFERENCE_COUNTER_KV_KEY: string;
  DAILY_AI_LIMIT: string;
}


/**
 * Validates the incoming Telegram webhook secret token against the expected secret.
 * @param secretToken The token received in the 'X-Telegram-Bot-Api-Secret-Token' header.
 * @param expectedSecret The secret token you configured in BotFather.
 * @returns True if the tokens match, false otherwise.
 */
export function validateTelegramWebhook(secretToken: string | null, expectedSecret: string): boolean {
  // Ensure both tokens are strings and compare them directly.
  // A null header value means the token wasn't provided, which is always invalid.
  return secretToken === expectedSecret;
}

/**
 * Retrieves the Telegram Bot Token and Webhook Secret from Cloudflare KV.
 * @param env The Cloudflare environment object containing bindings.
 * @returns A promise resolving to an object containing the token and webhook secret.
 * @throws Error if either secret is not found in KV.
 */
export async function getTelegramSecrets(env: ValidationEnv): Promise<{ token: string; webhookSecret: string }> {
  try {
    // Retrieve secrets from the KV namespace using the keys defined in wrangler.toml
    const token = await env.SECRETS.get(env.TELEGRAM_BOT_TOKEN_KEY);
    const webhookSecret = await env.SECRETS.get(env.TELEGRAM_WEBHOOK_SECRET_KEY);

    // Check if the retrieved values are null or undefined
    if (!token) {
      throw new Error(`Telegram Bot Token not found in KV using key: ${env.TELEGRAM_BOT_TOKEN_KEY}`);
    }
    if (!webhookSecret) {
      throw new Error(`Telegram Webhook Secret not found in KV using key: ${env.TELEGRAM_WEBHOOK_SECRET_KEY}`);
    }

    console.log("Successfully retrieved Telegram secrets from KV."); // Log for debugging
    return { token, webhookSecret };
  } catch (error) {
    console.error("Error retrieving Telegram secrets from KV:", error);
    throw error; // Re-throw to be caught by the caller
  }
}

/**
 * Checks the current daily AI inference count against the limit and increments it.
 * This function helps enforce the free tier's daily limit.
 * @param env The Cloudflare environment object containing bindings, specifically SECRETS and vars.
 * @returns A promise resolving to true if usage was incremented successfully and is within limits,
 *          or false if the daily limit has been reached.
 */
export async function checkAndIncrementAIUsage(env: ValidationEnv): Promise<boolean> {
  const key = env.AI_INFERENCE_COUNTER_KV_KEY;
  const limit = parseInt(env.DAILY_AI_LIMIT, 10); // Ensure it's a number

  try {
    // Attempt to get the current count from KV
    const currentValue = await env.SECRETS.get(key);
    let count = 0;

    if (currentValue) {
      count = parseInt(currentValue, 10);
      if (isNaN(count)) {
        console.warn(`Invalid AI count value in KV (${key}): ${currentValue}. Resetting to 0.`);
        count = 0;
      }
    }

    // Check if the limit would be exceeded
    if (count >= limit) {
      console.warn(`Daily AI inference limit (${limit}) reached or exceeded (current count: ${count}).`);
      return false; // Indicate failure to increment due to limit
    }

    // Increment the count
    const newCount = count + 1;

    // Put the new count back into KV with a TTL to reset it daily.
    // TTL is in seconds. 24 hours = 86400 seconds.
    // Note: This is a simple reset based on TTL. Clock differences or missed resets could cause slight inaccuracies.
    // For stricter accounting, a cron job might be better, but that adds complexity for the free tier.
    await env.SECRETS.put(key, newCount.toString(), { expirationTtl: 86400 });

    console.log(`AI inference count incremented: ${count} -> ${newCount} (Limit: ${limit})`); // Log for monitoring
    return true; // Indicate success
  } catch (error) {
    console.error("Error checking/setting AI usage in KV:", error);
    // In case of an error interacting with KV, it's safer to assume failure
    // and prevent the AI call to avoid going over the limit unintentionally.
    // However, this could lead to under-counting if KV is flaky.
    // Depending on risk tolerance, you might decide to proceed anyway or fail hard.
    // For robustness against KV failures, consider more complex retry/error handling.
    return false; // Treat as failure to increment
  }
}
