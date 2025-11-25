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

// Delete all messages in a thread between two users
async function deleteThread(userId, otherUserId) {
  await ensureDatabaseInitialized();
  await sql`
    DELETE FROM messages
    WHERE (sender_id = ${userId} AND recipient_id = ${otherUserId})
       OR (sender_id = ${otherUserId} AND recipient_id = ${userId})
  `;
  return true;
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
async function getAllUsers(excludeUserId = null, requestingUserId = null) {
  await ensureDatabaseInitialized();

  // Check if requesting user is admin
  let isRequestingUserAdmin = false;
  if (requestingUserId) {
    const requestingUser = await getUserById(requestingUserId);
    isRequestingUserAdmin = requestingUser?.is_admin || false;
  }

  let result;

  if (excludeUserId) {
    // If requesting user is not admin, exclude admin users from the list
    if (isRequestingUserAdmin) {
      // Admin can see all users except themselves
      result = await sql`
        SELECT id, username FROM users
        WHERE id != ${excludeUserId}
        ORDER BY username
      `;
    } else {
      // Non-admin users cannot see admin users
      result = await sql`
        SELECT id, username FROM users
        WHERE id != ${excludeUserId} AND (is_admin = FALSE OR is_admin IS NULL)
        ORDER BY username
      `;
    }
  } else {
    // If requesting user is not admin, exclude admin users from the list
    if (isRequestingUserAdmin) {
      // Admin can see all users
      result = await sql`
        SELECT id, username FROM users
        ORDER BY username
      `;
    } else {
      // Non-admin users cannot see admin users
      result = await sql`
        SELECT id, username FROM users
        WHERE is_admin = FALSE OR is_admin IS NULL
        ORDER BY username
      `;
    }
  }

  return result.rows.map(row => ({
    id: row.id,
    username: row.username
  }));
}

// User management functions
async function createUser(username, password, isAdmin = false) {
  await ensureDatabaseInitialized();
  try {
    // Check if username already exists
    const existing = await sql`
      SELECT id FROM users WHERE username = ${username} LIMIT 1
    `;

    if (existing.rows.length > 0) {
      throw new Error('Username already exists');
    }

    // Check if this username should be admin (from environment variable)
    const adminUsername = process.env.ADMIN_USERNAME;
    const shouldBeAdmin = isAdmin || (adminUsername && username.toLowerCase() === adminUsername.toLowerCase());

    // Create new user
    const result = await sql`
      INSERT INTO users (username, password, is_admin, created_at)
      VALUES (${username}, ${password}, ${shouldBeAdmin}, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const user = result.rows[0];
    return {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin || false,
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
  // Ensure is_admin is properly converted to boolean
  let isAdmin = false;
  if (user.is_admin === true || user.is_admin === 't' || user.is_admin === 1 || user.is_admin === 'true') {
    isAdmin = true;
  }

  return {
    id: user.id,
    username: user.username,
    password: user.password,
    is_admin: isAdmin,
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
  // Ensure is_admin is properly converted to boolean
  // PostgreSQL might return it as true/false, 't'/'f', 1/0, or null
  let isAdmin = false;
  const adminValue = user.is_admin;

  // Check all possible formats PostgreSQL might return
  if (adminValue === true ||
      adminValue === 't' ||
      adminValue === 1 ||
      adminValue === '1' ||
      adminValue === 'true' ||
      adminValue === 'TRUE' ||
      (typeof adminValue === 'string' && adminValue.toLowerCase() === 'true')) {
    isAdmin = true;
  }

  // Debug logging
  console.log('getUserById - Admin check:', {
    userId: user.id,
    username: user.username,
    'raw is_admin': adminValue,
    'typeof': typeof adminValue,
    'isAdmin result': isAdmin
  });

  return {
    id: user.id,
    username: user.username,
    password: user.password,
    is_admin: isAdmin,
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
  // Delete timer if user owns it (user_id) OR if user sent it (sender_id)
  // This handles both personal and shared timers
  await sql`
    UPDATE countdown_timers
    SET enabled = FALSE
    WHERE id = ${timerId} AND (user_id = ${userId} OR sender_id = ${userId})
  `;
  return true;
}

// Love notes functions
async function createLoveNote(senderId, receiverId, content, bgColor) {
  await ensureDatabaseInitialized();
  const result = await sql`
    INSERT INTO love_notes (sender_id, receiver_id, content, bg_color)
    VALUES (${senderId}, ${receiverId}, ${content}, ${bgColor || '#FFF7D1'})
    RETURNING id
  `;
  return result.rows[0].id;
}

async function getUnseenLoveNotes(receiverId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      ln.*,
      u.username as sender_username
    FROM love_notes ln
    LEFT JOIN users u ON ln.sender_id = u.id
    WHERE ln.receiver_id = ${receiverId} AND ln.seen = FALSE AND ln.archived = FALSE
    ORDER BY ln.created_at ASC
  `;

  return result.rows.map(row => ({
    id: row.id,
    sender_id: row.sender_id,
    sender_username: row.sender_username,
    receiver_id: row.receiver_id,
    content: row.content,
    bg_color: row.bg_color,
    created_at: row.created_at.toISOString(),
    seen: row.seen,
    archived: row.archived || false
  }));
}

async function markLoveNotesAsSeen(receiverId, noteIds) {
  await ensureDatabaseInitialized();
  if (!noteIds || noteIds.length === 0) return;

  await sql`
    UPDATE love_notes
    SET seen = TRUE
    WHERE receiver_id = ${receiverId} AND id = ANY(${noteIds})
  `;
  return true;
}

async function getAllLoveNotes(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      ln.*,
      u.username as sender_username
    FROM love_notes ln
    LEFT JOIN users u ON ln.sender_id = u.id
    WHERE ln.receiver_id = ${userId} AND ln.archived = FALSE
    ORDER BY ln.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    sender_id: row.sender_id,
    sender_username: row.sender_username,
    receiver_id: row.receiver_id,
    content: row.content,
    bg_color: row.bg_color,
    created_at: row.created_at.toISOString(),
    seen: row.seen,
    archived: row.archived || false
  }));
}

async function archiveLoveNote(noteId, userId) {
  await ensureDatabaseInitialized();
  await sql`
    UPDATE love_notes
    SET archived = TRUE, seen = TRUE
    WHERE id = ${noteId} AND receiver_id = ${userId}
  `;
  return true;
}

async function getArchivedLoveNotes(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      ln.*,
      u.username as sender_username
    FROM love_notes ln
    LEFT JOIN users u ON ln.sender_id = u.id
    WHERE ln.receiver_id = ${userId} AND ln.archived = TRUE
    ORDER BY ln.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    sender_id: row.sender_id,
    sender_username: row.sender_username,
    receiver_id: row.receiver_id,
    content: row.content,
    bg_color: row.bg_color,
    created_at: row.created_at.toISOString(),
    seen: row.seen,
    archived: row.archived || false
  }));
}

async function deleteLoveNote(noteId, userId) {
  await ensureDatabaseInitialized();
  await sql`
    DELETE FROM love_notes
    WHERE id = ${noteId} AND receiver_id = ${userId}
  `;
  return true;
}

// Love Log functions
async function createLoveLogPost(userId, title, content) {
  await ensureDatabaseInitialized();
  const result = await sql`
    INSERT INTO love_log_posts (user_id, title, content)
    VALUES (${userId}, ${title}, ${content})
    RETURNING id, created_at
  `;
  return {
    id: result.rows[0].id,
    created_at: result.rows[0].created_at.toISOString()
  };
}

async function getLoveLogPosts(userId) {
  await ensureDatabaseInitialized();
  // Get all friends (both directions)
  const friendsResult = await sql`
    SELECT DISTINCT
      CASE
        WHEN requester_id = ${userId} THEN receiver_id
        WHEN receiver_id = ${userId} THEN requester_id
      END as friend_id
    FROM friend_requests
    WHERE (requester_id = ${userId} OR receiver_id = ${userId})
      AND status = 'accepted'
  `;

  const friendIds = friendsResult.rows.map(row => row.friend_id).filter(id => id !== null);

  // Include user's own posts and friends' posts
  const allUserIds = [userId, ...friendIds];

  // If no friends and no own posts, return empty array
  if (allUserIds.length === 0) {
    return [];
  }

  // Get posts from user and friends
  const result = await sql`
    SELECT
      p.*,
      u.username as author_username
    FROM love_log_posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ANY(${allUserIds})
    ORDER BY p.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    author_username: row.author_username,
    title: row.title,
    content: row.content,
    created_at: row.created_at.toISOString()
  }));
}

// Get posts for a specific user (only if viewer is the user or they're friends)
async function getLoveLogPostsByUser(viewerId, targetUserId) {
  await ensureDatabaseInitialized();

  // If viewing own posts, allow it
  if (viewerId === targetUserId) {
    const result = await sql`
      SELECT
        p.*,
        u.username as author_username
      FROM love_log_posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ${targetUserId}
      ORDER BY p.created_at DESC
    `;

    return result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      author_username: row.author_username,
      title: row.title,
      content: row.content,
      created_at: row.created_at.toISOString()
    }));
  }

  // Check if they're friends
  const friendshipCheck = await sql`
    SELECT id
    FROM friend_requests
    WHERE ((requester_id = ${viewerId} AND receiver_id = ${targetUserId})
       OR (requester_id = ${targetUserId} AND receiver_id = ${viewerId}))
      AND status = 'accepted'
    LIMIT 1
  `;

  if (friendshipCheck.rows.length === 0) {
    return []; // Not friends, return empty
  }

  // They're friends, get the posts
  const result = await sql`
    SELECT
      p.*,
      u.username as author_username
    FROM love_log_posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ${targetUserId}
    ORDER BY p.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    author_username: row.author_username,
    title: row.title,
    content: row.content,
    created_at: row.created_at.toISOString()
  }));
}

// Update a love log post (only by the owner)
async function updateLoveLogPost(postId, userId, title, content) {
  await ensureDatabaseInitialized();

  // First verify the post belongs to the user
  const checkResult = await sql`
    SELECT user_id FROM love_log_posts WHERE id = ${postId}
  `;

  if (checkResult.rows.length === 0) {
    throw new Error('Post not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new Error('Unauthorized: You can only edit your own posts');
  }

  // Update the post
  const result = await sql`
    UPDATE love_log_posts
    SET title = ${title}, content = ${content}
    WHERE id = ${postId} AND user_id = ${userId}
    RETURNING id, title, content, created_at
  `;

  if (result.rows.length === 0) {
    throw new Error('Failed to update post');
  }

  return {
    id: result.rows[0].id,
    title: result.rows[0].title,
    content: result.rows[0].content,
    created_at: result.rows[0].created_at.toISOString()
  };
}

// Delete a love log post (only by the owner)
async function deleteLoveLogPost(postId, userId) {
  await ensureDatabaseInitialized();

  // First verify the post belongs to the user
  const checkResult = await sql`
    SELECT user_id FROM love_log_posts WHERE id = ${postId}
  `;

  if (checkResult.rows.length === 0) {
    throw new Error('Post not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new Error('Unauthorized: You can only delete your own posts');
  }

  // Delete the post
  await sql`
    DELETE FROM love_log_posts
    WHERE id = ${postId} AND user_id = ${userId}
  `;

  return true;
}

// Friend request functions
async function sendFriendRequest(requesterId, receiverUsername) {
  await ensureDatabaseInitialized();

  // Get receiver user by username
  const receiverResult = await sql`
    SELECT id FROM users WHERE username = ${receiverUsername}
  `;

  if (receiverResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const receiverId = receiverResult.rows[0].id;

  if (requesterId === receiverId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if request already exists
  const existingResult = await sql`
    SELECT id, status FROM friend_requests
    WHERE (requester_id = ${requesterId} AND receiver_id = ${receiverId})
       OR (requester_id = ${receiverId} AND receiver_id = ${requesterId})
    LIMIT 1
  `;

  if (existingResult.rows.length > 0) {
    const existing = existingResult.rows[0];
    if (existing.status === 'pending') {
      throw new Error('Friend request already pending');
    } else if (existing.status === 'accepted') {
      throw new Error('Already friends');
    }
  }

  // Create new friend request
  const result = await sql`
    INSERT INTO friend_requests (requester_id, receiver_id, status)
    VALUES (${requesterId}, ${receiverId}, 'pending')
    ON CONFLICT (requester_id, receiver_id) DO NOTHING
    RETURNING id
  `;

  if (result.rows.length === 0) {
    throw new Error('Friend request already exists');
  }

  return result.rows[0].id;
}

async function getFriendRequests(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      fr.*,
      u1.username as requester_username,
      u2.username as receiver_username
    FROM friend_requests fr
    LEFT JOIN users u1 ON fr.requester_id = u1.id
    LEFT JOIN users u2 ON fr.receiver_id = u2.id
    WHERE fr.receiver_id = ${userId} AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    requester_id: row.requester_id,
    requester_username: row.requester_username,
    receiver_id: row.receiver_id,
    receiver_username: row.receiver_username,
    status: row.status,
    created_at: row.created_at.toISOString()
  }));
}

async function acceptFriendRequest(requestId, userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    UPDATE friend_requests
    SET status = 'accepted'
    WHERE id = ${requestId} AND receiver_id = ${userId} AND status = 'pending'
    RETURNING *
  `;

  if (result.rows.length === 0) {
    throw new Error('Friend request not found or already processed');
  }

  return true;
}

async function rejectFriendRequest(requestId, userId) {
  await ensureDatabaseInitialized();
  await sql`
    DELETE FROM friend_requests
    WHERE id = ${requestId} AND receiver_id = ${userId} AND status = 'pending'
  `;
  return true;
}

async function getFriends(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT DISTINCT
      CASE
        WHEN requester_id = ${userId} THEN receiver_id
        WHEN receiver_id = ${userId} THEN requester_id
      END as friend_id,
      CASE
        WHEN requester_id = ${userId} THEN u2.username
        WHEN receiver_id = ${userId} THEN u1.username
      END as friend_username
    FROM friend_requests fr
    LEFT JOIN users u1 ON fr.requester_id = u1.id
    LEFT JOIN users u2 ON fr.receiver_id = u2.id
    WHERE (requester_id = ${userId} OR receiver_id = ${userId})
      AND status = 'accepted'
  `;

  return result.rows
    .filter(row => row.friend_id !== null)
    .map(row => ({
      id: row.friend_id,
      username: row.friend_username
    }));
}

// Remove a friend (delete the friendship)
async function removeFriend(userId, friendId) {
  await ensureDatabaseInitialized();

  // Delete the friend request record (works for both directions)
  const result = await sql`
    DELETE FROM friend_requests
    WHERE ((requester_id = ${userId} AND receiver_id = ${friendId})
       OR (requester_id = ${friendId} AND receiver_id = ${userId}))
      AND status = 'accepted'
    RETURNING id
  `;

  if (result.rows.length === 0) {
    throw new Error('Friendship not found');
  }

  return true;
}

// Bucket list functions
async function createBucketListItem(userId, itemData) {
  await ensureDatabaseInitialized();
  const { title, description, category, image_url } = itemData;

  const result = await sql`
    INSERT INTO bucket_list_items (user_id, created_by, title, description, category, image_url)
    VALUES (${userId}, ${userId}, ${title}, ${description || null}, ${category || null}, ${image_url || null})
    RETURNING id
  `;

  return await getBucketListItem(result.rows[0].id);
}

async function getBucketListItems(userId) {
  await ensureDatabaseInitialized();
  // Show all items to all users (shared bucket list)
  const result = await sql`
    SELECT
      bli.*,
      u.username as created_by_username
    FROM bucket_list_items bli
    LEFT JOIN users u ON bli.created_by = u.id
    ORDER BY bli.is_completed ASC, bli.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    created_by: row.created_by,
    created_by_username: row.created_by_username,
    title: row.title,
    description: row.description,
    category: row.category,
    image_url: row.image_url,
    is_completed: row.is_completed,
    created_at: row.created_at.toISOString(),
    completed_at: row.completed_at ? row.completed_at.toISOString() : null
  }));
}

async function getBucketListItem(itemId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      bli.*,
      u.username as created_by_username
    FROM bucket_list_items bli
    LEFT JOIN users u ON bli.created_by = u.id
    WHERE bli.id = ${itemId}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    created_by: row.created_by,
    created_by_username: row.created_by_username,
    title: row.title,
    description: row.description,
    category: row.category,
    image_url: row.image_url,
    is_completed: row.is_completed,
    created_at: row.created_at.toISOString(),
    completed_at: row.completed_at ? row.completed_at.toISOString() : null
  };
}

async function updateBucketListItem(itemId, userId, updates) {
  await ensureDatabaseInitialized();
  const { title, description, category, image_url, isCompleted } = updates;

  try {
    // Handle isCompleted first since it affects two fields
    if (isCompleted !== undefined) {
      if (isCompleted) {
        await sql`
          UPDATE bucket_list_items
          SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP
          WHERE id = ${itemId}
        `;
      } else {
        await sql`
          UPDATE bucket_list_items
          SET is_completed = FALSE, completed_at = NULL
          WHERE id = ${itemId}
        `;
      }
    }

    // Update other fields if provided
    if (title !== undefined) {
      await sql`
        UPDATE bucket_list_items
        SET title = ${title}
        WHERE id = ${itemId}
      `;
    }

    if (description !== undefined) {
      await sql`
        UPDATE bucket_list_items
        SET description = ${description}
        WHERE id = ${itemId}
      `;
    }

    if (category !== undefined) {
      await sql`
        UPDATE bucket_list_items
        SET category = ${category}
        WHERE id = ${itemId}
      `;
    }

    if (image_url !== undefined) {
      await sql`
        UPDATE bucket_list_items
        SET image_url = ${image_url}
        WHERE id = ${itemId}
      `;
    }
  } catch (error) {
    console.error('Error updating bucket list item:', error);
    throw error;
  }

  return await getBucketListItem(itemId);
}

async function deleteBucketListItem(itemId, userId) {
  await ensureDatabaseInitialized();
  await sql`
    DELETE FROM bucket_list_items
    WHERE id = ${itemId}
  `;
  return true;
}

// Two Truths and a Lie functions
async function createTTLGame(creatorId, receiverId, truth1, truth2, lie) {
  await ensureDatabaseInitialized();
  const result = await sql`
    INSERT INTO ttl_games (creator_id, receiver_id, truth1, truth2, lie)
    VALUES (${creatorId}, ${receiverId}, ${truth1}, ${truth2}, ${lie})
    RETURNING id
  `;
  return result.rows[0].id;
}

async function getPendingTTLGames(receiverId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      tg.*,
      u.username as creator_username
    FROM ttl_games tg
    LEFT JOIN users u ON tg.creator_id = u.id
    WHERE tg.receiver_id = ${receiverId} AND tg.guessed = FALSE
    ORDER BY tg.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    creator_id: row.creator_id,
    creator_username: row.creator_username,
    receiver_id: row.receiver_id,
    truth1: row.truth1,
    truth2: row.truth2,
    lie: row.lie,
    created_at: row.created_at.toISOString(),
    guessed: row.guessed,
    guessed_choice: row.guessed_choice,
    was_correct: row.was_correct
  }));
}

async function getTTLGame(gameId, userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT
      tg.*,
      u.username as creator_username
    FROM ttl_games tg
    LEFT JOIN users u ON tg.creator_id = u.id
    WHERE tg.id = ${gameId} AND tg.receiver_id = ${userId}
    LIMIT 1
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    creator_id: row.creator_id,
    creator_username: row.creator_username,
    receiver_id: row.receiver_id,
    truth1: row.truth1,
    truth2: row.truth2,
    lie: row.lie,
    created_at: row.created_at.toISOString(),
    guessed: row.guessed,
    guessed_choice: row.guessed_choice,
    was_correct: row.was_correct
  };
}

async function submitTTLGuess(gameId, userId, choice) {
  await ensureDatabaseInitialized();

  // Get the game to check if choice is correct
  const game = await getTTLGame(gameId, userId);
  if (!game) {
    throw new Error('Game not found');
  }
  if (game.guessed) {
    throw new Error('Game already guessed');
  }

  const wasCorrect = choice === game.lie;

  // Update the game
  await sql`
    UPDATE ttl_games
    SET guessed = TRUE, guessed_choice = ${choice}, was_correct = ${wasCorrect}
    WHERE id = ${gameId}
  `;

  // Update or create stats
  await sql`
    INSERT INTO ttl_stats (user_id, total_games, correct_guesses)
    VALUES (${userId}, 1, ${wasCorrect ? 1 : 0})
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_games = ttl_stats.total_games + 1,
      correct_guesses = ttl_stats.correct_guesses + ${wasCorrect ? 1 : 0}
  `;

  return {
    wasCorrect,
    realLie: game.lie
  };
}

async function getTTLStats(userId) {
  await ensureDatabaseInitialized();
  const result = await sql`
    SELECT total_games, correct_guesses
    FROM ttl_stats
    WHERE user_id = ${userId}
  `;

  if (result.rows.length === 0) {
    return { total_games: 0, correct_guesses: 0 };
  }

  const row = result.rows[0];
  return {
    total_games: row.total_games || 0,
    correct_guesses: row.correct_guesses || 0
  };
}

export {
  getMessages,
  getThreads,
  getThreadMessages,
  getUnreadMessages,
  getReceivedMessages,
  createMessage,
  markAsRead,
  deleteThread,
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
  deleteCountdownTimer,
  createLoveNote,
  getUnseenLoveNotes,
  markLoveNotesAsSeen,
  getAllLoveNotes,
  archiveLoveNote,
  getArchivedLoveNotes,
  deleteLoveNote,
  createLoveLogPost,
  getLoveLogPosts,
  getLoveLogPostsByUser,
  updateLoveLogPost,
  deleteLoveLogPost,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  createBucketListItem,
  getBucketListItems,
  getBucketListItem,
  updateBucketListItem,
  deleteBucketListItem,
  createTTLGame,
  getPendingTTLGames,
  getTTLGame,
  submitTTLGuess,
  getTTLStats
};
