import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS');
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

  const { id } = req.query;
  const itemId = parseInt(id);

  if (isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  try {
    if (req.method === 'PATCH') {
      const { title, description, category, imageUrl, isCompleted } = req.body;

      const item = await mailbox.updateBucketListItem(itemId, user.id, {
        title,
        description,
        category,
        image_url: imageUrl,
        isCompleted
      });

      return res.status(200).json({ item });
    }

    if (req.method === 'DELETE') {
      await mailbox.deleteBucketListItem(itemId, user.id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Bucket list item API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
