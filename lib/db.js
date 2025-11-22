import { createClient } from '@vercel/postgres';

// Create client - use POSTGRES_URL (pooled connection string)
// Vercel automatically provides POSTGRES_URL for pooled connections
// If POSTGRES_URL is not set, try POSTGRES_PRISMA_URL as fallback
const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error('POSTGRES_URL environment variable is not set. Make sure your Vercel Postgres database is connected to this project.');
}

const client = createClient({
  connectionString: connectionString
});

// SQL helper function that works like the sql template literal
async function sql(strings, ...values) {
  // Build the query text with parameter placeholders
  let text = '';
  const params = [];

  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      const paramIndex = params.length + 1;
      text += `$${paramIndex}`;
      params.push(values[i]);
    }
  }

  // Execute query and return in expected format
  const result = await client.query(text, params);
  return { rows: result.rows };
}

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
export { sql, initializeDatabase, client };
