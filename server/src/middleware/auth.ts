import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../prisma';

export interface AuthUser {
  userId?: string;
  teamId?: string;
  teamCode?: string;
  role: 'ADMIN' | 'PARTICIPANT';
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(payload: AuthUser, expiresIn: string | number = '12h'): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: expiresIn as any });
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;

    // If participant, verify device session & suspension status
    if (decoded.role === 'PARTICIPANT' && decoded.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: decoded.teamId },
        include: {
          deviceSessions: {
            where: { token },
          },
        },
      });

      if (!team) {
        res.status(401).json({ error: 'Team account not found' });
        return;
      }

      if (team.isSuspended) {
        res.status(403).json({
          error: 'Team account is suspended by the Game Master due to violations.',
          isSuspended: true,
        });
        return;
      }

      const session = team.deviceSessions[0];
      if (!session) {
        res.status(401).json({
          error: 'Session invalid or superseded by another device login.',
          concurrentSession: true,
        });
        return;
      }

      if (!session.isApproved) {
        res.status(403).json({
          error: 'This device is awaiting approval from the Game Master.',
          isApproved: false,
          deviceId: session.deviceId,
        });
        return;
      }

      // Update last active
      await prisma.deviceSession.update({
        where: { id: session.id },
        data: { lastActive: new Date() },
      });
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}

export function requireTeam(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'PARTICIPANT' || !req.user.teamId) {
    res.status(403).json({ error: 'Team access required' });
    return;
  }
  next();
}
