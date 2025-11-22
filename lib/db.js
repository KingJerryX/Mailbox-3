import { createClient } from '@vercel/postgres';

// Create client with pooled connection
// Try POSTGRES_URL first, then POSTGRES_PRISMA_URL (both should be pooled)
const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error('POSTGRES_URL or POSTGRES_PRISMA_URL environment variable is not set.');
}

// Create client - createClient() handles pooled connections automatically
const client = createClient({
  connectionString: connectionString
});

// SQL helper function using the client
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

  // Execute query using the client
  const result = await client.query(text, params);
  return { rows: result.rows };
}

// Track if database is initialized to prevent multiple initializations
let isInitialized = false;
let initPromise = null;

// Initialize database tables (run once)
async function initializeDatabase() {
  // If already initialized or initializing, return the existing promise
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('Initializing database tables...');

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

      isInitialized = true;
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      // Don't throw - tables might already exist
      isInitialized = true; // Mark as initialized even on error to prevent retries
    }
  })();

  return initPromise;
}

// Export sql and initialization function
export { sql, initializeDatabase, client };
