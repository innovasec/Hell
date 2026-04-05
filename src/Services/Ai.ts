// src/services/ai.ts

// Import the Ai type and our LLMResult, AgentConfig types
import { Ai } from '@cloudflare/ai';
import { LLMResult, AgentConfig } from '../types'; // Adjust path as needed
import { checkAndIncrementAIUsage } from '../utils/validation'; // Import the rate limiter

// Define the AIService class
export class AIService {
  private ai: Ai;
  // The environment object needs to be passed in to access SECRETS for rate limiting
  private envForValidation: any; // Use 'any' or a more specific type if possible, containing SECRETS and vars

  // Constructor takes the AI binding and the environment object from the worker
  constructor(ai: Ai, env: any) {
    this.ai = ai;
    this.envForValidation = env; // Store the environment for use in rate limiting
  }

  /**
   * Calls the Llama 3.1 8B Instruct model with Hermes-style prompting.
   * Includes a check for daily AI usage limits before making the call.
   * @param config The agent configuration (system prompt, tools, limits).
   * @param userPrompt The user's input prompt.
   * @returns A promise resolving to the LLMResult.
   * @throws Error if the daily limit is reached or if the AI call fails.
   */
  async runHermesStyleInstruct(config: AgentConfig, userPrompt: string): Promise<LLMResult> {
    console.log("AIService: Preparing to call LLM with Hermes-style prompt.");

    // 1. Check daily AI usage limit using the validation utility
    const usageOk = await checkAndIncrementAIUsage(this.envForValidation);
    if (!usageOk) {
      const errorMsg = "Daily AI inference limit reached. Please try again tomorrow.";
      console.error(`AIService: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    try {
      // 2. Construct the full prompt for Llama 3.1 Instruct format
      // This is the core of "Hermes-style" prompting - providing clear roles and separators.
      const fullPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${config.systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>

${userPrompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;

      console.log("AIService: Calling Workers AI with constructed prompt..."); // Log for debugging

      // 3. Call the Cloudflare Workers AI model
      // Adjust parameters like max_tokens, temperature as needed for your use case.
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt: fullPrompt,
        max_tokens: 1024, // Adjust based on expected output length
        temperature: 0.7, // Adjust for creativity vs. focus
        // top_p: 0.9, // Another parameter for controlling randomness
        // stop: ["<|eot_id|>"], // Potentially useful for cleaner termination
      });

      console.log("AIService: Raw LLM Response received:", response); // Log the raw response for debugging

      // 4. *** CRITICAL: Parse the raw response ***
      // The `response` object shape depends on the model API.
      // For Llama 3.1 Instruct, it often looks like { response: "actual text output..." }
      // You MUST implement logic here to parse the `response` object according to the model's output format
      // and potentially according to Hermes-3 specific output conventions (e.g., detecting structured tool calls).
      // This is a significant part of the "Hermes-3 style" implementation on the *parsing* side.

      // Placeholder parsing - ASSUMES response has a 'response' field containing the text.
      // YOU NEED TO VERIFY THE EXACT SHAPE OF `response` AND IMPLEMENT PROPER PARSING HERE.
      // Example:
      // if (typeof response === 'object' && 'response' in response) {
      //    const rawOutput = response.response as string;
      //    return this.parseHermesOutput(rawOutput, config.tools); // Pass tools if needed for parsing
      // } else {
      //    throw new Error("Unexpected LLM response format");
      // }

      // For now, using a direct assumption. This needs verification!
      const rawOutput = (response as any).response || response; // Fallback if structure differs

      if (typeof rawOutput !== 'string') {
          console.error("AIService: Unexpected LLM response format. Expected string in .response field.", response);
          throw new Error("LLM returned unexpected response format.");
      }

      // Placeholder: Assume the raw output is the final output for now.
      // TODO: Implement robust parsing logic based on how you prompt the model
      // and expect it to structure its response (e.g., for tool calls, reasoning steps).
      console.warn("AIService: LLM output parsing is currently a simple passthrough. Implement Hermes-3 parsing logic.");
      const parsedResult: LLMResult = {
          final_output: rawOutput,
          // ... Potentially parse tool_calls, intermediate_steps, confidence, reasoning_trace from rawOutput string
          // This is where the complexity of 'Hermes-3 style' parsing comes in.
      };

      console.log("AIService: Successfully processed LLM call and parsed result.");
      return parsedResult;

    } catch (error) {
      console.error('AIService: Error calling or processing LLM:', error);
      // Re-throw the error so the calling function (e.g., in llmTaskProcessor) can handle it
      throw error;
    }
  }

  // *** PLACEHOLDER: Implement actual Hermes-3 style parsing logic here ***
  // This method would take the raw string output from the LLM and parse it
  // according to Hermes-3 conventions, potentially extracting tool calls,
  // reasoning traces, confidence indicators, etc.
  // private parseHermesOutput(rawOutput: string, availableTools: any): LLMResult {
  //     // Example: Look for JSON-like structures indicating tool calls
  //     // Example: Look for specific delimiters or formats for reasoning steps
  //     // This is highly dependent on your prompting strategy.
  //     // Return the structured LLMResult object.
  //     return {
  //         final_output: rawOutput, // Or extract final output from parsed structure
  //         tool_calls: [], // Parsed tool calls
  //         intermediate_steps: [], // Parsed steps
  //         confidence: 0.5, // Calculated or parsed confidence
  //         reasoning_trace: "" // Parsed reasoning
  //     };
  // }


  /**
   * Calls the embedding model to generate an embedding vector for a given text.
   * This could be used for semantic search or indexing memory.
   * @param text The text to generate an embedding for.
   * @returns A promise resolving to an array of numbers representing the embedding.
   */
  async generateEmbedding(text: string): Promise<number[]> {
      console.log("AIService: Generating embedding for text...");

      try {
          // Call the BGE Large English v1.5 embedding model
          const embeddingResponse = await this.ai.run('@cf/baai/bge-large-en-v1.5', {
              text: text,
          });

          console.log("AIService: Raw embedding response:", embeddingResponse); // Log for debugging

          // The shape of the embedding response varies by model.
          // For BGE models, it's typically {  [embedding_numbers...] }
          // Verify the structure of embeddingResponse!
          if (embeddingResponse && Array.isArray((embeddingResponse as any).data)) {
              const embedding = (embeddingResponse as any).data as number[];
              console.log(`AIService: Successfully generated embedding (length: ${embedding.length}).`);
              return embedding;
          } else {
              console.error("AIService: Unexpected embedding response format:", embeddingResponse);
              throw new Error("Embedding model returned unexpected response format.");
          }

      } catch (error) {
          console.error('AIService: Error generating embedding:', error);
          throw error; // Re-throw to handle upstream
      }
  }
}
