import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GameState {
  score: number;
  level: number;
  catsCollected: string[];
  lastPlayed: string;
}

// Bu basit bir in-memory storage örneği
// Gerçek uygulamada database kullanılmalı
let gameStates: { [key: string]: GameState } = {};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const { playerId } = req.query;

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ message: 'Player ID is required' });
  }

  switch (method) {
    case 'GET':
      const gameState = gameStates[playerId] || {
        score: 0,
        level: 1,
        catsCollected: [],
        lastPlayed: new Date().toISOString()
      };
      return res.status(200).json(gameState);

    case 'POST':
      const { score, level, catsCollected } = req.body;
      gameStates[playerId] = {
        score: score || 0,
        level: level || 1,
        catsCollected: catsCollected || [],
        lastPlayed: new Date().toISOString()
      };
      return res.status(200).json(gameStates[playerId]);

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
} 