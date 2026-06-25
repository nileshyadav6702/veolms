import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt.service';
import { Session } from '../models/Session';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  } else if (req.params.token) {
    token = req.params.token;
  } else if (req.params[0]) {
    // Wildcard path authentication fallback: check if first segment is token
    const firstSegment = req.params[0].split('/')[0];
    const isToken = !firstSegment.endsWith('.m3u8') && 
                    !firstSegment.endsWith('.ts') && 
                    !firstSegment.endsWith('.vtt') && 
                    !firstSegment.startsWith('stream_');
    if (isToken) {
      token = firstSegment;
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  try {
    const payload = verifyToken(token);
    
    // Stateful check: verify session exists in DB
    const session = await Session.findById(payload.sessionId);
    if (!session) {
      res.status(401).json({ success: false, message: 'Session expired or revoked' });
      return;
    }
    
    // Update session's lastActive timestamp, throttled to once per minute
    const now = new Date();
    if (now.getTime() - session.lastActive.getTime() > 60 * 1000) {
      session.lastActive = now;
      session.save().catch(err => console.error('Failed to update session lastActive:', err));
    }

    req.user = { 
      id: payload.id, 
      email: payload.email, 
      role: payload.role,
      sessionId: payload.sessionId 
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

