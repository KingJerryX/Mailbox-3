import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
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
    if (req.method === 'POST') {
      const { image_data, image_url } = req.body;

      if (!image_data && !image_url) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Validate that image_data is JPG (base64 starts with /9j/ for JPEG)
      if (image_data && !image_data.startsWith('/9j/')) {
        return res.status(400).json({ error: 'Only JPG files are allowed for mailbox design' });
      }

      const design = await mailbox.saveMailboxDesign(
        user.id,
        image_url || `data:image/jpeg;base64,${image_data}`,
        image_data
      );

      return res.status(200).json({
        success: true,
        design: design
      });
    }

    if (req.method === 'GET') {
      const design = await mailbox.getMailboxDesign(user.id);
      return res.status(200).json({ design });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
