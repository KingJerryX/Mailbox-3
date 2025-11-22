import { sql } from '@vercel/postgres';

// Initialize database tables (run once)
async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create mailbox_designs table
    await sql`
      CREATE TABLE IF NOT EXISTS mailbox_designs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT,
        image_data TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC)
    `;

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    // Don't throw - tables might already exist
  }
}

// Initialize on first import (but don't block)
// Only initialize if not in build phase
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  initializeDatabase().catch(console.error);
}

// Export sql for direct use if needed
export { sql, initializeDatabase };
