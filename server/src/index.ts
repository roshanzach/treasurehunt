import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { prisma } from './prisma';
import { initSocketIO } from './sockets/huntSocket';
import {
  authenticateToken,
  requireAdmin,
  requireTeam,
} from './middleware/auth';
import * as authCtrl from './controllers/authController';
import * as questionCtrl from './controllers/questionController';
import * as huntCtrl from './controllers/huntController';
import * as adminCtrl from './controllers/adminController';
import { upload, handleFileUpload } from './controllers/uploadController';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Middleware
app.use(
  cors({
    origin: config.clientOrigin === '*' ? true : [config.clientOrigin],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Serve uploaded media files
app.use('/uploads', express.static(config.uploadDir));

// ================= API ROUTES =================

app.get('/api/health', async (req, res) => {
  const hasDbUrl = !!process.env.DATABASE_URL;
  try {
    const questionCount = await prisma.question.count();
    res.json({
      status: 'healthy',
      database: 'connected',
      checkpoints: questionCount,
      hasDbUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      hasDbUrl,
      errorMessage: err.message || 'Unknown database error',
    });
  }
});

// 1. Auth Routes
app.post('/api/auth/admin-login', authCtrl.adminLogin);
app.post('/api/auth/team-login', authCtrl.teamLogin);
app.get('/api/auth/me', authenticateToken, authCtrl.getMe);

// 2. Public Leaderboard
app.get('/api/leaderboard/public', adminCtrl.getPublicLeaderboard);

// 3. Participant Hunt Routes
app.get('/api/hunt/status', authenticateToken, requireTeam, huntCtrl.getHuntStatus);
app.post('/api/hunt/access', authenticateToken, requireTeam, huntCtrl.accessQuestion);
app.post('/api/hunt/submit', authenticateToken, requireTeam, huntCtrl.submitAnswer);
app.post('/api/hunt/report-cheat', authenticateToken, requireTeam, huntCtrl.reportCheatTelemetry);
app.get('/api/hunt/inventory', authenticateToken, requireTeam, huntCtrl.getInventory);

// 4. Admin Routes (Protected by authenticateToken + requireAdmin)
app.get('/api/admin/teams', authenticateToken, requireAdmin, adminCtrl.getTeams);
app.post('/api/admin/teams', authenticateToken, requireAdmin, adminCtrl.createTeam);
app.put('/api/admin/teams/:id', authenticateToken, requireAdmin, adminCtrl.updateTeam);
app.delete('/api/admin/teams/:id', authenticateToken, requireAdmin, adminCtrl.deleteTeam);
app.patch('/api/admin/teams/:id/toggle-suspend', authenticateToken, requireAdmin, adminCtrl.toggleSuspendTeam);
app.patch('/api/admin/teams/:id/change-password', authenticateToken, requireAdmin, adminCtrl.changeTeamPassword);
app.post('/api/admin/teams/:id/reset-progress', authenticateToken, requireAdmin, adminCtrl.resetTeamProgress);

app.get('/api/admin/devices', authenticateToken, requireAdmin, adminCtrl.getDeviceSessions);
app.post('/api/admin/devices/:sessionId/approve', authenticateToken, requireAdmin, adminCtrl.approveDevice);
app.delete('/api/admin/devices/:sessionId/revoke', authenticateToken, requireAdmin, adminCtrl.revokeDevice);

app.get('/api/admin/questions', authenticateToken, requireAdmin, questionCtrl.getAllQuestions);
app.get('/api/admin/questions/:id', authenticateToken, requireAdmin, questionCtrl.getQuestionById);
app.post('/api/admin/questions', authenticateToken, requireAdmin, questionCtrl.createQuestion);
app.put('/api/admin/questions/:id', authenticateToken, requireAdmin, questionCtrl.updateQuestion);
app.delete('/api/admin/questions/:id', authenticateToken, requireAdmin, questionCtrl.deleteQuestion);
app.post('/api/admin/questions/:id/regenerate-key', authenticateToken, requireAdmin, questionCtrl.regenerateAccessKey);
app.get('/api/admin/questions/:id/qr-code', authenticateToken, requireAdmin, questionCtrl.getQuestionQRCode);
app.get('/api/admin/fake-qr-codes', authenticateToken, requireAdmin, questionCtrl.getFakeQRCodes);
app.post('/api/admin/fake-qr-codes', authenticateToken, requireAdmin, questionCtrl.createFakeQRCode);
app.delete('/api/admin/fake-qr-codes/:id', authenticateToken, requireAdmin, questionCtrl.deleteFakeQRCode);

app.get('/api/admin/submissions', authenticateToken, requireAdmin, adminCtrl.getSubmissions);
app.get('/api/admin/security-logs', authenticateToken, requireAdmin, adminCtrl.getSecurityLogs);
app.post('/api/admin/warn-team', authenticateToken, requireAdmin, adminCtrl.sendWarningToTeam);
app.get('/api/admin/leaderboard', authenticateToken, requireAdmin, adminCtrl.getAdminLeaderboard);
app.get('/api/admin/settings', authenticateToken, requireAdmin, adminCtrl.getSettings);
app.put('/api/admin/settings', authenticateToken, requireAdmin, adminCtrl.updateSettings);

// 5. Media Upload Route
app.post(
  '/api/upload',
  authenticateToken,
  requireAdmin,
  upload.single('file'),
  handleFileUpload
);

// Serve Frontend in Production
const clientBuildPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred',
  });
});

// Start Server
server.listen(config.port, async () => {
  console.log(`🧭 Treasure Hunt Server running on http://localhost:${config.port}`);
  console.log(`📁 Upload directory: ${config.uploadDir}`);

  // Test database connection
  try {
    const questionCount = await prisma.question.count();
    console.log(`✅ Database connected successfully! Found ${questionCount} checkpoints.`);
  } catch (dbErr: any) {
    console.error('❌ Database connection error on startup:', dbErr.message);
    if (!process.env.DATABASE_URL) {
      console.error('⚠️ DATABASE_URL environment variable is MISSING on Render!');
    }
  }
});
