import { hashPassword, generateToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Set timeout for the request
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Request timeout',
        message: 'The operation is taking too long. Please try again.'
      });
    }
  }, 30000); // 30 second timeout

  try {
    // Check JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      clearTimeout(timeout);
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({
        error: 'Server configuration error. Please contact support.',
        code: 'JWT_SECRET_MISSING'
      });
    }

    console.log('Checking if username exists...');
    // Check if username already exists
    const existingUser = await mailbox.getUserByUsername(username);

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    console.log('Hashing password...');
    // Hash password
    const hashedPassword = await hashPassword(password);

    console.log('Creating user...');
    // Create user
    const user = await mailbox.createUser(username, hashedPassword);

    console.log('Generating token...');
    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      is_admin: user.is_admin || false,
    });

    clearTimeout(timeout);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin || false,
      },
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    res.status(500).json({
      error: error.message || 'Internal server error',
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
