import db from '../config/database';

const isSQLite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite://');

export interface Recipient {
  id?: number;
  user_wallet_address: string;
  recipient_address?: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_type: 'address' | 'email' | 'both';
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Get all recipients for a user
 */
export async function getRecipientsByUser(
  userWalletAddress: string
): Promise<Recipient[]> {
  try {
    if (isSQLite) {
      const recipients = (db as any)
        .prepare(
          `SELECT * FROM recipients 
           WHERE user_wallet_address = ? 
           ORDER BY updated_at DESC, created_at DESC`
        )
        .all(userWalletAddress.toLowerCase());

      return recipients.map((r: any) => ({
        id: r.id,
        user_wallet_address: r.user_wallet_address,
        recipient_address: r.recipient_address,
        recipient_name: r.recipient_name,
        recipient_email: r.recipient_email,
        recipient_type: r.recipient_type,
        created_at: new Date(r.created_at),
        updated_at: new Date(r.updated_at),
      }));
    } else {
      // PostgreSQL
      const result = await (db as any).query(
        `SELECT * FROM recipients 
         WHERE user_wallet_address = $1 
         ORDER BY updated_at DESC, created_at DESC`,
        [userWalletAddress.toLowerCase()]
      );

      return result.rows.map((r: any) => ({
        id: r.id,
        user_wallet_address: r.user_wallet_address,
        recipient_address: r.recipient_address,
        recipient_name: r.recipient_name,
        recipient_email: r.recipient_email,
        recipient_type: r.recipient_type,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    }
  } catch (error) {
    console.error('[RecipientService] Error getting recipients:', error);
    throw new Error(`Failed to get recipients: ${error}`);
  }
}

/**
 * Create a new recipient
 */
export async function createRecipient(
  recipientData: Omit<Recipient, 'id' | 'created_at' | 'updated_at'>
): Promise<Recipient> {
  try {
    const now = new Date();
    const userAddress = recipientData.user_wallet_address.toLowerCase();
    
    // Determine recipient_type based on provided fields
    let recipientType: 'address' | 'email' | 'both' = 'address';
    if (recipientData.recipient_address && recipientData.recipient_email) {
      recipientType = 'both';
    } else if (recipientData.recipient_email) {
      recipientType = 'email';
    }

    if (isSQLite) {
      const stmt = (db as any).prepare(`
        INSERT INTO recipients (
          user_wallet_address, recipient_address, recipient_name, 
          recipient_email, recipient_type, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        userAddress,
        recipientData.recipient_address?.toLowerCase() || null,
        recipientData.recipient_name || null,
        recipientData.recipient_email?.toLowerCase() || null,
        recipientType,
        now.toISOString(),
        now.toISOString()
      );

      return {
        ...recipientData,
        id: result.lastInsertRowid,
        recipient_type: recipientType,
        created_at: now,
        updated_at: now,
      };
    } else {
      // PostgreSQL
      const result = await (db as any).query(
        `INSERT INTO recipients (
          user_wallet_address, recipient_address, recipient_name, 
          recipient_email, recipient_type, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          userAddress,
          recipientData.recipient_address?.toLowerCase() || null,
          recipientData.recipient_name || null,
          recipientData.recipient_email?.toLowerCase() || null,
          recipientType,
          now,
          now,
        ]
      );

      return {
        id: result.rows[0].id,
        user_wallet_address: result.rows[0].user_wallet_address,
        recipient_address: result.rows[0].recipient_address,
        recipient_name: result.rows[0].recipient_name,
        recipient_email: result.rows[0].recipient_email,
        recipient_type: result.rows[0].recipient_type,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
      };
    }
  } catch (error: any) {
    console.error('[RecipientService] Error creating recipient:', error);
    
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint') || error.code === '23505') {
      throw new Error('Recipient already exists');
    }
    
    throw new Error(`Failed to create recipient: ${error.message || error}`);
  }
}

/**
 * Update a recipient
 */
export async function updateRecipient(
  id: number,
  userWalletAddress: string,
  updates: Partial<Omit<Recipient, 'id' | 'user_wallet_address' | 'created_at' | 'updated_at'>>
): Promise<Recipient> {
  try {
    const now = new Date();
    const userAddress = userWalletAddress.toLowerCase();

    // Determine recipient_type if address/email changed
    let recipientType = updates.recipient_type;
    if (updates.recipient_address !== undefined || updates.recipient_email !== undefined) {
      const existing = await getRecipientById(id, userAddress);
      const address = updates.recipient_address || existing?.recipient_address;
      const email = updates.recipient_email || existing?.recipient_email;
      
      if (address && email) {
        recipientType = 'both';
      } else if (email) {
        recipientType = 'email';
      } else if (address) {
        recipientType = 'address';
      }
    }

    if (isSQLite) {
      const setClause: string[] = [];
      const values: any[] = [];
      
      if (updates.recipient_address !== undefined) {
        setClause.push('recipient_address = ?');
        values.push(updates.recipient_address?.toLowerCase() || null);
      }
      if (updates.recipient_name !== undefined) {
        setClause.push('recipient_name = ?');
        values.push(updates.recipient_name || null);
      }
      if (updates.recipient_email !== undefined) {
        setClause.push('recipient_email = ?');
        values.push(updates.recipient_email?.toLowerCase() || null);
      }
      if (recipientType) {
        setClause.push('recipient_type = ?');
        values.push(recipientType);
      }
      setClause.push('updated_at = ?');
      values.push(now.toISOString());
      
      values.push(id, userAddress);

      const stmt = (db as any).prepare(`
        UPDATE recipients 
        SET ${setClause.join(', ')}
        WHERE id = ? AND user_wallet_address = ?
      `);

      stmt.run(...values);

      const updated = await getRecipientById(id, userAddress);
      if (!updated) {
        throw new Error('Recipient not found');
      }
      return updated;
    } else {
      // PostgreSQL
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.recipient_address !== undefined) {
        setClause.push(`recipient_address = $${paramIndex++}`);
        values.push(updates.recipient_address?.toLowerCase() || null);
      }
      if (updates.recipient_name !== undefined) {
        setClause.push(`recipient_name = $${paramIndex++}`);
        values.push(updates.recipient_name || null);
      }
      if (updates.recipient_email !== undefined) {
        setClause.push(`recipient_email = $${paramIndex++}`);
        values.push(updates.recipient_email?.toLowerCase() || null);
      }
      if (recipientType) {
        setClause.push(`recipient_type = $${paramIndex++}`);
        values.push(recipientType);
      }
      setClause.push(`updated_at = $${paramIndex++}`);
      values.push(now);

      values.push(id, userAddress);

      await (db as any).query(
        `UPDATE recipients 
         SET ${setClause.join(', ')}
         WHERE id = $${paramIndex} AND user_wallet_address = $${paramIndex + 1}`,
        values
      );

      const updated = await getRecipientById(id, userAddress);
      if (!updated) {
        throw new Error('Recipient not found');
      }
      return updated;
    }
  } catch (error: any) {
    console.error('[RecipientService] Error updating recipient:', error);
    throw new Error(`Failed to update recipient: ${error.message || error}`);
  }
}

/**
 * Delete a recipient
 */
export async function deleteRecipient(
  id: number,
  userWalletAddress: string
): Promise<void> {
  try {
    const userAddress = userWalletAddress.toLowerCase();

    if (isSQLite) {
      const stmt = (db as any).prepare(`
        DELETE FROM recipients 
        WHERE id = ? AND user_wallet_address = ?
      `);
      const result = stmt.run(id, userAddress);
      
      if (result.changes === 0) {
        throw new Error('Recipient not found');
      }
    } else {
      // PostgreSQL
      const result = await (db as any).query(
        `DELETE FROM recipients 
         WHERE id = $1 AND user_wallet_address = $2`,
        [id, userAddress]
      );
      
      if (result.rowCount === 0) {
        throw new Error('Recipient not found');
      }
    }
  } catch (error: any) {
    console.error('[RecipientService] Error deleting recipient:', error);
    throw new Error(`Failed to delete recipient: ${error.message || error}`);
  }
}

/**
 * Get recipient by ID
 */
async function getRecipientById(
  id: number,
  userWalletAddress: string
): Promise<Recipient | null> {
  try {
    const userAddress = userWalletAddress.toLowerCase();

    if (isSQLite) {
      const recipient = (db as any)
        .prepare(
          `SELECT * FROM recipients 
           WHERE id = ? AND user_wallet_address = ?`
        )
        .get(id, userAddress);

      if (!recipient) return null;

      return {
        id: recipient.id,
        user_wallet_address: recipient.user_wallet_address,
        recipient_address: recipient.recipient_address,
        recipient_name: recipient.recipient_name,
        recipient_email: recipient.recipient_email,
        recipient_type: recipient.recipient_type,
        created_at: new Date(recipient.created_at),
        updated_at: new Date(recipient.updated_at),
      };
    } else {
      // PostgreSQL
      const result = await (db as any).query(
        `SELECT * FROM recipients 
         WHERE id = $1 AND user_wallet_address = $2`,
        [id, userAddress]
      );

      if (result.rows.length === 0) return null;

      const r = result.rows[0];
      return {
        id: r.id,
        user_wallet_address: r.user_wallet_address,
        recipient_address: r.recipient_address,
        recipient_name: r.recipient_name,
        recipient_email: r.recipient_email,
        recipient_type: r.recipient_type,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    }
  } catch (error) {
    console.error('[RecipientService] Error getting recipient by ID:', error);
    return null;
  }
}

