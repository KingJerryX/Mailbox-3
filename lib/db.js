import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

// Create database directory if it doesn't exist
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dbDir, 'db.json');

// Default data structure
const defaultData = {
  users: [],
  messages: [],
  mailboxDesigns: []
};

// Initialize database
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, defaultData);

// Initialize database on first load
async function initializeDatabase() {
  try {
    await db.read();

    // If database is empty, set default data
    if (!db.data || !db.data.users) {
      db.data = defaultData;
      await db.write();
      console.log('Database initialized with default structure');
    } else {
      // Ensure new fields exist
      if (!db.data.messages) db.data.messages = [];
      if (!db.data.mailboxDesigns) db.data.mailboxDesigns = [];
      await db.write();
      console.log('Database loaded successfully');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    // Create new database if read fails
    db.data = defaultData;
    await db.write();
    console.log('Created new database file');
  }
}

// Initialize on module load
initializeDatabase();

// Get database instance
async function getDB() {
  await db.read();
  return db;
}

export { getDB, db };
