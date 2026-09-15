import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Navbar } from '../components/Navbar';
import { sound } from '../utils/audio';
import {
  Users,
  HelpCircle,
  ShieldAlert,
  Trophy,
  Settings,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Printer,
  Smartphone,
  AlertTriangle,
  Clock,
  Lock,
  KeyRound,
  Compass,
  Ghost,
  AlertOctagon,
  Download,
  Eye,
  Sparkles,
} from 'lucide-react';
import { getMediaUrl } from '../utils/media';

export const PREDEFINED_ROUTE_PATTERNS: Record<number, { name: string; sequence: number[]; start: number }> = {
  1:  { name: 'Route 1', start: 1, sequence: [1, 6, 3, 8, 5, 10, 2, 7, 4, 9] },
  2:  { name: 'Route 2', start: 2, sequence: [2, 7, 4, 9, 6, 1, 8, 3, 10, 5] },
  3:  { name: 'Route 3', start: 3, sequence: [3, 8, 1, 6, 9, 4, 7, 2, 5, 10] },
  4:  { name: 'Route 4', start: 4, sequence: [4, 9, 2, 7, 10, 5, 8, 1, 6, 3] },
  5:  { name: 'Route 5', start: 5, sequence: [5, 10, 3, 8, 1, 6, 9, 4, 7, 2] },
  6:  { name: 'Route 6', start: 6, sequence: [6, 1, 8, 3, 10, 5, 2, 7, 4, 9] },
  7:  { name: 'Route 7', start: 7, sequence: [7, 2, 9, 4, 1, 6, 3, 8, 5, 10] },
  8:  { name: 'Route 8', start: 8, sequence: [8, 3, 10, 5, 2, 7, 4, 9, 6, 1] },
  9:  { name: 'Route 9', start: 9, sequence: [9, 4, 7, 2, 5, 10, 1, 6, 3, 8] },
  10: { name: 'Route 10', start: 10, sequence: [10, 5, 2, 7, 4, 9, 6, 1, 8, 3] },
  11: { name: 'Route 11', start: 1, sequence: [1, 8, 4, 10, 6, 2, 9, 5, 7, 3] },
  12: { name: 'Route 12', start: 3, sequence: [3, 9, 6, 1, 8, 4, 10, 7, 2, 5] },
  13: { name: 'Route 13', start: 5, sequence: [5, 2, 8, 3, 9, 6, 1, 10, 4, 7] },
  14: { name: 'Route 14', start: 7, sequence: [7, 3, 10, 6, 2, 8, 4, 1, 9, 5] },
  15: { name: 'Route 15', start: 9, sequence: [9, 5, 1, 7, 3, 10, 6, 2, 8, 4] },
  16: { name: 'Route 16', start: 2, sequence: [2, 10, 6, 3, 7, 1, 9, 4, 8, 5] },
};

interface TeamItem {
  id: string;
  teamName: string;
  teamCode: string;
  startLevel?: number;
  startLocationName?: string;
  currentStationLevel?: number;
  currentStationName?: string;
  routeSequence?: number[];
  customRoute?: string | null;
  currentLevel: number;
  isCompleted: boolean;
  completedAt: string | null;
  isSuspended: boolean;
  status: string;
  totalAttempts: number;
  deviceSessions: Array<{
    id: string;
    deviceId: string;
    deviceInfo: string;
    isApproved: boolean;
    lastActive: string;
    ipAddress?: string;
  }>;
  _count?: {
    submissions: number;
    securityLogs: number;
  };
}

interface QuestionItem {
  id: string;
  level: number;
  locationName?: string | null;
  title: string;
  questionType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO';
  questionContent: string;
  questionMediaUrl?: string | null;
  correctAnswer: string;
  locationHintType: 'TEXT' | 'IMAGE' | 'AUDIO';
  locationHintContent: string;
  locationHintMediaUrl?: string | null;
  accessKey: string;
  qrIdentifier: string;
  isActive: boolean;
}

interface SubmissionItem {
  id: string;
  submittedAnswer: string;
  isCorrect: boolean;
  attemptNumber: number;
  createdAt: string;
  team: { id: string; teamName: string; teamCode: string };
  question: { id: string; level: number; title: string; correctAnswer: string };
}

interface SecurityLogItem {
  id: string;
  eventType: string;
  severity: string;
  details: string | null;
  violationCount: number;
  createdAt: string;
  team: { id: string; teamName: string; teamCode: string; isSuspended: boolean };
}

interface AdminLeaderboardItem {
  rank: number;
  teamId: string;
  teamName: string;
  teamCode: string;
  currentLevel: number;
  isCompleted: boolean;
  completedAt: string | null;
  totalAttempts: number;
  totalViolations: number;
  status: string;
  isSuspended: boolean;
  solvedQuestions: Array<{ level: number; title: string; solvedAt: string }>;
}

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState<'TEAMS' | 'QUESTIONS' | 'QR_CARDS' | 'FAKE_QR' | 'SUBMISSIONS' | 'SECURITY' | 'LEADERBOARD' | 'SETTINGS'>('TEAMS');

  // Data states
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLogItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<AdminLeaderboardItem[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // New Team Modal
  const [isNewTeamModalOpen, setIsNewTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');
  const [newTeamStartLevel, setNewTeamStartLevel] = useState<number>(0); // 0 = Auto Balance
  const [newTeamCustomRoute, setNewTeamCustomRoute] = useState<string>('');

  // Edit Route Modal
  const [isEditRouteModalOpen, setIsEditRouteModalOpen] = useState(false);
  const [routeTargetTeam, setRouteTargetTeam] = useState<TeamItem | null>(null);
  const [editRouteIndex, setEditRouteIndex] = useState<number>(1);
  const [editCustomRoute, setEditCustomRoute] = useState<string>('');

  // Question Form Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qLevel, setQLevel] = useState<number>(1);
  const [qLocationName, setQLocationName] = useState('');
  const [qTitle, setQTitle] = useState('');
  const [qType, setQType] = useState<'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO'>('TEXT');
  const [qContent, setQContent] = useState('');
  const [qMediaUrl, setQMediaUrl] = useState('');
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [qHintType, setQHintType] = useState<'TEXT' | 'IMAGE' | 'AUDIO'>('TEXT');
  const [qHintContent, setQHintContent] = useState('');
  const [qHintMediaUrl, setQHintMediaUrl] = useState('');
  const [qCustomAccessKey, setQCustomAccessKey] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // QR Code Printable Preview (Main Questions)
  const [qrCodeDataList, setQrCodeDataList] = useState<any[]>([]);

  // Decoy / Fake QR Code Preview & States
  const [fakeQrCodeDataList, setFakeQrCodeDataList] = useState<any[]>([]);
  const [isFakeQRTrollPreviewOpen, setIsFakeQRTrollPreviewOpen] = useState(false);
  const [isNewFakeQRModalOpen, setIsNewFakeQRModalOpen] = useState(false);
  const [newFakeLocation, setNewFakeLocation] = useState('');
  const [newFakeTitle, setNewFakeTitle] = useState('');
  const [newFakeSubtitle, setNewFakeSubtitle] = useState('');
  const [newFakeCode, setNewFakeCode] = useState('');
  const [newFakeKey, setNewFakeKey] = useState('');
  const [isCreatingFakeQR, setIsCreatingFakeQR] = useState(false);

  // Direct Warning Modal
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningTargetTeam, setWarningTargetTeam] = useState<{ id: string; name: string } | null>(null);
  const [warningMessageText, setWarningMessageText] = useState('');

  // Change Team Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetTeam, setPasswordTargetTeam] = useState<{ id: string; name: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Fetch functions
  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/admin/questions', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/admin/submissions', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSecurityLogs = async () => {
    try {
      const res = await fetch('/api/admin/security-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSecurityLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/admin/leaderboard', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQRCodes = async () => {
    try {
      const list = [];
      for (const q of questions) {
        const res = await fetch(`/api/admin/questions/${q.id}/qr-code`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          list.push(d);
        }
      }
      setQrCodeDataList(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFakeQRCodes = async () => {
    try {
      const res = await fetch('/api/admin/fake-qr-codes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFakeQrCodeDataList(data.fakeQRCodes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchTeams(),
      fetchQuestions(),
      fetchSubmissions(),
      fetchSecurityLogs(),
      fetchLeaderboard(),
      fetchSettings(),
      fetchFakeQRCodes(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'QR_CARDS' && questions.length > 0) {
      fetchQRCodes();
    }
    if (activeTab === 'FAKE_QR') {
      fetchFakeQRCodes();
    }
  }, [activeTab, questions]);

  // Real-time socket updates for Admin
  useEffect(() => {
    if (!socket) return;

    socket.on('device:pending', () => {
      sound.playWarning();
      fetchTeams();
    });

    socket.on('cheat:alert', () => {
      sound.playWarning();
      fetchSecurityLogs();
      fetchTeams();
    });

    socket.on('leaderboard:admin_update', () => {
      fetchTeams();
      fetchLeaderboard();
      fetchSubmissions();
    });

    return () => {
      socket.off('device:pending');
      socket.off('cheat:alert');
      socket.off('leaderboard:admin_update');
    };
  }, [socket]);

  // Device Approval Actions
  const handleApproveDevice = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/devices/${sessionId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        sound.playUnlock();
        fetchTeams();
      }
    } catch (e) {
      alert('Failed to approve device');
    }
  };

  const handleRevokeDevice = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this device session?')) return;
    try {
      const res = await fetch(`/api/admin/devices/${sessionId}/revoke`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTeams();
      }
    } catch (e) {
      alert('Failed to revoke device');
    }
  };

  // Team Actions
  const handleToggleSuspend = async (teamId: string) => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/toggle-suspend`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTeams();
      }
    } catch (e) {
      alert('Failed to update suspension');
    }
  };

  const handleResetProgress = async (teamId: string) => {
    if (!confirm('Are you sure you want to reset this team progress back to Level 1? All solved checkpoints will be cleared.')) return;
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/reset-progress`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTeams();
        fetchLeaderboard();
      }
    } catch (e) {
      alert('Failed to reset progress');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to permanently delete this team?')) return;
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTeams();
        fetchLeaderboard();
      }
    } catch (e) {
      alert('Failed to delete team');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetTeam || !newPasswordInput.trim()) return;

    try {
      const res = await fetch(`/api/admin/teams/${passwordTargetTeam.id}/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: newPasswordInput.trim() }),
      });

      if (res.ok) {
        setIsPasswordModalOpen(false);
        setNewPasswordInput('');
        alert(`Password updated successfully for ${passwordTargetTeam.name}!`);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update password');
      }
    } catch (err) {
      alert('Network error updating password');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamName: newTeamName,
          teamCode: newTeamCode,
          password: newTeamPassword,
          startLevel: newTeamStartLevel > 0 ? newTeamStartLevel : undefined,
          customRoute: newTeamCustomRoute.trim() || undefined,
        }),
      });
      if (res.ok) {
        setIsNewTeamModalOpen(false);
        setNewTeamName('');
        setNewTeamCode('');
        setNewTeamPassword('');
        setNewTeamStartLevel(0);
        setNewTeamCustomRoute('');
        fetchTeams();
        fetchLeaderboard();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to create team');
      }
    } catch (e) {
      alert('Network error creating team');
    }
  };

  const handleUpdateTeamRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeTargetTeam) return;

    try {
      const res = await fetch(`/api/admin/teams/${routeTargetTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startLevel: editRouteIndex,
          customRoute: editCustomRoute.trim() || null,
        }),
      });

      if (res.ok) {
        setIsEditRouteModalOpen(false);
        fetchTeams();
        fetchLeaderboard();
        alert(`Route path updated successfully for ${routeTargetTeam.teamName}!`);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update route');
      }
    } catch (err) {
      alert('Network error updating team route');
    }
  };

  // Media Upload Handler
  const handleMediaUpload = async (file: File, target: 'QUESTION' | 'HINT') => {
    setIsUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (target === 'QUESTION') {
          setQMediaUrl(data.url);
        } else {
          setQHintMediaUrl(data.url);
        }
      } else {
        alert('Failed to upload media file');
      }
    } catch (err) {
      alert('Upload error');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Question Form Submission
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      level: qLevel,
      locationName: qLocationName || undefined,
      title: qTitle,
      questionType: qType,
      questionContent: qContent,
      questionMediaUrl: qMediaUrl || null,
      correctAnswer: qCorrectAnswer,
      locationHintType: qHintType,
      locationHintContent: qHintContent,
      locationHintMediaUrl: qHintMediaUrl || null,
      customAccessKey: qCustomAccessKey || undefined,
    };

    try {
      const url = editingQuestionId ? `/api/admin/questions/${editingQuestionId}` : '/api/admin/questions';
      const method = editingQuestionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsQuestionModalOpen(false);
        fetchQuestions();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to save question');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleEditQuestion = (q: QuestionItem) => {
    setEditingQuestionId(q.id);
    setQLevel(q.level);
    setQLocationName(q.locationName || '');
    setQTitle(q.title);
    setQType(q.questionType);
    setQContent(q.questionContent);
    setQMediaUrl(q.questionMediaUrl || '');
    setQCorrectAnswer(q.correctAnswer);
    setQHintType(q.locationHintType);
    setQHintContent(q.locationHintContent);
    setQHintMediaUrl(q.locationHintMediaUrl || '');
    setQCustomAccessKey(q.accessKey);
    setIsQuestionModalOpen(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to remove this question?')) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchQuestions();
      }
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  const handleRegenerateKey = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/questions/${id}/regenerate-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchQuestions();
      }
    } catch (err) {
      alert('Failed to regenerate key');
    }
  };

  // Custom Decoy / Fake QR Handlers
  const handleCreateFakeQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFakeLocation.trim() && !newFakeTitle.trim()) {
      alert('Please enter a location name or fake question title');
      return;
    }

    setIsCreatingFakeQR(true);
    try {
      const res = await fetch('/api/admin/fake-qr-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locationName: newFakeLocation.trim(),
          title: newFakeTitle.trim() || newFakeLocation.trim(),
          subtitle: newFakeSubtitle.trim() || 'Custom Trap Checkpoint',
          code: newFakeCode.trim() || undefined,
          accessKey: newFakeKey.trim() || undefined,
        }),
      });

      if (res.ok) {
        sound.playSuccess();
        setNewFakeLocation('');
        setNewFakeTitle('');
        setNewFakeSubtitle('');
        setNewFakeCode('');
        setNewFakeKey('');
        setIsNewFakeQRModalOpen(false);
        fetchFakeQRCodes();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to create fake QR code');
      }
    } catch (err) {
      alert('Network error while creating fake QR code');
    } finally {
      setIsCreatingFakeQR(false);
    }
  };

  const handleDeleteFakeQR = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete decoy QR badge "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/fake-qr-codes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchFakeQRCodes();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete fake QR code');
      }
    } catch (err) {
      alert('Failed to delete decoy QR code');
    }
  };

  // Direct Warning Dispatcher
  const handleSendWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningTargetTeam || !warningMessageText.trim()) return;

    try {
      const res = await fetch('/api/admin/warn-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamId: warningTargetTeam.id,
          message: warningMessageText.trim(),
        }),
      });

      if (res.ok) {
        setIsWarningModalOpen(false);
        setWarningMessageText('');
        fetchSecurityLogs();
        alert(`Warning alert dispatched to ${warningTargetTeam.name}'s screen!`);
      }
    } catch (err) {
      alert('Failed to send warning');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert('Hunt settings updated successfully!');
      }
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  // Dedicated 2-per-page PDF Print Handler
  const handlePrintQRCards = () => {
    if (!qrCodeDataList || qrCodeDataList.length === 0) {
      alert('QR codes are still generating. Please wait a moment and try again.');
      return;
    }

    // Group into strict pairs of 2 cards per page
    const pages: any[][] = [];
    for (let i = 0; i < qrCodeDataList.length; i += 2) {
      pages.push(qrCodeDataList.slice(i, i + 2));
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Treasure Hunt Checkpoint QR Badges</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .print-page {
      width: 210mm;
      height: 296mm;
      padding: 8mm 14mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
    }
    .print-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .badge-card {
      width: 100%;
      height: 134mm;
      border: 3px dashed #1e293b;
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      background: #ffffff;
    }
    .badge-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: #b45309;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .badge-title {
      font-size: 21px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
    }
    .badge-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #0284c7;
      margin-top: 2px;
    }
    .qr-wrapper {
      background: #000000;
      padding: 8px;
      border-radius: 12px;
      display: inline-block;
      margin: 4px 0;
    }
    .qr-img {
      width: 175px;
      height: 175px;
      display: block;
      border-radius: 6px;
    }
    .badge-key {
      font-size: 13px;
      color: #334155;
      margin-bottom: 3px;
    }
    .badge-key strong {
      font-family: monospace;
      font-size: 15px;
      color: #0f172a;
      letter-spacing: 0.08em;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .badge-instruction {
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  ${pages
    .map(
      (pair) => `
    <div class="print-page">
      ${pair
        .map(
          (qr) => `
        <div class="badge-card">
          <div>
            <div class="badge-tag">Campus Treasure Hunt Checkpoint</div>
            <div class="badge-title">STATION ${qr.level}: ${qr.locationName || qr.title}</div>
            ${qr.locationName ? `<div class="badge-subtitle">📍 ${qr.title}</div>` : ''}
          </div>

          <div class="qr-wrapper">
            <img class="qr-img" src="${qr.qrDataUrl}" alt="Station ${qr.level}" />
          </div>

          <div>
            ${
              qr.accessKey
                ? `<div class="badge-key">Organizer Access Key: <strong>${qr.accessKey}</strong></div>`
                : ''
            }
            <div class="badge-instruction">Scan with in-app camera scanner to reveal this station's puzzle</div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('')}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Dedicated 2-per-page PDF Print Handler for Decoy / Fake QRs
  const handlePrintFakeQRCards = () => {
    if (!fakeQrCodeDataList || fakeQrCodeDataList.length === 0) {
      alert('Decoy QR codes are still generating. Please wait a moment and try again.');
      return;
    }

    // Group into strict pairs of 2 cards per page
    const pages: any[][] = [];
    for (let i = 0; i < fakeQrCodeDataList.length; i += 2) {
      pages.push(fakeQrCodeDataList.slice(i, i + 2));
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Treasure Hunt Decoy Trap QR Badges</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .print-page {
      width: 210mm;
      height: 296mm;
      padding: 8mm 14mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
    }
    .print-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .badge-card {
      width: 100%;
      height: 134mm;
      border: 3px dashed #dc2626;
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      background: #ffffff;
    }
    .badge-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: #b91c1c;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .badge-title {
      font-size: 21px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
    }
    .badge-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #b91c1c;
      margin-top: 2px;
    }
    .qr-wrapper {
      background: #000000;
      padding: 8px;
      border-radius: 12px;
      display: inline-block;
      margin: 4px 0;
    }
    .qr-img {
      width: 175px;
      height: 175px;
      display: block;
      border-radius: 6px;
    }
    .badge-key {
      font-size: 13px;
      color: #334155;
      margin-bottom: 3px;
    }
    .badge-key strong {
      font-family: monospace;
      font-size: 15px;
      color: #0f172a;
      letter-spacing: 0.08em;
      background: #fee2e2;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #fca5a5;
    }
    .badge-instruction {
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  ${pages
    .map(
      (pair) => `
    <div class="print-page">
      ${pair
        .map(
          (qr) => `
        <div class="badge-card">
          <div>
            <div class="badge-tag">Campus Treasure Hunt Checkpoint</div>
            <div class="badge-title">${qr.locationName || qr.title}</div>
            <div class="badge-subtitle">📍 ${qr.title}</div>
          </div>

          <div class="qr-wrapper">
            <img class="qr-img" src="${qr.qrDataUrl}" alt="${qr.title}" />
          </div>

          <div>
            <div class="badge-key">
              Checkpoint Access Key: <strong>${qr.accessKey}</strong>
            </div>
            <div class="badge-instruction">
              Scan with in-app camera scanner to reveal this station's puzzle
            </div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('')}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const downloadQRImage = (qrDataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      
      <Navbar />

      <main className="container-max" style={{ marginTop: '24px' }}>
        
        {/* Top Control Header */}
        <div className="glass-panel no-print" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={28} />
                <span>Game Master Command Center</span>
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Real-time team monitoring, device approval, question templates, QR card generation & anti-cheating logs.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={reloadAll} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh Live State</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            
            <button
              onClick={() => setActiveTab('TEAMS')}
              className={activeTab === 'TEAMS' ? 'btn-gold' : 'btn-secondary'}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              <Users size={16} />
              <span>Teams & Devices ({teams.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('QUESTIONS')}
              className={activeTab === 'QUESTIONS' ? 'btn-gold' : 'btn-secondary'}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              <HelpCircle size={16} />
              <span>Questions & Keys ({questions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('QR_CARDS')}
              className={activeTab === 'QR_CARDS' ? 'btn-gold' : 'btn-secondary'}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              <Printer size={16} />
              <span>Printable QR Badges</span>
            </button>

            <button
              onClick={() => setActiveTab('FAKE_QR')}
              className={activeTab === 'FAKE_QR' ? 'btn-gold' : 'btn-secondary'}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                border: activeTab === 'FAKE_QR' ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.4)',
                background: activeTab === 'FAKE_QR' ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
                color: activeTab === 'FAKE_QR' ? '#ffffff' : '#fca5a5',
              }}
            >
              <Ghost size={16} />
              <span>Decoy / Fake QRs ({fakeQrCodeDataList.length || 8})</span>
            </button>

            <button
              onClick={() => setActiveTab('SUBMISSIONS')}
              className={activeTab === 'SUBMISSIONS' ? 'btn-gold' : 'btn-secondary'}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              <Clock size={16} />
              <span>Submissions Log ({submissions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('SECURITY')}
              className={activeTab === 'SECURITY' ? 'btn-gold' : 'btn-secondary'}
              style={{ padding: '8px 14px', fontSize: '13px', position: 'relative' }}
            >
              <ShieldAlert size={16} color={securityLogs.length > 0 ? '#ef4444' : 'inherit'} />
              <span>Cheating Hub ({securityLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('LEADERBOARD')}
              className={activeTab === 'LEADERBOARD' ? 'btn-gold' : 'btn-secondary'}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              <Trophy size={16} />
              <span>Organizer Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={activeTab === 'SETTINGS' ? 'btn-gold' : 'btn-secondary'}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              <Settings size={16} />
              <span>Hunt Settings</span>
            </button>

          </div>
        </div>

        {/* TAB 1: TEAMS & DEVICE APPROVAL */}
        {activeTab === 'TEAMS' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#fbbf24' }}>Registered Teams & Device Authorizations</h2>
              <button
                onClick={() => setIsNewTeamModalOpen(true)}
                className="btn-emerald"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Plus size={16} />
                <span>Register New Team</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {teams.map((team) => {
                const activeSession = team.deviceSessions[0];
                const isPending = activeSession && !activeSession.isApproved;

                return (
                  <div
                    key={team.id}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      border: isPending
                        ? '2px solid #f59e0b'
                        : team.isSuspended
                        ? '2px solid #ef4444'
                        : '1px solid var(--border-subtle)',
                      background: isPending ? 'rgba(245, 158, 11, 0.05)' : 'rgba(18, 24, 38, 0.75)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '18px', color: '#f8fafc' }}>{team.teamName}</h3>
                          <span style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            fontWeight: 700
                          }}>
                            CODE: {team.teamCode}
                          </span>

                          <span style={{
                            background: team.isCompleted
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(255, 255, 255, 0.08)',
                            color: team.isCompleted ? '#34d399' : 'var(--text-secondary)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            Station {team.currentLevel} of 10 {team.isCompleted && '• Conquered!'}
                          </span>

                          <span style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            🏁 Starts: {team.startLocationName || `Station ${team.startLevel || 1}`}
                          </span>

                          {team.isSuspended && (
                            <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                              SUSPENDED
                            </span>
                          )}
                        </div>

                        {/* Campus Route Sequence Flow */}
                        <div style={{
                          marginTop: '10px',
                          marginBottom: '10px',
                          padding: '10px 14px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Compass size={14} color="#fbbf24" />
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                                {team.customRoute ? 'Custom Campus Route' : `Route Pattern #${team.startLevel || 1}`}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                (Start: {team.startLocationName || `Station ${team.startLevel || 1}`})
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#38bdf8' }}>
                              🎯 Active Target: <strong>{team.currentStationName || `Station ${team.currentStationLevel || team.currentLevel}`}</strong>
                            </div>
                          </div>

                          {/* Visual Route Path Pills */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            {(team.routeSequence || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((stnNum, idx) => {
                              const stepNum = idx + 1;
                              const isCompletedStep = team.isCompleted || stepNum < team.currentLevel;
                              const isCurrentStep = !team.isCompleted && stepNum === team.currentLevel;

                              return (
                                <React.Fragment key={idx}>
                                  <span
                                    title={`Step ${stepNum}: Station ${stnNum}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: '26px',
                                      height: '24px',
                                      padding: '0 6px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      fontFamily: 'var(--font-mono)',
                                      background: isCompletedStep
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : isCurrentStep
                                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                      color: isCompletedStep
                                        ? '#34d399'
                                        : isCurrentStep
                                        ? '#000000'
                                        : 'var(--text-secondary)',
                                      border: isCompletedStep
                                        ? '1px solid rgba(16, 185, 129, 0.4)'
                                        : isCurrentStep
                                        ? '1px solid #fbbf24'
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                      boxShadow: isCurrentStep ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none',
                                    }}
                                  >
                                    {isCompletedStep ? `✓ ${stnNum}` : stnNum}
                                  </span>
                                  {idx < (team.routeSequence?.length || 10) - 1 && (
                                    <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: '10px' }}>➔</span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        {/* Device Info */}
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Smartphone size={14} color="#38bdf8" />
                            <span>
                              {activeSession ? `${activeSession.deviceInfo} (IP: ${activeSession.ipAddress || 'Unknown'})` : 'No device logged in yet'}
                            </span>
                          </div>

                          {activeSession && (
                            <div>
                              {activeSession.isApproved ? (
                                <span style={{ color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={14} />
                                  <span>Device Approved</span>
                                </span>
                              ) : (
                                <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <AlertTriangle size={14} />
                                  <span>Awaiting Approval</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Team Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Approve Device Button */}
                        {activeSession && !activeSession.isApproved && (
                          <button
                            onClick={() => handleApproveDevice(activeSession.id)}
                            className="btn-emerald"
                            style={{ padding: '8px 14px', fontSize: '12px' }}
                          >
                            <CheckCircle size={15} />
                            <span>Approve Device</span>
                          </button>
                        )}

                        {activeSession && activeSession.isApproved && (
                          <button
                            onClick={() => handleRevokeDevice(activeSession.id)}
                            className="btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '12px' }}
                            title="Revoke active device session"
                          >
                            Revoke Device
                          </button>
                        )}

                        {/* Edit Route */}
                        <button
                          onClick={() => {
                            setRouteTargetTeam(team);
                            setEditRouteIndex(team.startLevel && team.startLevel >= 1 && team.startLevel <= 16 ? team.startLevel : 1);
                            setEditCustomRoute(team.customRoute || '');
                            setIsEditRouteModalOpen(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '12px', gap: '4px' }}
                          title="Assign unique route pattern (1-16) or custom sequence"
                        >
                          <Compass size={14} color="#fbbf24" />
                          <span>Route</span>
                        </button>

                        {/* Change Password */}
                        <button
                          onClick={() => {
                            setPasswordTargetTeam({ id: team.id, name: team.teamName });
                            setNewPasswordInput('');
                            setIsPasswordModalOpen(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '12px', gap: '4px' }}
                          title="Change or reset team password"
                        >
                          <Lock size={14} color="#38bdf8" />
                          <span>Password</span>
                        </button>

                        {/* Send Warning */}
                        <button
                          onClick={() => {
                            setWarningTargetTeam({ id: team.id, name: team.teamName });
                            setIsWarningModalOpen(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '12px', gap: '4px' }}
                        >
                          <Send size={14} color="#f59e0b" />
                          <span>Warn</span>
                        </button>

                        {/* Suspend / Unsuspend */}
                        <button
                          onClick={() => handleToggleSuspend(team.id)}
                          className={team.isSuspended ? 'btn-emerald' : 'btn-danger'}
                          style={{ padding: '8px 12px', fontSize: '12px' }}
                        >
                          {team.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>

                        {/* Reset Progress */}
                        <button
                          onClick={() => handleResetProgress(team.id)}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '12px' }}
                          title="Reset progress to level 1"
                        >
                          Reset
                        </button>

                        {/* Delete Team */}
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="btn-secondary"
                          style={{ padding: '8px', color: '#ef4444' }}
                          title="Delete team"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: QUESTIONS & TEMPLATE BUILDER */}
        {activeTab === 'QUESTIONS' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#fbbf24' }}>Question Sequence & Reusable Templates</h2>
              <button
                onClick={() => {
                  setEditingQuestionId(null);
                  setQLevel(questions.length + 1);
                  setQTitle('');
                  setQType('TEXT');
                  setQContent('');
                  setQMediaUrl('');
                  setQCorrectAnswer('');
                  setQHintType('TEXT');
                  setQHintContent('');
                  setQHintMediaUrl('');
                  setQCustomAccessKey('');
                  setIsQuestionModalOpen(true);
                }}
                className="btn-gold"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Plus size={16} />
                <span>Add Question Checkpoint</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {questions.map((q) => (
                <div key={q.id} className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-gold)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#0b0f19',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '12px'
                      }}>
                        LEVEL {q.level}
                      </span>
                      <h3 style={{ fontSize: '18px', color: '#fbbf24' }}>{q.title}</h3>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Type: {q.questionType}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleRegenerateKey(q.id)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        title="Regenerate 6-char key"
                      >
                        <RefreshCw size={13} />
                        <span>Regen Key</span>
                      </button>

                      <button
                        onClick={() => handleEditQuestion(q)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="btn-secondary"
                        style={{ padding: '6px', color: '#ef4444' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Question Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '13px' }}>
                    
                    {/* Left: Content & Answer */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>QUESTION CONTENT:</div>
                      <div style={{ color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.4 }}>{q.questionContent}</div>
                      {q.questionMediaUrl && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '11px', color: '#38bdf8', marginBottom: '4px' }}>
                            Puzzle Media: <a href={getMediaUrl(q.questionMediaUrl)} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>View Full Media</a>
                          </div>
                          {q.questionType === 'IMAGE' && (
                            <img src={getMediaUrl(q.questionMediaUrl)} alt="Preview" style={{ maxHeight: '80px', borderRadius: '6px', objectFit: 'contain' }} />
                          )}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>ACCEPTED ANSWER(S):</div>
                      <div style={{ color: '#34d399', fontWeight: 600 }}>{q.correctAnswer}</div>
                    </div>

                    {/* Right: Location Clue & Key */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>LOCATION HINT (REVEALED ON SOLVE):</div>
                      <div style={{ color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.4 }}>{q.locationHintContent}</div>
                      {q.locationHintMediaUrl && (
                        <div style={{ fontSize: '11px', color: '#34d399', marginBottom: '8px' }}>
                          Location Media: <a href={getMediaUrl(q.locationHintMediaUrl)} target="_blank" rel="noreferrer" style={{ color: '#34d399', textDecoration: 'underline' }}>View Location File</a>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px dashed rgba(245, 158, 11, 0.4)' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>6-CHAR ACCESS KEY:</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.1em' }}>
                            {q.accessKey}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>QR IDENTIFIER:</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {q.qrIdentifier}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PRINTABLE QR CODE CARDS */}
        {activeTab === 'QR_CARDS' && (
          <div className="animate-fade-in">
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: '#fbbf24' }}>Printable Checkpoint QR Badges</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Print these cards and place them at their corresponding physical locations.</p>
              </div>

              <button
                onClick={handlePrintQRCards}
                className="btn-gold"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Printer size={16} />
                <span>Download PDF / Print Badges (2 Per Page)</span>
              </button>
            </div>

            <div className="print-qr-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {qrCodeDataList.map((qr) => (
                <div
                  key={qr.qrIdentifier}
                  className="print-qr-card"
                  style={{
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    border: '4px solid #f59e0b',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: '#d97706',
                      marginBottom: '4px'
                    }}>
                      CAMPUS TREASURE HUNT CHECKPOINT
                    </div>

                    <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '2px', color: '#0f172a' }}>
                      STATION {qr.level}: {qr.locationName || qr.title}
                    </h3>

                    {qr.locationName && (
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
                        📍 {qr.title}
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'inline-block',
                    padding: '8px',
                    background: '#000000',
                    borderRadius: '12px',
                    margin: '8px auto',
                  }}>
                    <img
                      src={qr.qrDataUrl}
                      alt={`QR Level ${qr.level}`}
                      style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px' }}
                    />
                  </div>

                  <div>
                    {qr.accessKey && (
                      <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                        Organizer Access Key: <strong style={{ fontFamily: 'monospace', fontSize: '14px', color: '#0f172a', letterSpacing: '0.08em' }}>{qr.accessKey}</strong>
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Scan with in-app scanner to unlock this station's puzzle
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3.5: DECOY / FAKE QR CODE BADGES (SEPARATE SECTION) */}
        {activeTab === 'FAKE_QR' && (
          <div className="animate-fade-in">
            {/* Header & Print Control Bar */}
            <div className="no-print glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <Ghost size={24} color="#ef4444" />
                    <h2 style={{ fontSize: '20px', color: '#fca5a5', margin: 0 }}>Decoy & Trap Checkpoint QR Badges</h2>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    Separate download section for deceptive campus trap QRs. When scanned by participants, these trigger the troll screen with photo and Malayalam quote!
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setIsNewFakeQRModalOpen(true)}
                    className="btn-gold"
                    style={{
                      padding: '9px 16px',
                      fontSize: '13px',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #d97706, #b45309)',
                      border: '1px solid #fde68a',
                      color: '#ffffff',
                    }}
                  >
                    <Plus size={16} />
                    <span>+ Generate Fake / Decoy QR</span>
                  </button>

                  <button
                    onClick={() => setIsFakeQRTrollPreviewOpen(true)}
                    className="btn-secondary"
                    style={{ padding: '9px 16px', fontSize: '13px', gap: '6px' }}
                  >
                    <Eye size={16} color="#fbbf24" />
                    <span>Preview Troll Screen</span>
                  </button>

                  <button
                    onClick={handlePrintFakeQRCards}
                    className="btn-gold"
                    style={{
                      padding: '9px 18px',
                      fontSize: '13px',
                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      border: '1px solid #fca5a5',
                      color: '#ffffff',
                    }}
                  >
                    <Printer size={16} />
                    <span>Download PDF / Print Decoy Badges (2 Per Page)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Troll Showcase Card */}
            <div className="no-print glass-panel" style={{
              padding: '24px',
              marginBottom: '24px',
              border: '2px solid rgba(245, 158, 11, 0.4)',
              background: 'rgba(15, 23, 42, 0.85)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <AlertOctagon size={20} color="#fbbf24" />
                <h3 style={{ fontSize: '16px', color: '#fbbf24', margin: 0 }}>
                  Active Troll Payload Preview (What Players See When Scanning Any Decoy QR)
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '20px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                {/* Photo */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    maxWidth: '220px',
                    margin: '0 auto',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '2px solid #fbbf24',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                  }}>
                    <img
                      src="/fake-qr-troll.jpg"
                      alt="Decoy Troll"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                    Uploaded Troll Meme Photo
                  </div>
                </div>

                {/* Malayalam Quote & Details */}
                <div>
                  <div style={{
                    fontSize: '18px',
                    lineHeight: '1.5',
                    fontWeight: 800,
                    color: '#fbbf24',
                    marginBottom: '12px',
                    textShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                  }}>
                    "ഇരുട്ടുപിടിച്ച മൂലകളിൽ കയറി കണ്ട കറുപ്പും വെളുപ്പും വരകളൊക്കെ സ്കാൻ ചെയ്യാനാണോ നിന്നെ വീട്ടുകാർ കോളേജിലോട്ട് വിട്ടത്?"
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
                    ⚡ When any participant team scans one of the Decoy QR badges below with the in-app camera or a phone camera, this photo and Malayalam quote will immediately take over their screen, and a <code>FAKE_QR_SCANNED</code> event will be logged in the Cheating Hub!
                  </p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#fca5a5',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      🚫 0 Progress / No Points
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      📡 Real-time Organizer Telemetry
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      🔊 Troll Error Sound Triggered
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid of Decoy QR Badges */}
            <div className="print-qr-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {fakeQrCodeDataList.map((qr) => (
                <div
                  key={qr.qrIdentifier}
                  className="print-qr-card"
                  style={{
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    border: '4px solid #ef4444',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: '#b91c1c',
                      marginBottom: '4px'
                    }}>
                      CAMPUS TREASURE HUNT CHECKPOINT
                    </div>

                    {qr.isCustom && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        color: '#92400e',
                        background: '#fef3c7',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        border: '1px solid #fde68a',
                        marginBottom: '6px',
                      }}>
                        <Sparkles size={11} color="#d97706" />
                        <span>CUSTOM DECOY TRAP</span>
                      </div>
                    )}

                    <h3 style={{ fontSize: '19px', fontWeight: 900, marginBottom: '2px', color: '#0f172a' }}>
                      {qr.locationName || qr.title}
                    </h3>

                    {qr.locationName && (
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                        📍 {qr.title}
                      </div>
                    )}
                  </div>

                  {/* QR Image Box */}
                  <div style={{
                    display: 'inline-block',
                    padding: '8px',
                    background: '#000000',
                    borderRadius: '12px',
                    margin: '12px auto',
                  }}>
                    <img
                      src={qr.qrDataUrl}
                      alt={qr.title}
                      style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px' }}
                    />
                  </div>

                  <div>
                    {qr.accessKey && (
                      <div style={{ fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                        Checkpoint Access Key: <strong style={{ fontFamily: 'monospace', fontSize: '14px', color: '#0f172a', letterSpacing: '0.08em', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fca5a5' }}>{qr.accessKey}</strong>
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
                      Scan with in-app scanner to unlock this station's puzzle
                    </div>

                    {/* Action Bar on Card (Hidden when printing) */}
                    <div className="no-print" style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => downloadQRImage(qr.qrDataUrl, qr.qrIdentifier)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', color: '#0f172a', borderColor: '#cbd5e1' }}
                      >
                        <Download size={13} />
                        <span>Download PNG</span>
                      </button>

                      <a
                        href={`/fake-qr?code=${qr.qrIdentifier}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', color: '#dc2626', borderColor: '#fca5a5', textDecoration: 'none' }}
                      >
                        <Eye size={13} />
                        <span>Test Link</span>
                      </a>

                      {qr.isCustom && (
                        <button
                          onClick={() => handleDeleteFakeQR(qr.id, qr.locationName || qr.title)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', gap: '4px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                          title="Delete Custom Decoy QR"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* TAB 4: SUBMISSIONS STREAM */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="animate-fade-in glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', color: '#fbbf24' }}>Real-Time Answer Submissions Feed</h2>
              <button onClick={fetchSubmissions} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Team</th>
                    <th style={{ padding: '12px 16px' }}>Level / Puzzle</th>
                    <th style={{ padding: '12px 16px' }}>Submitted Answer</th>
                    <th style={{ padding: '12px 16px' }}>Result</th>
                    <th style={{ padding: '12px 16px' }}>Attempt #</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(sub.createdAt).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f8fafc' }}>
                        {sub.team.teamName}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        Level {sub.question.level}: {sub.question.title}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                        "{sub.submittedAnswer}"
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {sub.isCorrect ? (
                          <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Correct
                          </span>
                        ) : (
                          <span style={{ color: '#f87171', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={14} /> Incorrect
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        #{sub.attemptNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: CHEATING & SECURITY HUB */}
        {activeTab === 'SECURITY' && (
          <div className="animate-fade-in glass-panel" style={{ overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.08)' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={20} />
                  <span>Anti-Cheating Telemetry & Suspicious Activity Log</span>
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Detected tab switches, window minimizations, concurrent device logins, and inspection shortcuts.
                </p>
              </div>

              <button onClick={fetchSecurityLogs} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Team</th>
                    <th style={{ padding: '12px 16px' }}>Event Type</th>
                    <th style={{ padding: '12px 16px' }}>Severity</th>
                    <th style={{ padding: '12px 16px' }}>Details</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No suspicious security events detected.
                      </td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: log.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f8fafc' }}>
                          {log.team.teamName}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                          {log.eventType}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: log.severity === 'HIGH' || log.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: log.severity === 'HIGH' || log.severity === 'CRITICAL' ? '#f87171' : '#fbbf24',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            {log.severity}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {log.details || 'Browser focus lost'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => {
                              setWarningTargetTeam({ id: log.team.id, name: log.team.teamName });
                              setIsWarningModalOpen(true);
                            }}
                            className="btn-danger"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Warn Team
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: ORGANIZER LEADERBOARD */}
        {activeTab === 'LEADERBOARD' && (
          <div className="animate-fade-in glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: '#fbbf24' }}>Organizer Master Leaderboard</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Complete unredacted metrics with solve times and attempt stats.</p>
              </div>
              <button onClick={fetchLeaderboard} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Rank</th>
                    <th style={{ padding: '12px 16px' }}>Team Name</th>
                    <th style={{ padding: '12px 16px' }}>Current Level</th>
                    <th style={{ padding: '12px 16px' }}>Total Attempts</th>
                    <th style={{ padding: '12px 16px' }}>Cheat Warnings</th>
                    <th style={{ padding: '12px 16px' }}>Completion Time</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item) => (
                    <tr key={item.teamId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: item.rank === 1 ? '#fbbf24' : 'var(--text-primary)' }}>
                        #{item.rank}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        {item.teamName} ({item.teamCode})
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        Level {item.currentLevel} {item.isCompleted && '🏆 Finished'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {item.totalAttempts}
                      </td>
                      <td style={{ padding: '14px 16px', color: item.totalViolations > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {item.totalViolations}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : 'In Progress'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <div className="animate-fade-in glass-panel" style={{ padding: '28px', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '20px', color: '#fbbf24', marginBottom: '16px' }}>Hunt Configuration</h2>

            <form onSubmit={handleSaveSettings}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Hunt Title
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={settings.huntTitle || ''}
                  onChange={(e) => setSettings({ ...settings, huntTitle: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Hunt Description / Lore
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={settings.huntDescription || ''}
                  onChange={(e) => setSettings({ ...settings, huntDescription: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.isHuntActive ?? true}
                    onChange={(e) => setSettings({ ...settings, isHuntActive: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Hunt Active (Allow participant answer submissions)</span>
                </label>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.autoApproveDevice ?? false}
                    onChange={(e) => setSettings({ ...settings, autoApproveDevice: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Auto-Approve New Devices (Bypass manual approval)</span>
                </label>
              </div>

              <button type="submit" className="btn-gold" style={{ width: '100%', padding: '12px' }}>
                Save Settings
              </button>
            </form>
          </div>
        )}

      </main>

      {/* 1. NEW TEAM MODAL */}
      {isNewTeamModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <div className="glass-panel-gold animate-fade-in" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#0e1424' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Compass size={20} color="#fbbf24" />
              <h3 style={{ fontSize: '18px', color: '#fbbf24', margin: 0 }}>Register Participant Team</h3>
            </div>
            <form onSubmit={handleCreateTeam}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Team Alpha Pioneers"
                  className="input-field"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Team Code (Login Username)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ALPHA"
                    className="input-field"
                    value={newTeamCode}
                    onChange={(e) => setNewTeamCode(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-field"
                    value={newTeamPassword}
                    onChange={(e) => setNewTeamPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Assigned Route Pattern (1 to 16 Unique Permutations)
                </label>
                <select
                  className="input-field"
                  value={newTeamStartLevel}
                  onChange={(e) => setNewTeamStartLevel(parseInt(e.target.value, 10))}
                  style={{ fontSize: '13px' }}
                >
                  <option value={0}>🎲 Auto-Balance (Assign Next Unique Route 1-16)</option>
                  {Object.entries(PREDEFINED_ROUTE_PATTERNS).map(([idx, p]) => (
                    <option key={idx} value={idx}>
                      Route {idx} (Starts Stn {p.start}: {p.sequence.join(' ➔ ')})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Each of the 16 routes follows a unique, non-linear sequence across campus so no two teams cross paths in the same order.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Custom Route Override (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1, 6, 3, 8, 5, 10, 2, 7, 4, 9"
                  className="input-field"
                  value={newTeamCustomRoute}
                  onChange={(e) => setNewTeamCustomRoute(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                />
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Comma-separated station IDs 1 to 10. If empty, the selected Route Pattern above will be used.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1, padding: '10px' }}>Register Team</button>
                <button type="button" onClick={() => setIsNewTeamModalOpen(false)} className="btn-secondary" style={{ padding: '10px 16px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1.5 EDIT TEAM ROUTE MODAL */}
      {isEditRouteModalOpen && routeTargetTeam && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <div className="glass-panel-gold animate-fade-in" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#0e1424' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Compass size={20} color="#fbbf24" />
              <h3 style={{ fontSize: '18px', color: '#fbbf24', margin: 0 }}>
                Configure Route: {routeTargetTeam.teamName}
              </h3>
            </div>
            
            <form onSubmit={handleUpdateTeamRoute}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Assign Route Pattern (1 to 16)
                </label>
                <select
                  className="input-field"
                  value={editRouteIndex}
                  onChange={(e) => setEditRouteIndex(parseInt(e.target.value, 10))}
                  style={{ fontSize: '13px' }}
                >
                  {Object.entries(PREDEFINED_ROUTE_PATTERNS).map(([idx, p]) => (
                    <option key={idx} value={idx}>
                      Route {idx} (Starts Stn {p.start}: {p.sequence.join(' ➔ ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview of the Selected Route */}
              {PREDEFINED_ROUTE_PATTERNS[editRouteIndex] && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700, marginBottom: '6px' }}>
                    Route #{editRouteIndex} Traversal Path:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {PREDEFINED_ROUTE_PATTERNS[editRouteIndex].sequence.map((stn, i) => (
                      <React.Fragment key={i}>
                        <span style={{
                          padding: '2px 7px',
                          background: i === 0 ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                          color: i === 0 ? '#000000' : '#f8fafc',
                          fontWeight: 700,
                          fontSize: '11px',
                          borderRadius: '4px',
                        }}>
                          {i === 0 ? `Start: ${stn}` : stn}
                        </span>
                        {i < 9 && <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '10px' }}>➔</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Custom Route Override (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1, 6, 3, 8, 5, 10, 2, 7, 4, 9"
                  className="input-field"
                  value={editCustomRoute}
                  onChange={(e) => setEditCustomRoute(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                />
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Enter exactly 10 comma-separated station IDs (1 to 10) without duplicates to override the route pattern.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1, padding: '10px' }}>
                  Save Route
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditRouteModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 16px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. QUESTION BUILDER / EDIT MODAL */}
      {isQuestionModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <div className="glass-panel-gold animate-fade-in" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#0e1424' }}>
            <h3 style={{ fontSize: '18px', color: '#fbbf24', marginBottom: '16px' }}>
              {editingQuestionId ? 'Edit Question Checkpoint' : 'Create Question Checkpoint'}
            </h3>

            <form onSubmit={handleSaveQuestion}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Station Level</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="input-field"
                    value={qLevel}
                    onChange={(e) => setQLevel(parseInt(e.target.value, 10))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Physical Location Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lotus Pond / Auditorium"
                    className="input-field"
                    value={qLocationName}
                    onChange={(e) => setQLocationName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Riddle / Question Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Whispering Waters"
                  className="input-field"
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Question Type</label>
                <select
                  className="input-field"
                  value={qType}
                  onChange={(e) => setQType(e.target.value as any)}
                >
                  <option value="TEXT">Text Riddle</option>
                  <option value="IMAGE">Image Clue</option>
                  <option value="AUDIO">Audio Clue (Sound / Morse)</option>
                  <option value="VIDEO">Video Clue</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Question Riddle Content</label>
                <textarea
                  required
                  rows={3}
                  className="input-field"
                  placeholder="Enter riddle or instructions..."
                  value={qContent}
                  onChange={(e) => setQContent(e.target.value)}
                />
              </div>

              {/* Question Media File / URL */}
              <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#38bdf8', fontWeight: 600, marginBottom: '6px' }}>
                  Question Media Clue (Image / Audio / Video)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'QUESTION')}
                    style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Or paste Direct Media URL (e.g. https://... or /uploads/...)"
                  className="input-field"
                  value={qMediaUrl}
                  onChange={(e) => setQMediaUrl(e.target.value)}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
                {qMediaUrl && (
                  <div style={{ fontSize: '12px', color: '#34d399', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Attached:</span>
                    <a href={getMediaUrl(qMediaUrl)} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>View File Preview</a>
                    <button type="button" onClick={() => setQMediaUrl('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Correct Answer (Case/Space insensitive. Multiple separated by |)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Echo | An Echo"
                  className="input-field"
                  value={qCorrectAnswer}
                  onChange={(e) => setQCorrectAnswer(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Location Hint (Revealed to team after answering correctly)
                </label>
                <textarea
                  required
                  rows={2}
                  className="input-field"
                  placeholder="e.g. Proceed to the Clock Tower courtyard..."
                  value={qHintContent}
                  onChange={(e) => setQHintContent(e.target.value)}
                />
              </div>

              {/* Location Hint Media File / URL */}
              <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                    Location Hint Media (Photo of Next Station / Audio Clue)
                  </label>
                  <select
                    className="input-field"
                    value={qHintType}
                    onChange={(e) => setQHintType(e.target.value as any)}
                    style={{ padding: '2px 8px', fontSize: '11px', width: 'auto' }}
                  >
                    <option value="TEXT">Text Only</option>
                    <option value="IMAGE">Photo / Image</option>
                    <option value="AUDIO">Audio Clue</option>
                    <option value="VIDEO">Video</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'HINT')}
                    style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Or paste Direct Media URL (e.g. https://... or /uploads/...)"
                  className="input-field"
                  value={qHintMediaUrl}
                  onChange={(e) => {
                    setQHintMediaUrl(e.target.value);
                    if (e.target.value && qHintType === 'TEXT') setQHintType('IMAGE');
                  }}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
                {qHintMediaUrl && (
                  <div style={{ fontSize: '12px', color: '#34d399', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Attached:</span>
                    <a href={getMediaUrl(qHintMediaUrl)} target="_blank" rel="noreferrer" style={{ color: '#34d399' }}>View File Preview</a>
                    <button type="button" onClick={() => setQHintMediaUrl('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Custom 6-Character Access Key (Leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. K9X2B4"
                  className="input-field"
                  value={qCustomAccessKey}
                  onChange={(e) => setQCustomAccessKey(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={isUploadingMedia} className="btn-gold" style={{ flex: 1, padding: '10px' }}>
                  Save Checkpoint
                </button>
                <button type="button" onClick={() => setIsQuestionModalOpen(false)} className="btn-secondary" style={{ padding: '10px 16px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SEND DIRECT WARNING MODAL */}
      {isWarningModalOpen && warningTargetTeam && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '24px', background: '#1c0f0f', border: '1px solid #ef4444' }}>
            <h3 style={{ fontSize: '18px', color: '#f87171', marginBottom: '12px' }}>
              Send Live Alert to {warningTargetTeam.name}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              This alert will pop up immediately on the team's screen with a warning siren.
            </p>
            <form onSubmit={handleSendWarning}>
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  required
                  rows={3}
                  className="input-field"
                  placeholder="e.g. Warning: Multiple tab switches detected. Refrain from switching apps or face forfeiture."
                  value={warningMessageText}
                  onChange={(e) => setWarningMessageText(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-danger" style={{ flex: 1, padding: '10px', justifyContent: 'center' }}>
                  Dispatch Warning
                </button>
                <button type="button" onClick={() => setIsWarningModalOpen(false)} className="btn-secondary" style={{ padding: '10px 16px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CHANGE TEAM PASSWORD MODAL */}
      {isPasswordModalOpen && passwordTargetTeam && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <div className="glass-panel-gold animate-fade-in" style={{ maxWidth: '420px', width: '100%', padding: '24px', background: '#0e1424' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <KeyRound size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '18px', color: '#38bdf8' }}>
                Change Password for {passwordTargetTeam.name}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Set a new password for this team. They will immediately use this new password on their device login screen.
            </p>
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  New Password
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter new password..."
                  className="input-field"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-emerald" style={{ flex: 1, padding: '10px', justifyContent: 'center' }}>
                  Update Password
                </button>
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="btn-secondary" style={{ padding: '10px 16px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. TROLL SCREEN PREVIEW MODAL FOR ADMIN */}
      {isFakeQRTrollPreviewOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px'
        }}>
          <div className="glass-panel-gold animate-fade-in" style={{
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            borderRadius: '20px',
            border: '2px solid rgba(239, 68, 68, 0.7)',
            boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)',
            background: 'rgba(15, 23, 42, 0.96)',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              <AlertOctagon size={15} color="#ef4444" />
              <span>DECOY CHECKPOINT TRAPPED!</span>
              <Ghost size={15} color="#ef4444" />
            </div>

            <div style={{
              width: '100%',
              maxWidth: '300px',
              margin: '0 auto 16px',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '3px solid #fbbf24',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              background: '#000',
            }}>
              <img
                src="/fake-qr-troll.jpg"
                alt="Decoy Troll"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '300px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>

            <div style={{
              fontSize: '18px',
              lineHeight: '1.45',
              fontWeight: 800,
              color: '#fbbf24',
              marginBottom: '14px',
              textShadow: '0 2px 10px rgba(245, 158, 11, 0.3)',
              padding: '0 4px',
            }}>
              "ഇരുട്ടുപിടിച്ച മൂലകളിൽ കയറി കണ്ട കറുപ്പും വെളുപ്പും വരകളൊക്കെ സ്കാൻ ചെയ്യാനാണോ നിന്നെ വീട്ടുകാർ കോളേജിലോട്ട് വിട്ടത്?"
            </div>

            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.4',
              marginBottom: '20px',
            }}>
              ⚠️ Live Simulation: This is the exact screen and Malayalam visual feedback participant teams see upon scanning any fake decoy QR badge on campus.
            </p>

            <button
              onClick={() => setIsFakeQRTrollPreviewOpen(false)}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 800,
              }}
            >
              Close Troll Preview
            </button>
          </div>
        </div>
      )}

      {/* 6. GENERATE CUSTOM DECOY / FAKE QUESTION QR MODAL */}
      {isNewFakeQRModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px'
        }}>
          <div className="glass-panel-gold animate-fade-in" style={{
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            background: '#0e1424',
            border: '2px solid rgba(239, 68, 68, 0.6)',
            boxShadow: '0 0 35px rgba(239, 68, 68, 0.35)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Ghost size={22} color="#ef4444" />
              <h3 style={{ fontSize: '18px', color: '#fca5a5', margin: 0 }}>
                Generate Custom Fake / Decoy QR
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Create a deceptive campus checkpoint badge. When scanned, it triggers the troll meme photo, Malayalam quote, and logs security telemetry!
            </p>

            <form onSubmit={handleCreateFakeQR}>
              {/* Fake Location Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#fca5a5', marginBottom: '4px', fontWeight: 600 }}>
                  Decoy Location Name (e.g. Station Name) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Main Canteen Rooftop / Physics Lab Terraces"
                  className="input-field"
                  value={newFakeLocation}
                  onChange={(e) => setNewFakeLocation(e.target.value)}
                />
              </div>

              {/* Fake Question / Lore Title */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Fake Question / Cryptic Lore Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Alchemist's Lost Flask / Mystery Station #9"
                  className="input-field"
                  value={newFakeTitle}
                  onChange={(e) => setNewFakeTitle(e.target.value)}
                />
              </div>

              {/* Fake Subtitle / Hint */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Subtitle / Badge Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deceptive Campus Checkpoint / High Priority Zone"
                  className="input-field"
                  value={newFakeSubtitle}
                  onChange={(e) => setNewFakeSubtitle(e.target.value)}
                />
              </div>

              {/* Custom QR Identifier */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  QR Identifier Code (Leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="e.g. QR-DECOY-CANTEEN-09"
                  className="input-field"
                  value={newFakeCode}
                  onChange={(e) => setNewFakeCode(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Fake Access Key */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Fake Access Key Badge (Leave blank for random 6-char key)
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="e.g. TRAP88"
                  className="input-field"
                  value={newFakeKey}
                  onChange={(e) => setNewFakeKey(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={isCreatingFakeQR}
                  className="btn-gold"
                  style={{
                    flex: 1,
                    padding: '11px',
                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    border: '1px solid #fca5a5',
                    color: '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  {isCreatingFakeQR ? 'Generating...' : 'Generate Decoy QR Badge'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewFakeQRModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '11px 18px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
