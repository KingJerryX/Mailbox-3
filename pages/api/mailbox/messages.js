import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    if (req.method === 'GET') {
      const messages = await mailbox.getReceivedMessages(user.id);
      const users = await mailbox.getAllUsers();
      const messagesWithSenders = messages.map(msg => {
        const sender = users.find(u => u.id === msg.sender_id);
        return {
          ...msg,
          sender_username: sender ? sender.username : 'Unknown'
        };
      });

      return res.status(200).json({ messages: messagesWithSenders });
    }

    if (req.method === 'POST') {
      const { recipient_id, content, image_url } = req.body;

      if (!recipient_id || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const message = await mailbox.createMessage(
        user.id,
        recipient_id,
        content,
        image_url
      );

      return res.status(201).json({ message });
    }

    if (req.method === 'PUT') {
      const { message_id } = req.body;
      if (!message_id) {
        return res.status(400).json({ error: 'Missing message_id' });
      }

      const message = await mailbox.markAsRead(message_id, user.id);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      return res.status(200).json({ message });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Mailbox API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
