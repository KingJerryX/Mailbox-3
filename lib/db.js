import pg from 'pg';
const { Pool } = pg;

// Create connection pool using POSTGRES_URL (Prisma database connection)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// SQL helper function using the pool
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

  // Execute query using the pool
  const result = await pool.query(text, params);
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

      // Add is_admin column if it doesn't exist (migration)
      // PostgreSQL doesn't support IF NOT EXISTS for ADD COLUMN, so we check first
      try {
        const columnCheck = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'is_admin'
        `;

        if (columnCheck.rows.length === 0) {
          await sql`
            ALTER TABLE users
            ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
          `;
          console.log('Added is_admin column to users table');
        } else {
          console.log('is_admin column already exists');
        }
      } catch (err) {
        console.error('Error checking/adding is_admin column:', err.message);
        // Try to add it anyway if check failed
        try {
          await sql`
            ALTER TABLE users
            ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
          `;
          console.log('Added is_admin column (fallback)');
        } catch (addErr) {
          // Column might already exist, which is fine
          if (!addErr.message.includes('already exists') && !addErr.message.includes('duplicate')) {
            console.error('Could not add is_admin column:', addErr.message);
          }
        }
      }

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

      // Create countdown_timers table
      await sql`
        CREATE TABLE IF NOT EXISTS countdown_timers (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          timer_name VARCHAR(255) DEFAULT 'Time Until We Meet',
          target_date DATE NOT NULL,
          target_time TIME,
          timezone VARCHAR(100) NOT NULL,
          enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Remove unique constraint on user_id if it exists (allow multiple timers per user)
      // PostgreSQL doesn't support IF EXISTS for DROP CONSTRAINT, so we check first
      try {
        const constraintCheck = await sql`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'countdown_timers'
          AND constraint_name = 'countdown_timers_user_id_key'
        `;

        if (constraintCheck.rows.length > 0) {
          await sql`
            ALTER TABLE countdown_timers
            DROP CONSTRAINT countdown_timers_user_id_key
          `;
          console.log('Removed unique constraint on user_id');
        }
      } catch (err) {
        // Constraint might not exist or already removed, ignore error
        console.log('Note: unique constraint removal:', err.message);
      }

      // Add sender_id column if it doesn't exist (migration for existing tables)
      try {
        await sql`
          ALTER TABLE countdown_timers
          ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL
        `;
      } catch (err) {
        // Column might already exist, ignore error
        console.log('Note: sender_id column check:', err.message);
      }

      // Create love_notes table
      await sql`
        CREATE TABLE IF NOT EXISTS love_notes (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          bg_color VARCHAR(20) DEFAULT '#FFF7D1',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          seen BOOLEAN DEFAULT FALSE,
          archived BOOLEAN DEFAULT FALSE
        )
      `;

      // Add archived column if it doesn't exist (migration)
      try {
        const columnCheck = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'love_notes' AND column_name = 'archived'
        `;

        if (columnCheck.rows.length === 0) {
          await sql`
            ALTER TABLE love_notes
            ADD COLUMN archived BOOLEAN DEFAULT FALSE
          `;
          console.log('Added archived column to love_notes table');
        }
      } catch (err) {
        console.log('Note: archived column check:', err.message);
      }

      // Create indexes for better performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_love_notes_receiver ON love_notes(receiver_id, seen)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_love_notes_created ON love_notes(created_at DESC)
      `;

      // Create bucket_list_items table
      await sql`
        CREATE TABLE IF NOT EXISTS bucket_list_items (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          category VARCHAR(50),
          image_url TEXT,
          is_completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        )
      `;

      // Create indexes for bucket list items
      await sql`
        CREATE INDEX IF NOT EXISTS idx_bucket_list_user ON bucket_list_items(user_id, is_completed)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_bucket_list_created ON bucket_list_items(created_at DESC)
      `;

      // Create Two Truths and a Lie game tables
      await sql`
        CREATE TABLE IF NOT EXISTS ttl_games (
          id SERIAL PRIMARY KEY,
          creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          truth1 TEXT NOT NULL,
          truth2 TEXT NOT NULL,
          lie TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          guessed BOOLEAN DEFAULT FALSE,
          guessed_choice TEXT,
          was_correct BOOLEAN
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS ttl_stats (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          total_games INTEGER DEFAULT 0,
          correct_guesses INTEGER DEFAULT 0
        )
      `;

      // Create indexes for TTL games
      await sql`
        CREATE INDEX IF NOT EXISTS idx_ttl_receiver ON ttl_games(receiver_id, guessed)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_ttl_creator ON ttl_games(creator_id)
      `;

      // Create Hangman game tables
      await sql`
        CREATE TABLE IF NOT EXISTS hangman_games (
          id SERIAL PRIMARY KEY,
          creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          target_word TEXT NOT NULL,
          hint TEXT,
          allowed_wrong_guesses INTEGER NOT NULL DEFAULT 6,
          current_wrong_guesses INTEGER DEFAULT 0,
          revealed_letters TEXT[] DEFAULT '{}',
          guessed_letters TEXT[] DEFAULT '{}',
          game_status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS hangman_stats (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          games_played INTEGER DEFAULT 0,
          games_won INTEGER DEFAULT 0,
          win_percentage NUMERIC(5, 2) DEFAULT 0
        )
      `;

      // Create indexes for Hangman games
      await sql`
        CREATE INDEX IF NOT EXISTS idx_hangman_recipient ON hangman_games(recipient_id, game_status)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_hangman_creator ON hangman_games(creator_id)
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

      // Create love_log_posts table
      await sql`
        CREATE TABLE IF NOT EXISTS love_log_posts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Add reactions column if it doesn't exist
      try {
        const reactionsCheck = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'love_log_posts' AND column_name = 'reactions'
        `;

        if (reactionsCheck.rows.length === 0) {
          await sql`
            ALTER TABLE love_log_posts
            ADD COLUMN reactions JSONB DEFAULT '{"sad": 0, "neutral": 0, "happy": 0}'::jsonb
          `;
          console.log('Added reactions column to love_log_posts table');
        }
      } catch (err) {
        console.error('Error checking/adding reactions column:', err.message);
        // Try to add it anyway if check failed
        try {
          await sql`
            ALTER TABLE love_log_posts
            ADD COLUMN reactions JSONB DEFAULT '{"sad": 0, "neutral": 0, "happy": 0}'::jsonb
          `;
          console.log('Added reactions column (fallback)');
        } catch (addErr) {
          if (!addErr.message.includes('already exists') && !addErr.message.includes('duplicate')) {
            console.error('Could not add reactions column:', addErr.message);
          }
        }
      }

      // Add mood column if it doesn't exist
      try {
        const moodCheck = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'love_log_posts' AND column_name = 'mood'
        `;

        if (moodCheck.rows.length === 0) {
          await sql`
            ALTER TABLE love_log_posts
            ADD COLUMN mood VARCHAR(20)
          `;
          console.log('Added mood column to love_log_posts table');
        }
      } catch (err) {
        console.error('Error checking/adding mood column:', err.message);
        try {
          await sql`
            ALTER TABLE love_log_posts
            ADD COLUMN mood VARCHAR(20)
          `;
          console.log('Added mood column (fallback)');
        } catch (addErr) {
          if (!addErr.message.includes('already exists') && !addErr.message.includes('duplicate')) {
            console.error('Could not add mood column:', addErr.message);
          }
        }
      }

      // Create indexes for love log posts
      await sql`
        CREATE INDEX IF NOT EXISTS idx_love_log_user ON love_log_posts(user_id, created_at DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_love_log_created ON love_log_posts(created_at DESC)
      `;

      // Create friend_requests table
      await sql`
        CREATE TABLE IF NOT EXISTS friend_requests (
          id SERIAL PRIMARY KEY,
          requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(requester_id, receiver_id)
        )
      `;

      // Create indexes for friend requests
      await sql`
        CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester_id, status)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status)
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
export { sql, initializeDatabase, pool as client };
