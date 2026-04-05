// src/services/storage.ts

// Import the R2Bucket type and our AgentConfig type
import { R2Bucket } from '@cloudflare/workers-types';
import { AgentConfig } from '../types'; // Adjust path as needed

// Define the StorageService class
export class StorageService {
  private bucket: R2Bucket;

  // Constructor takes the R2 bucket binding from the environment
  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  // Generic method to read an object's content as a string from R2
  async readObject(key: string): Promise<string | null> {
    try {
      console.log(`Attempting to read object from R2: ${key}`);
      const object = await this.bucket.get(key);

      if (object === null) {
        console.log(`Object ${key} not found in R2.`);
        return null; // Indicate that the object doesn't exist
      }

      const content = await object.text(); // Read the object body as text
      console.log(`Successfully read object ${key} from R2.`);
      return content;
    } catch (error) {
      console.error(`StorageService: Error reading object ${key} from R2:`, error);
      throw error; // Re-throw to handle upstream
    }
  }

  // Generic method to write a string value to an R2 object
  async writeObject(key: string, value: string): Promise<void> {
    try {
      console.log(`Attempting to write object to R2: ${key}`);
      await this.bucket.put(key, value, {
        httpMetadata: {
          contentType: 'application/json' // Default assumption, change if storing other types
        },
        // Optional: Add custom metadata if needed
        // customMetadata: { createdBy: 'hermes-agent' }
      });
      console.log(`Successfully wrote object ${key} to R2.`);
    } catch (error) {
      console.error(`StorageService: Error writing object ${key} to R2:`, error);
      throw error; // Re-throw to handle upstream
    }
  }

  // Specific method to load the agent's configuration (system prompt, tools) from R2
  async loadConfig(paths: { systemPrompt: string; tools: string }): Promise<AgentConfig> {
    console.log("Loading agent configuration from R2...");
    try {
      // Read the system prompt and tools JSON files concurrently for efficiency
      const [systemPromptContent, toolsJsonContent] = await Promise.all([
        this.readObject(paths.systemPrompt),
        this.readObject(paths.tools)
      ]);

      // Provide defaults if files are not found or are empty
      const systemPrompt = systemPromptContent || "
