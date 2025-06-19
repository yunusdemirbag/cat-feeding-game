import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Cat Feeding Game API is running',
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
} 