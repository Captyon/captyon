import { Request, Response, NextFunction } from 'express';

/**
 * Simple API key middleware.
 * If process.env.API_KEY is unset/empty, the middleware is a no-op (allows requests).
 * Otherwise it requires either:
 * - Authorization: Bearer <key>
 * - x-api-key: <key>
 */
export default function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.API_KEY || '';
  if (!expected) return next();

  const auth = (req.get('authorization') || req.get('x-api-key') || '') as string;
  if (!auth) return res.status(401).json({ error: 'Missing API key' });

  // Accept "Bearer <key>" or raw key in x-api-key
  const parts = auth.split(' ');
  const provided = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : auth;
  if (provided !== expected) return res.status(403).json({ error: 'Invalid API key' });

  next();
}
