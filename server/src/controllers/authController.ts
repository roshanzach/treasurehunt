import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { generateToken, AuthUser } from '../middleware/auth';
import { socketEvents } from '../sockets/huntSocket';

export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.role !== 'ADMIN') {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    const payload: AuthUser = {
      userId: user.id,
      role: 'ADMIN',
    };
    const token = generateToken(payload);

    res.json({
      message: 'Admin authenticated successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function teamLogin(req: Request, res: Response): Promise<void> {
  try {
    const { teamCode, password, deviceId, deviceInfo } = req.body;

    if (!teamCode || !password) {
      res.status(400).json({ error: 'Team code and password are required' });
      return;
    }

    if (!deviceId) {
      res.status(400).json({ error: 'Device identifier is required' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { teamCode: teamCode.trim().toUpperCase() },
      include: {
        deviceSessions: true,
      },
    });

    if (!team) {
      res.status(401).json({ error: 'Invalid team code or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, team.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid team code or password' });
      return;
    }

    if (team.isSuspended) {
      res.status(403).json({
        error: 'Team has been suspended by the Game Master.',
        isSuspended: true,
      });
      return;
    }

    // Check game settings for auto approval
    const settings = await prisma.gameSettings.findUnique({
      where: { id: 'default' },
    });
    const autoApprove = settings?.autoApproveDevice || false;

    // Check if this device already has an approved session
    const existingDeviceSession = team.deviceSessions.find(
      (s) => s.deviceId === deviceId
    );

    // Look for any active sessions on other devices
    const otherDeviceSessions = team.deviceSessions.filter(
      (s) => s.deviceId !== deviceId
    );

    let isApproved = false;
    let sessionToken: string = '';

    const ip =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    if (existingDeviceSession) {
      isApproved = existingDeviceSession.isApproved || autoApprove;
      const payload: AuthUser = {
        teamId: team.id,
        teamCode: team.teamCode,
        role: 'PARTICIPANT',
        deviceId,
      };
      sessionToken = generateToken(payload);

      await prisma.deviceSession.update({
        where: { id: existingDeviceSession.id },
        data: {
          token: sessionToken,
          deviceInfo: deviceInfo || existingDeviceSession.deviceInfo,
          ipAddress: ip,
          lastActive: new Date(),
          isApproved: isApproved,
          approvedAt: isApproved ? existingDeviceSession.approvedAt || new Date() : null,
        },
      });
    } else {
      // New device: create new session
      isApproved = autoApprove;
      const payload: AuthUser = {
        teamId: team.id,
        teamCode: team.teamCode,
        role: 'PARTICIPANT',
        deviceId,
      };
      sessionToken = generateToken(payload);

      // Invalidate other devices if single device is strictly enforced
      if (otherDeviceSessions.length > 0) {
        // Log concurrent device attempt
        await prisma.securityLog.create({
          data: {
            teamId: team.id,
            eventType: 'CONCURRENT_DEVICE',
            severity: 'HIGH',
            details: `Login attempt on new device: ${deviceInfo || 'Unknown'} (IP: ${ip}) while existing session exists.`,
          },
        });
      }

      await prisma.deviceSession.create({
        data: {
          teamId: team.id,
          deviceId,
          deviceInfo: deviceInfo || 'Unknown Device',
          ipAddress: ip,
          token: sessionToken,
          isApproved,
          approvedAt: isApproved ? new Date() : null,
        },
      });
    }

    if (!isApproved) {
      // Notify Admin in real-time
      socketEvents.notifyAdminNewDevice({
        teamId: team.id,
        teamName: team.teamName,
        deviceId,
        deviceInfo: deviceInfo || 'Browser Device',
        ipAddress: ip,
      });

      res.status(200).json({
        message: 'Login successful. Waiting for Admin device approval.',
        status: 'PENDING_APPROVAL',
        isApproved: false,
        deviceId,
        team: {
          id: team.id,
          teamName: team.teamName,
          teamCode: team.teamCode,
        },
        token: sessionToken,
      });
      return;
    }

    res.json({
      message: 'Login successful and device approved',
      status: 'APPROVED',
      isApproved: true,
      token: sessionToken,
      team: {
        id: team.id,
        teamName: team.teamName,
        teamCode: team.teamCode,
        currentLevel: team.currentLevel,
        isCompleted: team.isCompleted,
      },
    });
  } catch (error) {
    console.error('Team login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user.role === 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, username: true, role: true, createdAt: true },
      });
      res.json({ role: 'ADMIN', user });
      return;
    }

    if (req.user.role === 'PARTICIPANT' && req.user.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: req.user.teamId },
        include: {
          deviceSessions: {
            where: { deviceId: req.user.deviceId },
          },
          unlockedKeys: {
            include: {
              question: {
                select: {
                  level: true,
                  accessKey: true,
                  locationHintType: true,
                  locationHintContent: true,
                  locationHintMediaUrl: true,
                },
              },
            },
          },
        },
      });

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      const session = team.deviceSessions[0];

      res.json({
        role: 'PARTICIPANT',
        team: {
          id: team.id,
          teamName: team.teamName,
          teamCode: team.teamCode,
          currentLevel: team.currentLevel,
          isCompleted: team.isCompleted,
          isSuspended: team.isSuspended,
          status: team.status,
          isApproved: session ? session.isApproved : false,
          unlockedInventory: team.unlockedKeys.map((k) => ({
            level: k.question.level,
            accessKey: k.question.accessKey,
            locationHintType: k.question.locationHintType,
            locationHintContent: k.question.locationHintContent,
            locationHintMediaUrl: k.question.locationHintMediaUrl,
            unlockedAt: k.unlockedAt,
          })),
        },
      });
      return;
    }

    res.status(401).json({ error: 'Invalid session' });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
