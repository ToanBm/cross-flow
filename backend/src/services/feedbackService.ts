import db from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

export interface Feedback {
  id: number;
  message: string;
  email: string | null;
  user_address: string | null;
  created_at: Date;
}

const isSQLite = process.env.DATABASE_URL?.startsWith('sqlite://');

/**
 * Create a new feedback
 */
export async function createFeedback(data: {
  message: string;
  email: string | null;
  user_address: string | null;
}): Promise<Feedback> {
  const now = new Date();

  if (isSQLite) {
    const stmt = (db as any).prepare(`
      INSERT INTO feedbacks (message, email, user_address, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.message,
      data.email,
      data.user_address,
      now.toISOString()
    );

    return {
      id: result.lastInsertRowid as number,
      message: data.message,
      email: data.email,
      user_address: data.user_address,
      created_at: now,
    };
  } else {
    // PostgreSQL
    const result = await (db as any).query(
      `INSERT INTO feedbacks (message, email, user_address, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.message, data.email, data.user_address, now]
    );

    return result.rows[0];
  }
}

/**
 * Get all feedbacks
 */
export async function getAllFeedbacks(): Promise<Feedback[]> {
  if (isSQLite) {
    const feedbacks = (db as any)
      .prepare('SELECT * FROM feedbacks ORDER BY created_at DESC')
      .all();
    return feedbacks;
  } else {
    const result = await (db as any).query(
      'SELECT * FROM feedbacks ORDER BY created_at DESC'
    );
    return result.rows;
  }
}

