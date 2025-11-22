import { getDB } from './db.js';

// Initialize database
async function initDB() {
  const db = await getDB();
  if (!db.data) {
    db.data = { users: [], messages: [], mailboxDesigns: [] };
    await db.write();
  } else {
    if (!db.data.messages) db.data.messages = [];
    if (!db.data.mailboxDesigns) db.data.mailboxDesigns = [];
  }
  return db;
}

// Get all messages for a user (both sent and received)
async function getMessages(userId) {
  const db = await initDB();
  const messages = db.data.messages || [];
  return messages.filter(msg =>
    msg.sender_id === userId || msg.recipient_id === userId
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// Get unread messages for a user
async function getUnreadMessages(userId) {
  const db = await initDB();
  const messages = db.data.messages || [];
  return messages.filter(msg =>
    msg.recipient_id === userId && !msg.read
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// Get messages received by a user
async function getReceivedMessages(userId) {
  const db = await initDB();
  const messages = db.data.messages || [];
  return messages.filter(msg =>
    msg.recipient_id === userId
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// Create a new message
async function createMessage(senderId, recipientId, content, imageUrl = null) {
  const db = await initDB();
  const messages = db.data.messages || [];
  const maxId = messages.length > 0
    ? Math.max(...messages.map(m => m.id))
    : 0;

  const newMessage = {
    id: maxId + 1,
    sender_id: senderId,
    recipient_id: recipientId,
    content: content,
    image_url: imageUrl,
    read: false,
    created_at: new Date().toISOString()
  };

  messages.push(newMessage);
  db.data.messages = messages;
  await db.write();

  return newMessage;
}

// Mark message as read
async function markAsRead(messageId, userId) {
  const db = await initDB();
  const messages = db.data.messages || [];
  const message = messages.find(m => m.id === messageId && m.recipient_id === userId);
  if (message) {
    message.read = true;
    db.data.messages = messages;
    await db.write();
  }
  return message;
}

// Get or create mailbox design for a user
async function getMailboxDesign(userId) {
  const db = await initDB();
  const designs = db.data.mailboxDesigns || [];
  return designs.find(d => d.user_id === userId) || null;
}

// Save mailbox design for a user
async function saveMailboxDesign(userId, imageUrl, imageData = null) {
  const db = await initDB();
  const designs = db.data.mailboxDesigns || [];
  const existingIndex = designs.findIndex(d => d.user_id === userId);

  const design = {
    user_id: userId,
    image_url: imageUrl,
    image_data: imageData,
    updated_at: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    designs[existingIndex] = design;
  } else {
    designs.push(design);
  }

  db.data.mailboxDesigns = designs;
  await db.write();

  return design;
}

// Get all users (for selecting recipient)
async function getAllUsers(excludeUserId = null) {
  const db = await initDB();
  let users = db.data.users || [];
  if (excludeUserId) {
    users = users.filter(u => u.id !== excludeUserId);
  }

  return users.map(u => ({
    id: u.id,
    username: u.username
  }));
}

// User management functions
async function createUser(username, password) {
  const db = await initDB();
  const users = db.data.users || [];

  // Check if username already exists
  if (users.find(u => u.username === username)) {
    throw new Error('Username already exists');
  }

  const maxId = users.length > 0
    ? Math.max(...users.map(u => u.id))
    : 0;

  const newUser = {
    id: maxId + 1,
    username: username,
    password: password, // This will be hashed before calling
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  db.data.users = users;
  await db.write();

  return newUser;
}

async function getUserByUsername(username) {
  const db = await initDB();
  const users = db.data.users || [];
  return users.find(u => u.username === username) || null;
}

async function getUserById(id) {
  const db = await initDB();
  const users = db.data.users || [];
  return users.find(u => u.id === id) || null;
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
  getUserById
};
