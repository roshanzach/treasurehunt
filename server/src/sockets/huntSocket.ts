import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser } from '../middleware/auth';

let io: Server | null = null;

export function initSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigin === '*' ? true : [config.clientOrigin],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(); // Allow unauthenticated connection for public leaderboard
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthUser | undefined;

    if (user?.role === 'ADMIN') {
      socket.join('admin-room');
    } else if (user?.role === 'PARTICIPANT' && user.teamId) {
      socket.join(`team-${user.teamId}`);
      socket.join('teams-room');
    }

    // Public room for real-time leaderboard
    socket.join('public-leaderboard');

    socket.on('disconnect', () => {
      // Clean up if needed
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}

// Helper broadcast functions
export const socketEvents = {
  notifyAdminNewDevice: (data: {
    teamId: string;
    teamName: string;
    deviceId: string;
    deviceInfo: string;
    ipAddress?: string;
  }) => {
    if (io) {
      io.to('admin-room').emit('device:pending', data);
    }
  },

  notifyDeviceApproval: (
    teamId: string,
    data: { approved: boolean; message: string }
  ) => {
    if (io) {
      io.to(`team-${teamId}`).emit('device:status', data);
    }
  },

  notifyAdminCheatAlert: (data: {
    teamId: string;
    teamName: string;
    eventType: string;
    severity: string;
    details?: string;
    violationCount: number;
    timestamp: Date;
  }) => {
    if (io) {
      io.to('admin-room').emit('cheat:alert', data);
    }
  },

  sendAdminWarningToTeam: (
    teamId: string,
    message: string
  ) => {
    if (io) {
      io.to(`team-${teamId}`).emit('admin:warning', { message });
    }
  },

  notifyTeamSuspension: (teamId: string, isSuspended: boolean) => {
    if (io) {
      io.to(`team-${teamId}`).emit('team:suspended', { isSuspended });
    }
  },

  broadcastLeaderboardUpdate: (data: {
    teamId: string;
    teamName: string;
    currentLevel: number;
    isCompleted: boolean;
  }) => {
    if (io) {
      io.to('admin-room').emit('leaderboard:admin_update', data);
      io.to('public-leaderboard').emit('leaderboard:update', data);
    }
  },
};
