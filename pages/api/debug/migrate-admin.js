import { sql, ensureDatabaseInitialized } from '../../../lib/db.js';

export default async function handler(req, res) {
  // Allow in development or with DEBUG_SECRET
  if (process.env.NODE_ENV === 'production' && req.body?.secret !== process.env.DEBUG_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await ensureDatabaseInitialized();

    // Check if is_admin column exists
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_admin'
    `;

    if (columnCheck.rows.length === 0) {
      // Add is_admin column
      await sql`
        ALTER TABLE users
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
      `;

      // Update existing users to have is_admin = false (explicit)
      await sql`
        UPDATE users
        SET is_admin = FALSE
        WHERE is_admin IS NULL
      `;

      return res.status(200).json({
        success: true,
        message: 'Added is_admin column to users table',
        action: 'column_added'
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'is_admin column already exists',
        action: 'no_action_needed'
      });
    }
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
