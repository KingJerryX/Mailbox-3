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

// Get threads/conversations for a user (grouped by other user)
async function getThreads(userId) {
  await ensureDatabaseInitialized();

  // Get all messages for the user
  const allMessages = await sql`
    SELECT
      m.*,
      u1.username as sender_username,
      u2.username as recipient_username,
      CASE
        WHEN m.sender_id = ${userId} THEN m.recipient_id
        ELSE m.sender_id
      END as other_user_id,
      CASE
        WHEN m.sender_id = ${userId} THEN u2.username
        ELSE u1.username
      END as other_username
    FROM messages m
    LEFT JOIN users u1 ON m.sender_id = u1.id
    LEFT JOIN users u2 ON m.recipient_id = u2.id
    WHERE m.sender_id = ${userId} OR m.recipient_id = ${userId}
    ORDER BY m.created_at DESC
  `;

  // Group messages by other_user_id and get latest message for each thread
  const threadsMap = new Map();

  for (const msg of allMessages.rows) {
    const otherUserId = msg.other_user_id;
    if (!threadsMap.has(otherUserId)) {
      threadsMap.set(otherUserId, {
        other_user_id: otherUserId,
        other_username: msg.other_username,
        last_message: msg.content,
        last_message_time: msg.created_at,
        unread_count: 0
      });
    }
  }

  // Count unread messages for each thread
  for (const msg of allMessages.rows) {
    if (msg.recipient_id === userId && !msg.read) {
      const thread = threadsMap.get(msg.other_user_id);
      if (thread) {
        thread.unread_count++;
      }
    }
  }

  // Convert to array and sort by last message time
  const threads = Array.from(threadsMap.values()).sort((a, b) =>
    new Date(b.last_message_time) - new Date(a.last_message_time)
  );

  return threads.map(thread => ({
    other_user_id: thread.other_user_id,
    other_username: thread.other_username,
    last_message: thread.last_message,
    last_message_time: thread.last_message_time.toISOString(),
    unread_count: thread.unread_count
  }));
}

// Get messages in a thread (conversation between two users)
async function getThreadMessages(userId, otherUserId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      m.*,
      u1.username as sender_username,
      u2.username as recipient_username
    FROM messages m
    LEFT JOIN users u1 ON m.sender_id = u1.id
    LEFT JOIN users u2 ON m.recipient_id = u2.id
    WHERE (m.sender_id = ${userId} AND m.recipient_id = ${otherUserId})
       OR (m.sender_id = ${otherUserId} AND m.recipient_id = ${userId})
    ORDER BY m.created_at ASC
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
    recipient_username: row.recipient_username,
    is_sent: row.sender_id === userId
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

// Countdown timer functions
async function getCountdownTimers(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      ct.*,
      u.username as sender_username,
      CASE
        WHEN ct.sender_id = ${userId} THEN u2.username
        ELSE u.username
      END as shared_with_username
    FROM countdown_timers ct
    LEFT JOIN users u ON ct.sender_id = u.id
    LEFT JOIN users u2 ON ct.user_id = u2.id AND ct.sender_id = ${userId}
    WHERE (ct.user_id = ${userId} OR ct.sender_id = ${userId}) AND ct.enabled = TRUE
    ORDER BY ct.created_at DESC
  `;

  return result.rows.map(row => {
    // Determine if this is a shared timer and who it's shared with
    const isShared = row.sender_id !== null;
    const isReceived = row.user_id === userId && row.sender_id !== null && row.sender_id !== userId;
    const isSent = row.sender_id === userId && row.user_id !== userId;

    // Get the username of the person it's shared with
    let sharedWithUsername = null;
    if (isSent) {
      // I sent it, so it's shared with the user_id
      sharedWithUsername = row.shared_with_username;
    } else if (isReceived) {
      // I received it, so it's shared with me from sender
      sharedWithUsername = row.sender_username;
    }

    return {
      id: row.id,
      sender_id: row.sender_id,
      sender_username: row.sender_username,
      shared_with_username: sharedWithUsername,
      timer_name: row.timer_name,
      target_date: row.target_date instanceof Date
        ? row.target_date.toISOString().split('T')[0]
        : row.target_date,
      target_time: row.target_time ? (typeof row.target_time === 'string' ? row.target_time : row.target_time.toString()) : null,
      timezone: row.timezone,
      enabled: row.enabled,
      created_at: row.created_at,
      is_shared: isShared,
      is_received: isReceived,
      is_sent: isSent
    };
  });
}

async function getCountdownTimer(timerId, userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      ct.*,
      u.username as sender_username
    FROM countdown_timers ct
    LEFT JOIN users u ON ct.sender_id = u.id
    WHERE ct.id = ${timerId} AND ct.user_id = ${userId} AND ct.enabled = TRUE
    LIMIT 1
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    sender_id: row.sender_id,
    sender_username: row.sender_username,
    timer_name: row.timer_name,
    target_date: row.target_date instanceof Date
      ? row.target_date.toISOString().split('T')[0]
      : row.target_date,
    target_time: row.target_time ? (typeof row.target_time === 'string' ? row.target_time : row.target_time.toString()) : null,
    timezone: row.timezone,
    enabled: row.enabled,
    created_at: row.created_at
  };
}

async function saveCountdownTimer(userId, timerData) {
  await ensureDatabaseInitialized();

  const { timer_name, target_date, target_time, timezone, enabled, sender_id } = timerData;

  console.log('saveCountdownTimer called with:', {
    userId,
    timer_name,
    target_date,
    target_time,
    timezone,
    enabled,
    sender_id
  });

  try {
    // Insert new timer (users can have multiple timers)
    // Handle null values properly for PostgreSQL
    const result = await sql`
      INSERT INTO countdown_timers (user_id, sender_id, timer_name, target_date, target_time, timezone, enabled)
      VALUES (
        ${userId},
        ${sender_id || null},
        ${timer_name || 'Time Until We Meet'},
        ${target_date},
        ${target_time || null},
        ${timezone},
        ${enabled !== undefined ? enabled : true}
      )
      RETURNING id
    `;

    console.log('Insert result:', result);

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to create timer - no ID returned from database');
    }

    const timerId = result.rows[0].id;
    console.log('Timer created with ID:', timerId);

    const timer = await getCountdownTimer(timerId, userId);
    console.log('Retrieved timer:', timer);

    return timer;
  } catch (error) {
    console.error('Error in saveCountdownTimer:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    throw error;
  }
}

async function deleteCountdownTimer(timerId, userId) {
  await ensureDatabaseInitialized();
  await sql`
    UPDATE countdown_timers
    SET enabled = FALSE
    WHERE id = ${timerId} AND user_id = ${userId}
  `;
  return true;
}

export {
  getMessages,
  getThreads,
  getThreadMessages,
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
  deleteUser,
  getCountdownTimers,
  getCountdownTimer,
  saveCountdownTimer,
  deleteCountdownTimer
};
