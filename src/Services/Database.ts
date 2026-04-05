// src/services/database.ts

// Import the D1Database type and our JobStatusRecord type
import { D1Database } from '@cloudflare/workers-types';
import { JobStatusRecord } from '../types'; // Adjust path as needed

// Define the DatabaseService class
export class DatabaseService {
  private db: D1Database;

  // Constructor takes the D1 database binding from the environment
  constructor(db: D1Database) {
    this.db = db;
  }

  // Method to create a new job status record in D1
  async createJobStatus(record: Omit<JobStatusRecord, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString(); // Get the current timestamp in ISO format
    try {
      await this.db.prepare(
        `INSERT INTO job_status (id, chat_id, message_id, command, status, created_at, updated_at, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )..id,
        record.chat_id,
        record.message_id,
        record.command,
        record.status,
        now, // Use the generated timestamp
        now, // Use the generated timestamp
        record.details || null // Use details if provided, otherwise null
      ).run();
      console.log(`Successfully inserted job status record for ID: ${record.id}`);
    } catch (error) {
      console.error(`DatabaseService: Error inserting job status for ID ${record.id}:`, error);
      throw error; // Re-throw to handle upstream
    }
  }

  // Method to update an existing job status record in D1
  async updateJobStatus(jobId: string, status: JobStatusRecord['status'], details?: string): Promise<void> {
    const now = new Date().toISOString(); // Get the current timestamp in ISO format
    try {
      await this.db.prepare(
        `UPDATE job_status SET status = ?, updated_at = ?, details = ? WHERE id = ?`
      ).bind(status, now, details || null, jobId).run();
      console.log(`Successfully updated job status for ID: ${jobId} to ${status}`);
    } catch (error) {
      console.error(`DatabaseService: Error updating job status for ID ${jobId}:`, error);
      throw error; // Re-throw to handle upstream
    }
  }

  // Method to retrieve a job status record from D1 by its ID
  async getJobStatus(jobId: string): Promise<JobStatusRecord | null> {
    try {
      const result = await this.db.prepare(`SELECT * FROM job_status WHERE id = ?`).bind(jobId).first<JobStatusRecord>();
      console.log(`Retrieved job status for ID: ${jobId}`, result);
      return result || null; // Return the record or null if not found
    } catch (error) {
      console.error(`DatabaseService: Error fetching job status for ID ${jobId}:`, error);
      throw error; // Re-throw to handle upstream
    }
  }

  // Add more methods here as needed (e.g., list jobs by chat_id, get stats, delete old records)
  // Example: async listJobsByChatId(chatId: number): Promise<JobStatusRecord[]> { ... }
  // Example: async getStats(): Promise<{ pending: number; completed: number; errors: number; }> { ... }
}
