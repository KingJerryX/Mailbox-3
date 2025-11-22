import { initializeDatabase } from '../../../lib/db.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.body.secret !== process.env.DEBUG_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await initializeDatabase();

    return res.status(200).json({
      success: true,
      message: 'Database tables initialized successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
