import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { EmbeddingService } from '../runtime/embedding.service';

export interface VectorDocument {
  id: string;
  text: string;
  metadata: any;
  score?: number;
}

/**
 * Faz 2.1: Local Vector Store using SQLite and JS Cosine Similarity
 */
export class VectorStoreService {
  private static db: Database.Database | null = null;
  private static readonly DB_PATH = path.join(process.cwd(), 'data', 'vector_store.db');

  private static init() {
    if (this.db) return;

    const dir = path.dirname(this.DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.DB_PATH);
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        metadata TEXT,
        embedding BLOB NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Adds or updates a document in the vector store.
   */
  static async upsertDocument(id: string, text: string, metadata: any = {}) {
    this.init();
    const vector = await EmbeddingService.getEmbedding(text);
    const vectorBuffer = Buffer.from(new Float32Array(vector).buffer);

    const stmt = this.db!.prepare(`
      INSERT OR REPLACE INTO documents (id, text, metadata, embedding)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, text, JSON.stringify(metadata), vectorBuffer);
    console.log(`[VectorStore] Upserted document: ${id}`);
  }

  /**
   * Searches for similar documents based on text query.
   */
  static async searchSimilar(queryText: string, limit: number = 5): Promise<VectorDocument[]> {
    this.init();
    const queryVector = await EmbeddingService.getEmbedding(queryText);
    
    // Fetch all documents (simple approach for MVP)
    const rows = this.db!.prepare('SELECT id, text, metadata, embedding FROM documents').all();
    
    const results = rows.map((row: any) => {
      const docVector = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
      const similarity = this.calculateCosineSimilarity(queryVector, Array.from(docVector));
      
      return {
        id: row.id,
        text: row.text,
        metadata: JSON.parse(row.metadata),
        score: similarity
      };
    });

    // Sort by similarity and return top N
    return results
      .sort((a, b) => b.score! - a.score!)
      .slice(0, limit);
  }

  private static calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
