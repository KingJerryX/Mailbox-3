import { sql, initializeDatabase } from './db.js';

// Initialize database on first use (lazy initialization)
let dbInitialized = false;
async function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// Get all messages for a user (both sent and received)
async function getMessages(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      m.*,
      u1.username as sender_username,
      u2.username as recipient_username
    FROM messages m
    LEFT JOIN users u1 ON m.sender_id = u1.id
    LEFT JOIN users u2 ON m.recipient_id = u2.id
    WHERE m.sender_id = ${userId} OR m.recipient_id = ${userId}
    ORDER BY m.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    content: row.content,
    image_url: row.image_url,
    read: row.read,
    created_at: row.created_at.toISOString(),
    sender_username: row.sender_username,
    recipient_username: row.recipient_username
  }));
}

// Get unread messages for a user
async function getUnreadMessages(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      m.*,
      u.username as sender_username
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.recipient_id = ${userId} AND m.read = FALSE
    ORDER BY m.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    content: row.content,
    image_url: row.image_url,
    read: row.read,
    created_at: row.created_at.toISOString(),
    sender_username: row.sender_username
  }));
}

// Get messages received by a user
async function getReceivedMessages(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      m.*,
      u.username as sender_username
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.recipient_id = ${userId}
    ORDER BY m.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    content: row.content,
    image_url: row.image_url,
    read: row.read,
    created_at: row.created_at.toISOString(),
    sender_username: row.sender_username
  }));
}

// Create a new message
async function createMessage(senderId, recipientId, content, imageUrl = null) {
  await ensureDatabaseInitialized();
  const result = await sql`
    INSERT INTO messages (sender_id, recipient_id, content, image_url, read)
    VALUES (${senderId}, ${recipientId}, ${content}, ${imageUrl}, FALSE)
    RETURNING *
  `;

  const message = result.rows[0];
  return {
    id: message.id,
    sender_id: message.sender_id,
    recipient_id: message.recipient_id,
    content: message.content,
    image_url: message.image_url,
    read: message.read,
    created_at: message.created_at.toISOString()
  };
}

// Mark message as read
async function markAsRead(messageId, userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    UPDATE messages
    SET read = TRUE
    WHERE id = ${messageId} AND recipient_id = ${userId}
    RETURNING *
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const message = result.rows[0];
  return {
    id: message.id,
    sender_id: message.sender_id,
    recipient_id: message.recipient_id,
    content: message.content,
    image_url: message.image_url,
    read: message.read,
    created_at: message.created_at.toISOString()
  };
}

// Get or create mailbox design for a user
async function getMailboxDesign(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT * FROM mailbox_designs
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const design = result.rows[0];
  return {
    user_id: design.user_id,
    image_url: design.image_url,
    image_data: design.image_data,
    updated_at: design.updated_at.toISOString()
  };
}

// Save mailbox design for a user
async function saveMailboxDesign(userId, imageUrl, imageData = null) {
  await ensureDatabaseInitialized();
  const result = await sql`
    INSERT INTO mailbox_designs (user_id, image_url, image_data, updated_at)
    VALUES (${userId}, ${imageUrl}, ${imageData}, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id)
    DO UPDATE SET
      image_url = EXCLUDED.image_url,
      image_data = EXCLUDED.image_data,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const design = result.rows[0];
  return {
    user_id: design.user_id,
    image_url: design.image_url,
    image_data: design.image_data,
    updated_at: design.updated_at.toISOString()
  };
}

// Get all users (for selecting recipient)
async function getAllUsers(excludeUserId = null) {
  await ensureDatabaseInitialized();
  let result;

  if (excludeUserId) {
    result = await sql`
      SELECT id, username FROM users
      WHERE id != ${excludeUserId}
      ORDER BY username
    `;
  } else {
    result = await sql`
      SELECT id, username FROM users
      ORDER BY username
    `;
  }

  return result.rows.map(row => ({
    id: row.id,
    username: row.username
  }));
}

// User management functions
async function createUser(username, password) {
  await ensureDatabaseInitialized();
  try {
    // Check if username already exists
    const existing = await sql`
      SELECT id FROM users WHERE username = ${username} LIMIT 1
    `;

    if (existing.rows.length > 0) {
      throw new Error('Username already exists');
    }

    // Create new user
    const result = await sql`
      INSERT INTO users (username, password, created_at)
      VALUES (${username}, ${password}, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const user = result.rows[0];
    return {
      id: user.id,
      username: user.username,
      created_at: user.created_at.toISOString()
    };
  } catch (error) {
    // If it's our custom error, rethrow it
    if (error.message === 'Username already exists') {
      throw error;
    }
    // Check if it's a unique constraint violation
    if (error.message && error.message.includes('unique')) {
      throw new Error('Username already exists');
    }
    throw error;
  }
}

async function getUserByUsername(username) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT * FROM users WHERE username = ${username} LIMIT 1
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    created_at: user.created_at.toISOString()
  };
}

async function getUserById(id) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    created_at: user.created_at.toISOString()
  };
}

// Update user password
async function updateUserPassword(userId, hashedPassword) {
  await ensureDatabaseInitialized();
  await sql`
    UPDATE users
    SET password = ${hashedPassword}
    WHERE id = ${userId}
  `;
}

// Delete user account (cascades to messages and designs via foreign keys)
async function deleteUser(userId) {
  await ensureDatabaseInitialized();
  await sql`
    DELETE FROM users WHERE id = ${userId}
  `;
}

export {
  getMessages,
  getUnreadMessages,
  getReceivedMessages,
  createMessage,
  markAsRead,
  getMailboxDesign,
  saveMailboxDesign,
  getAllUsers,
  createUser,
  getUserByUsername,
  getUserById,
  updateUserPassword,
  deleteUser
};
