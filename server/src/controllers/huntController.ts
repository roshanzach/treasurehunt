import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { validateAnswer } from '../utils/answerValidator';
import { socketEvents } from '../sockets/huntSocket';
import {
  getTargetStationForStep,
  isStationAlreadySolved,
  getTeamRoute,
} from '../utils/routePlanner';
import { DECOY_CHECKPOINTS, MALAYALAM_TROLL_QUOTE, CGPA_TROLL_QUOTE } from './questionController';

export async function getHuntStatus(req: Request, res: Response): Promise<void> {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(401).json({ error: 'Team authentication required' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        unlockedKeys: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const totalQuestions = await prisma.question.count({
      where: { isActive: true },
    });

    const safeTotal = totalQuestions > 0 ? totalQuestions : 10;
    const currentStep = Math.min(team.currentLevel, safeTotal);
    const targetLevel = getTargetStationForStep(team, currentStep, safeTotal);

    // Fetch target question for current step
    const targetQuestion = await prisma.question.findUnique({
      where: { level: targetLevel },
    });

    const settings = await prisma.gameSettings.findUnique({
      where: { id: 'default' },
    });

    res.json({
      team: {
        id: team.id,
        teamName: team.teamName,
        teamCode: team.teamCode,
        startLevel: team.startLevel,
        currentLevel: team.currentLevel,
        isCompleted: team.isCompleted,
        completedAt: team.completedAt,
        isSuspended: team.isSuspended,
        status: team.status,
      },
      hunt: {
        title: settings?.huntTitle || 'The Sovereign Odyssey',
        description: settings?.huntDescription || '',
        isHuntActive: settings?.isHuntActive ?? true,
        totalQuestions: safeTotal,
      },
      activeCheckpoint: {
        step: currentStep,
        totalSteps: safeTotal,
        targetLevel,
        title: targetQuestion?.title || `Station ${currentStep}`,
        locationHintType: targetQuestion?.locationHintType || 'TEXT',
        locationHintContent: targetQuestion?.locationHintContent || '',
        locationHintMediaUrl: targetQuestion?.locationHintMediaUrl || null,
        accessKey: targetQuestion?.accessKey || '',
        isStartingPoint: currentStep === 1,
      },
    });
  } catch (error) {
    console.error('getHuntStatus error:', error);
    res.status(500).json({ error: 'Failed to retrieve hunt status' });
  }
}

export async function accessQuestion(req: Request, res: Response): Promise<void> {
  try {
    const teamId = req.user?.teamId;
    const { qrIdentifier, accessKey } = req.body;

    if (!teamId) {
      res.status(401).json({ error: 'Team authentication required' });
      return;
    }

    if (!qrIdentifier) {
      res.status(400).json({ error: 'QR code identifier required' });
      return;
    }

    let cleanQR = String(qrIdentifier || '').trim();
    if (cleanQR.startsWith('http://') || cleanQR.startsWith('https://') || cleanQR.includes('?') || cleanQR.includes('/')) {
      try {
        const parsed = new URL(cleanQR.startsWith('http') ? cleanQR : `http://dummy.com/${cleanQR}`);
        cleanQR = parsed.searchParams.get('qr') || parsed.searchParams.get('code') || cleanQR;
      } catch (e) {
        const match = cleanQR.match(/[?&](qr|code)=([^&#]+)/i);
        if (match && match[2]) {
          cleanQR = decodeURIComponent(match[2]);
        }
      }
    }
    const normalizedQR = cleanQR.trim().toUpperCase();

    // Intercept Decoy / Fake Trap QR
    const isDecoy =
      normalizedQR.includes('DECOY') ||
      normalizedQR.includes('FAKE') ||
      normalizedQR.includes('TRAP') ||
      normalizedQR.includes('CGPA') ||
      DECOY_CHECKPOINTS.some((d) => d.code.toUpperCase() === normalizedQR || normalizedQR.includes(d.code.toUpperCase()));

    if (isDecoy) {
      // Log troll telemetry
      try {
        await prisma.securityLog.create({
          data: {
            teamId,
            eventType: 'FAKE_QR_SCANNED',
            severity: 'LOW',
            details: `Team scanned decoy checkpoint trap: "${cleanQR}"`,
          },
        });
      } catch (logErr) {
        console.warn('Failed to log fake QR scan:', logErr);
      }

      const matchingDecoy = DECOY_CHECKPOINTS.find(
        (d) => d.code.toUpperCase() === normalizedQR || normalizedQR.includes(d.code.toUpperCase())
      );
      const quote = matchingDecoy?.trollQuote ||
        (normalizedQR.includes('CGPA') ? CGPA_TROLL_QUOTE : MALAYALAM_TROLL_QUOTE);

      res.json({
        status: 'FAKE_QR',
        isFake: true,
        trollImage: '/fake-qr-troll.jpg',
        trollQuote: quote,
      });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (team.isSuspended) {
      res.status(403).json({
        error: 'Team is suspended. Contact the Game Master.',
        isSuspended: true,
      });
      return;
    }

    const question = await prisma.question.findUnique({
      where: { qrIdentifier },
    });

    if (!question || !question.isActive) {
      res.status(404).json({ error: 'Invalid or inactive QR code checkpoint.' });
      return;
    }

    const totalQuestions = await prisma.question.count({
      where: { isActive: true },
    });
    const safeTotal = totalQuestions > 0 ? totalQuestions : 10;

    // Determine what question this team should be at right now
    const currentStep = team.currentLevel;
    const currentTargetLevel = getTargetStationForStep(team, currentStep, safeTotal);

    // Check if the scanned question is the current target question
    if (question.level !== currentTargetLevel) {
      // Check if this question was already solved in a previous step of this team's route
      const wasAlreadySolved = isStationAlreadySolved(team, question.level, currentStep, safeTotal);

      if (wasAlreadySolved) {
        res.json({
          status: 'ALREADY_SOLVED',
          question: {
            id: question.id,
            level: question.level,
            title: question.title,
            questionType: question.questionType,
            questionContent: question.questionContent,
            questionMediaUrl: question.questionMediaUrl,
          },
          locationHint: {
            type: question.locationHintType,
            content: question.locationHintContent,
            mediaUrl: question.locationHintMediaUrl,
          },
          accessKey: question.accessKey,
        });
        return;
      }

      // If scanned a future or different checkpoint (DO NOT leak direct location names)
      res.status(403).json({
        error: `This QR badge belongs to another station on campus. Your team's active mission is Station ${currentStep} of ${safeTotal}. Decipher your active location riddle to find your correct station!`,
        currentStep,
      });
      return;
    }

    // Question is at team's current step!
    // Check if already unlocked
    const alreadyUnlocked = await prisma.unlockedKey.findUnique({
      where: {
        teamId_questionId: {
          teamId: team.id,
          questionId: question.id,
        },
      },
    });

    if (alreadyUnlocked) {
      res.json({
        status: 'QUESTION_UNLOCKED',
        question: {
          id: question.id,
          level: question.level,
          title: question.title,
          questionType: question.questionType,
          questionContent: question.questionContent,
          questionMediaUrl: question.questionMediaUrl,
        },
      });
      return;
    }

    // Access key required
    if (!accessKey) {
      res.status(403).json({
        status: 'KEY_REQUIRED',
        error: `Station ${currentStep} requires a valid 6-character access key.`,
        level: question.level,
      });
      return;
    }

    // Validate 6-character access key
    const normalizedKey = accessKey.trim().toUpperCase();
    if (normalizedKey !== question.accessKey.toUpperCase()) {
      await prisma.securityLog.create({
        data: {
          teamId: team.id,
          eventType: 'FAILED_ACCESS_KEY',
          severity: 'LOW',
          details: `Invalid key attempt '${normalizedKey}' for Station ${currentStep}`,
        },
      });

      res.status(400).json({
        status: 'INVALID_KEY',
        error: 'Invalid access key. Check your active station briefing or clue notebook.',
      });
      return;
    }

    // Valid key! Record unlock
    await prisma.unlockedKey.create({
      data: {
        teamId: team.id,
        questionId: question.id,
      },
    });

    res.json({
      status: 'QUESTION_UNLOCKED',
      message: 'Access key verified successfully!',
      question: {
        id: question.id,
        level: question.level,
        title: question.title,
        questionType: question.questionType,
        questionContent: question.questionContent,
        questionMediaUrl: question.questionMediaUrl,
      },
    });
  } catch (error) {
    console.error('accessQuestion error:', error);
    res.status(500).json({ error: 'Failed to access question' });
  }
}

export async function submitAnswer(req: Request, res: Response): Promise<void> {
  try {
    const teamId = req.user?.teamId;
    const { questionId, answer } = req.body;

    if (!teamId) {
      res.status(401).json({ error: 'Team authentication required' });
      return;
    }

    if (!questionId || !answer) {
      res.status(400).json({ error: 'Question ID and answer are required' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (team.isSuspended) {
      res.status(403).json({ error: 'Team is suspended.', isSuspended: true });
      return;
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Count previous attempts for this question
    const attemptCount = await prisma.submission.count({
      where: { teamId, questionId },
    });

    const isCorrect = validateAnswer(answer, question.correctAnswer);

    // Record submission
    await prisma.submission.create({
      data: {
        teamId,
        questionId,
        submittedAnswer: answer.trim(),
        isCorrect,
        attemptNumber: attemptCount + 1,
      },
    });

    // Increment team total attempts
    await prisma.team.update({
      where: { id: teamId },
      data: { totalAttempts: { increment: 1 } },
    });

    if (!isCorrect) {
      res.status(200).json({
        isCorrect: false,
        message: 'Incorrect answer. Look closely at the riddle and try again!',
      });
      return;
    }

    // Correct Answer Logic
    const totalQuestions = await prisma.question.count({
      where: { isActive: true },
    });
    const safeTotal = totalQuestions > 0 ? totalQuestions : 10;

    const currentStep = team.currentLevel;
    const isHuntCompleted = currentStep >= safeTotal;
    const newStep = isHuntCompleted ? currentStep : currentStep + 1;

    // Calculate the next target question in the team's route
    let nextQuestion = null;
    if (!isHuntCompleted) {
      const nextTargetLevel = getTargetStationForStep(team, newStep, safeTotal);
      nextQuestion = await prisma.question.findUnique({
        where: { level: nextTargetLevel },
      });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        currentLevel: newStep,
        isCompleted: isHuntCompleted,
        completedAt: isHuntCompleted ? new Date() : null,
        status: isHuntCompleted ? 'COMPLETED' : 'PLAYING',
      },
    });

    // Broadcast live leaderboard update
    socketEvents.broadcastLeaderboardUpdate({
      teamId: team.id,
      teamName: team.teamName,
      currentLevel: updatedTeam.currentLevel,
      isCompleted: updatedTeam.isCompleted,
    });

    res.json({
      isCorrect: true,
      message: isHuntCompleted
        ? '🎉 Congratulations! You deciphered all 10 checkpoint puzzles and conquered the Grand Treasure Hunt!'
        : `Puzzle Solved! Proceed to Station ${newStep} of ${safeTotal}. Decipher your next location riddle below:`,
      isHuntCompleted,
      locationHint: nextQuestion
        ? {
            type: nextQuestion.locationHintType,
            content: nextQuestion.locationHintContent,
            mediaUrl: nextQuestion.locationHintMediaUrl,
          }
        : {
            type: 'TEXT',
            content: '🎉 Return immediately to the Main Stage / Organizer Desk to claim victory!',
            mediaUrl: null,
          },
      nextTitle: nextQuestion?.title || null,
      nextAccessKey: nextQuestion ? nextQuestion.accessKey : null,
      nextLevel: newStep,
    });
  } catch (error) {
    console.error('submitAnswer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
}

export async function reportCheatTelemetry(req: Request, res: Response): Promise<void> {
  try {
    const teamId = req.user?.teamId;
    const { eventType, details } = req.body;

    if (!teamId) {
      res.status(401).json({ error: 'Team authentication required' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        securityLogs: true,
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const violationCount = team.securityLogs.length + 1;

    let severity = 'MEDIUM';
    if (eventType === 'CONCURRENT_DEVICE' || eventType === 'DEVTOOLS') {
      severity = 'HIGH';
    } else if (eventType === 'TAB_SWITCH' && violationCount > 3) {
      severity = 'HIGH';
    }

    const log = await prisma.securityLog.create({
      data: {
        teamId,
        eventType: eventType || 'TAB_SWITCH',
        severity,
        details: details || `Suspicious activity detected (${eventType})`,
        violationCount,
      },
    });

    // Notify Admin in real-time
    socketEvents.notifyAdminCheatAlert({
      teamId: team.id,
      teamName: team.teamName,
      eventType: log.eventType,
      severity: log.severity,
      details: log.details || undefined,
      violationCount,
      timestamp: log.createdAt,
    });

    res.json({ status: 'Logged', violationCount });
  } catch (error) {
    console.error('reportCheatTelemetry error:', error);
    res.status(500).json({ error: 'Failed to report telemetry' });
  }
}

export async function getInventory(req: Request, res: Response): Promise<void> {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(401).json({ error: 'Team authentication required' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const totalQuestions = await prisma.question.count({
      where: { isActive: true },
    });
    const safeTotal = totalQuestions > 0 ? totalQuestions : 10;

    const inventory = [];

    // Step 1: Always include the Initial Starting Point Clue
    const startTargetLevel = getTargetStationForStep(team, 1, safeTotal);
    const startQ = await prisma.question.findUnique({
      where: { level: startTargetLevel },
    });

    if (startQ) {
      inventory.push({
        step: 1,
        level: 1,
        title: `Station 1 • ${startQ.title}`,
        questionType: startQ.questionType,
        questionContent: startQ.questionContent,
        questionMediaUrl: startQ.questionMediaUrl,
        locationHintType: startQ.locationHintType,
        locationHintContent: startQ.locationHintContent,
        locationHintMediaUrl: startQ.locationHintMediaUrl,
        nextAccessKey: startQ.accessKey,
        isStartingClue: true,
      });
    }

    // Steps 2 to currentLevel: Add clues revealed upon completing earlier steps
    const maxUnlockedStep = Math.min(team.currentLevel, safeTotal);
    for (let s = 2; s <= maxUnlockedStep; s++) {
      const stepTargetLevel = getTargetStationForStep(team, s, safeTotal);
      const q = await prisma.question.findUnique({
        where: { level: stepTargetLevel },
      });

      if (q) {
        inventory.push({
          step: s,
          level: s,
          title: `Station ${s} • ${q.title}`,
          questionType: q.questionType,
          questionContent: q.questionContent,
          questionMediaUrl: q.questionMediaUrl,
          locationHintType: q.locationHintType,
          locationHintContent: q.locationHintContent,
          locationHintMediaUrl: q.locationHintMediaUrl,
          nextAccessKey: q.accessKey,
          isStartingClue: false,
        });
      }
    }

    res.json({ inventory });
  } catch (error) {
    console.error('getInventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}
