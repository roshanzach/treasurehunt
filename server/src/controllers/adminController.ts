import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { socketEvents } from '../sockets/huntSocket';
import { getTeamRoute, PREDEFINED_ROUTES } from '../utils/routePlanner';

export async function getTeams(req: Request, res: Response): Promise<void> {
  try {
    const teams = await prisma.team.findMany({
      include: {
        deviceSessions: {
          orderBy: { lastActive: 'desc' },
        },
        _count: {
          select: {
            submissions: true,
            securityLogs: true,
          },
        },
      },
      orderBy: [{ currentLevel: 'desc' }, { completedAt: 'asc' }],
    });

    const questions = await prisma.question.findMany({
      select: { level: true, locationName: true, title: true },
    });

    const questionMap = new Map(questions.map((q) => [q.level, q.locationName || q.title]));
    const safeTotal = questions.length > 0 ? questions.length : 10;

    const enrichedTeams = teams.map((t) => {
      const route = getTeamRoute(t, safeTotal);
      const activeStep = Math.min(t.currentLevel, safeTotal);
      const currentStation = route[activeStep - 1] || activeStep;
      return {
        ...t,
        routeSequence: route,
        startLocationName: questionMap.get(route[0]) || `Station ${route[0]}`,
        currentStationLevel: currentStation,
        currentStationName: questionMap.get(currentStation) || `Station ${currentStation}`,
      };
    });

    res.json({ teams: enrichedTeams, predefinedRoutes: PREDEFINED_ROUTES });
  } catch (error) {
    console.error('getTeams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
}

export async function createTeam(req: Request, res: Response): Promise<void> {
  try {
    const { teamName, teamCode, password, startLevel, customRoute } = req.body;

    if (!teamName || !teamCode || !password) {
      res.status(400).json({ error: 'Team name, code, and password are required' });
      return;
    }

    const cleanCode = teamCode.trim().toUpperCase();

    const existingName = await prisma.team.findUnique({
      where: { teamName: teamName.trim() },
    });
    if (existingName) {
      res.status(400).json({ error: 'A team with this name already exists' });
      return;
    }

    const existingCode = await prisma.team.findUnique({
      where: { teamCode: cleanCode },
    });
    if (existingCode) {
      res.status(400).json({ error: 'A team with this team code already exists' });
      return;
    }

    let assignedStart = startLevel ? parseInt(String(startLevel), 10) : 1;
    if (!startLevel) {
      // Auto balance among 16 unique route patterns
      const teamCount = await prisma.team.count();
      assignedStart = (teamCount % 16) + 1;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const team = await prisma.team.create({
      data: {
        teamName: teamName.trim(),
        teamCode: cleanCode,
        passwordHash,
        startLevel: assignedStart,
        customRoute: customRoute && typeof customRoute === 'string' ? customRoute.trim() : null,
        currentLevel: 1,
        status: 'PENDING_APPROVAL',
      },
    });

    res.status(201).json({
      message: 'Team registered successfully',
      team: {
        id: team.id,
        teamName: team.teamName,
        teamCode: team.teamCode,
        startLevel: team.startLevel,
        customRoute: team.customRoute,
        status: team.status,
      },
    });
  } catch (error) {
    console.error('createTeam error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
}

export async function updateTeam(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { teamName, teamCode, startLevel, customRoute } = req.body;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const dataToUpdate: any = {};
    if (teamName && teamName.trim()) dataToUpdate.teamName = teamName.trim();
    if (teamCode && teamCode.trim()) dataToUpdate.teamCode = teamCode.trim().toUpperCase();
    if (startLevel !== undefined) dataToUpdate.startLevel = parseInt(String(startLevel), 10);
    if (customRoute !== undefined) dataToUpdate.customRoute = customRoute ? String(customRoute).trim() : null;

    const updated = await prisma.team.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json({ message: 'Team route and details updated successfully', team: updated });
  } catch (error) {
    console.error('updateTeam error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
}

export async function deleteTeam(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    await prisma.team.delete({
      where: { id },
    });
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('deleteTeam error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
}

export async function toggleSuspendTeam(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const updated = await prisma.team.update({
      where: { id },
      data: {
        isSuspended: !team.isSuspended,
        status: !team.isSuspended ? 'SUSPENDED' : 'PLAYING',
      },
    });

    // Notify team via socket
    socketEvents.notifyTeamSuspension(team.id, updated.isSuspended);

    res.json({
      message: `Team ${updated.isSuspended ? 'suspended' : 'unsuspended'} successfully`,
      team: updated,
    });
  } catch (error) {
    console.error('toggleSuspendTeam error:', error);
    res.status(500).json({ error: 'Failed to update team suspension status' });
  }
}

export async function resetTeamProgress(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    await prisma.$transaction([
      prisma.submission.deleteMany({ where: { teamId: id } }),
      prisma.unlockedKey.deleteMany({ where: { teamId: id } }),
      prisma.team.update({
        where: { id },
        data: {
          currentLevel: 1,
          isCompleted: false,
          completedAt: null,
          totalAttempts: 0,
          status: 'PLAYING',
        },
      }),
    ]);

    res.json({ message: 'Team progress reset to Level 1' });
  } catch (error) {
    console.error('resetTeamProgress error:', error);
    res.status(500).json({ error: 'Failed to reset team progress' });
  }
}

export async function changeTeamPassword(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.team.update({
      where: { id },
      data: { passwordHash },
    });

    res.json({ message: 'Team password updated successfully' });
  } catch (error) {
    console.error('changeTeamPassword error:', error);
    res.status(500).json({ error: 'Failed to update team password' });
  }
}

export async function getDeviceSessions(req: Request, res: Response): Promise<void> {
  try {
    const sessions = await prisma.deviceSession.findMany({
      include: {
        team: {
          select: {
            id: true,
            teamName: true,
            teamCode: true,
            currentLevel: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ sessions });
  } catch (error) {
    console.error('getDeviceSessions error:', error);
    res.status(500).json({ error: 'Failed to fetch device sessions' });
  }
}

export async function approveDevice(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = String(req.params.sessionId);

    const session = await prisma.deviceSession.findUnique({
      where: { id: sessionId },
      include: { team: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Device session not found' });
      return;
    }

    // Single device policy: Disapprove any other device sessions for this team
    await prisma.deviceSession.updateMany({
      where: {
        teamId: session.teamId,
        id: { not: sessionId },
      },
      data: { isApproved: false },
    });

    const updatedSession = await prisma.deviceSession.update({
      where: { id: sessionId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
      },
    });

    await prisma.team.update({
      where: { id: session.teamId },
      data: { status: 'APPROVED' },
    });

    // Push instant WebSocket unlock to the team
    socketEvents.notifyDeviceApproval(session.teamId, {
      approved: true,
      message: 'Your device has been approved by the Game Master! Good luck!',
    });

    res.json({
      message: 'Device approved successfully',
      session: updatedSession,
    });
  } catch (error) {
    console.error('approveDevice error:', error);
    res.status(500).json({ error: 'Failed to approve device' });
  }
}

export async function revokeDevice(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = String(req.params.sessionId);

    const session = await prisma.deviceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Device session not found' });
      return;
    }

    await prisma.deviceSession.delete({
      where: { id: sessionId },
    });

    socketEvents.notifyDeviceApproval(session.teamId, {
      approved: false,
      message: 'Your device access has been revoked by the Game Master.',
    });

    res.json({ message: 'Device session revoked' });
  } catch (error) {
    console.error('revokeDevice error:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
}

export async function getSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const { teamId, questionId } = req.query;

    const where: any = {};
    if (teamId) where.teamId = String(teamId);
    if (questionId) where.questionId = String(questionId);

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            teamName: true,
            teamCode: true,
          },
        },
        question: {
          select: {
            id: true,
            level: true,
            title: true,
            correctAnswer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ submissions });
  } catch (error) {
    console.error('getSubmissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

export async function getSecurityLogs(req: Request, res: Response): Promise<void> {
  try {
    const logs = await prisma.securityLog.findMany({
      include: {
        team: {
          select: {
            id: true,
            teamName: true,
            teamCode: true,
            isSuspended: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ logs });
  } catch (error) {
    console.error('getSecurityLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch security logs' });
  }
}

export async function sendWarningToTeam(req: Request, res: Response): Promise<void> {
  try {
    const { teamId, message } = req.body;

    if (!teamId || !message) {
      res.status(400).json({ error: 'teamId and message are required' });
      return;
    }

    socketEvents.sendAdminWarningToTeam(teamId, message);

    await prisma.securityLog.create({
      data: {
        teamId,
        eventType: 'ADMIN_WARNING',
        severity: 'MEDIUM',
        details: `Direct warning sent to team: "${message}"`,
      },
    });

    res.json({ message: 'Warning dispatched to team screen successfully' });
  } catch (error) {
    console.error('sendWarningToTeam error:', error);
    res.status(500).json({ error: 'Failed to send warning' });
  }
}

export async function getAdminLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const teams = await prisma.team.findMany({
      include: {
        submissions: {
          where: { isCorrect: true },
          orderBy: { createdAt: 'asc' },
          include: {
            question: { select: { level: true, title: true } },
          },
        },
        _count: {
          select: {
            securityLogs: true,
            submissions: true,
          },
        },
      },
      orderBy: [
        { isCompleted: 'desc' },
        { currentLevel: 'desc' },
        { completedAt: 'asc' },
        { updatedAt: 'asc' },
      ],
    });

    const leaderboard = teams.map((team, index) => {
      return {
        rank: index + 1,
        teamId: team.id,
        teamName: team.teamName,
        teamCode: team.teamCode,
        currentLevel: team.currentLevel,
        isCompleted: team.isCompleted,
        completedAt: team.completedAt,
        totalAttempts: team.totalAttempts,
        totalViolations: team._count.securityLogs,
        status: team.status,
        isSuspended: team.isSuspended,
        solvedQuestions: team.submissions.map((s) => ({
          level: s.question.level,
          title: s.question.title,
          solvedAt: s.createdAt,
        })),
      };
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error('getAdminLeaderboard error:', error);
    res.status(500).json({ error: 'Failed to generate admin leaderboard' });
  }
}

export async function getPublicLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    // Participant view: NO raw points/scores visible, only ranks, team names, progress status & timestamp
    const teams = await prisma.team.findMany({
      where: {
        isSuspended: false,
      },
      select: {
        id: true,
        teamName: true,
        currentLevel: true,
        isCompleted: true,
        completedAt: true,
        updatedAt: true,
      },
      orderBy: [
        { isCompleted: 'desc' },
        { currentLevel: 'desc' },
        { completedAt: 'asc' },
        { updatedAt: 'asc' },
      ],
    });

    const totalQuestions = await prisma.question.count({
      where: { isActive: true },
    });

    const leaderboard = teams.map((team, index) => ({
      rank: index + 1,
      teamName: team.teamName,
      stagesCompleted: team.isCompleted ? totalQuestions : Math.max(0, team.currentLevel - 1),
      isCompleted: team.isCompleted,
      completedAt: team.completedAt,
      lastActive: team.updatedAt,
    }));

    res.json({ leaderboard, totalStages: totalQuestions });
  } catch (error) {
    console.error('getPublicLeaderboard error:', error);
    res.status(500).json({ error: 'Failed to generate public leaderboard' });
  }
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    let settings = await prisma.gameSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.gameSettings.create({
        data: { id: 'default' },
      });
    }

    res.json({ settings });
  } catch (error) {
    console.error('getSettings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const { huntTitle, huntDescription, isHuntActive, requireFullscreen, autoApproveDevice } =
      req.body;

    const settings = await prisma.gameSettings.upsert({
      where: { id: 'default' },
      update: {
        huntTitle: huntTitle !== undefined ? huntTitle : undefined,
        huntDescription: huntDescription !== undefined ? huntDescription : undefined,
        isHuntActive: isHuntActive !== undefined ? isHuntActive : undefined,
        requireFullscreen: requireFullscreen !== undefined ? requireFullscreen : undefined,
        autoApproveDevice: autoApproveDevice !== undefined ? autoApproveDevice : undefined,
      },
      create: {
        id: 'default',
        huntTitle: huntTitle || 'Grand Treasure Hunt',
        huntDescription: huntDescription || '',
        isHuntActive: isHuntActive ?? true,
        requireFullscreen: requireFullscreen ?? false,
        autoApproveDevice: autoApproveDevice ?? false,
      },
    });

    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    console.error('updateSettings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}
