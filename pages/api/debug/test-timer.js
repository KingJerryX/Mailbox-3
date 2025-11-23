import { verifyToken } from '../../../lib/auth.js';
import * as db from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Try to get user, but don't require auth for debugging
  let user = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    user = verifyToken(token);
  }

  // If no user, use a test user ID (1) for testing
  const testUserId = user ? user.id : 1;

  try {
    await db.ensureDatabaseInitialized();

    // Test if table exists
    const tableCheck = await db.sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'countdown_timers'
      )
    `;

    // Test table structure
    const columns = await db.sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'countdown_timers'
      ORDER BY ordinal_position
    `;

    // Test a simple insert (then delete it) - only if user exists
    let testInsert = 'Skipped (no auth)';
    if (user) {
      try {
        const testDate = new Date().toISOString().split('T')[0];
        const testResult = await db.sql`
          INSERT INTO countdown_timers (user_id, timer_name, target_date, timezone, enabled)
          VALUES (${user.id}, 'Test Timer', ${testDate}, 'UTC', false)
          RETURNING id
        `;

        const testId = testResult.rows[0].id;

        // Clean up test record
        await db.sql`
          DELETE FROM countdown_timers WHERE id = ${testId}
        `;

        testInsert = 'Success';
      } catch (insertError) {
        testInsert = `Failed: ${insertError.message}`;
      }
    }

    return res.status(200).json({
      success: true,
      tableExists: tableCheck.rows[0].exists,
      columns: columns.rows,
      testInsert: testInsert,
      user: user ? {
        id: user.id,
        username: user.username
      } : 'Not authenticated (this is OK for debugging)',
      note: 'Visit this page while logged in to test insert functionality'
    });
  } catch (error) {
    console.error('Debug test error:', error);
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
  }
}
