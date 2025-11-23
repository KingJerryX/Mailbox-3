import { sql, ensureDatabaseInitialized } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureDatabaseInitialized();

    // Add sender_id column if it doesn't exist
    await sql`
      ALTER TABLE countdown_timers
      ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `;

    // Verify the column was added
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'countdown_timers'
      AND column_name = 'sender_id'
    `;

    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      sender_id_column: columns.rows.length > 0 ? 'Exists' : 'Not found',
      columns: columns.rows
    });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  }
}
