import { verifyToken } from '../../../lib/auth.js';
import { sql, ensureDatabaseInitialized } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    await ensureDatabaseInitialized();

    // Test if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'countdown_timers'
      )
    `;

    // Test table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'countdown_timers'
      ORDER BY ordinal_position
    `;

    // Test a simple insert (then delete it)
    const testDate = new Date().toISOString().split('T')[0];
    const testResult = await sql`
      INSERT INTO countdown_timers (user_id, timer_name, target_date, timezone, enabled)
      VALUES (${user.id}, 'Test Timer', ${testDate}, 'UTC', false)
      RETURNING id
    `;

    const testId = testResult.rows[0].id;

    // Clean up test record
    await sql`
      DELETE FROM countdown_timers WHERE id = ${testId}
    `;

    return res.status(200).json({
      success: true,
      tableExists: tableCheck.rows[0].exists,
      columns: columns.rows,
      testInsert: 'Success',
      user: {
        id: user.id,
        username: user.username
      }
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
