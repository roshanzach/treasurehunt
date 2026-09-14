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
} from 'lucide-react';
import { getMediaUrl } from '../utils/media';

interface TeamItem {
  id: string;
  teamName: string;
  teamCode: string;
  startLevel?: number;
  startLocationName?: string;
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

  const [activeTab, setActiveTab] = useState<'TEAMS' | 'QUESTIONS' | 'QR_CARDS' | 'SUBMISSIONS' | 'SECURITY' | 'LEADERBOARD' | 'SETTINGS'>('TEAMS');

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

  // QR Code Printable Preview
  const [qrCodeDataList, setQrCodeDataList] = useState<any[]>([]);

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

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchTeams(),
      fetchQuestions(),
      fetchSubmissions(),
      fetchSecurityLogs(),
      fetchLeaderboard(),
      fetchSettings(),
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
        }),
      });
      if (res.ok) {
        setIsNewTeamModalOpen(false);
        setNewTeamName('');
        setNewTeamCode('');
        setNewTeamPassword('');
        setNewTeamStartLevel(0);
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
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
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

                        {/* Device Info */}
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
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
                onClick={() => window.print()}
                className="btn-gold"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Printer size={16} />
                <span>Download PDF / Print All Badges</span>
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
                    padding: '24px',
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    border: '4px solid #f59e0b',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#d97706',
                    marginBottom: '4px'
                  }}>
                    CAMPUS TREASURE HUNT CHECKPOINT
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '4px', color: '#0f172a' }}>
                    STATION {qr.level}: {qr.locationName || qr.title}
                  </h3>

                  {qr.locationName && (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', marginBottom: '10px' }}>
                      📍 {qr.title}
                    </div>
                  )}

                  <div style={{
                    display: 'inline-block',
                    padding: '8px',
                    background: '#000000',
                    borderRadius: '12px',
                    marginBottom: '12px'
                  }}>
                    <img
                      src={qr.qrDataUrl}
                      alt={`QR Level ${qr.level}`}
                      style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
                    />
                  </div>

                  {qr.accessKey && (
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                      Organizer Key Reference: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{qr.accessKey}</strong>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Scan with the in-app camera scanner to reveal the puzzle
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
          <div className="glass-panel-gold animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '24px', background: '#0e1424' }}>
            <h3 style={{ fontSize: '18px', color: '#fbbf24', marginBottom: '16px' }}>Register Participant Team</h3>
            <form onSubmit={handleCreateTeam}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phoenix Seekers"
                  className="input-field"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Team Code (Login Username)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PHOENIX"
                  className="input-field"
                  value={newTeamCode}
                  onChange={(e) => setNewTeamCode(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Designated Starting Station
                </label>
                <select
                  className="input-field"
                  value={newTeamStartLevel}
                  onChange={(e) => setNewTeamStartLevel(parseInt(e.target.value, 10))}
                >
                  <option value={0}>Auto-Balance (Distribute evenly among stations)</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.level}>
                      Station {q.level}: {q.locationName || q.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1, padding: '10px' }}>Create Team</button>
                <button type="button" onClick={() => setIsNewTeamModalOpen(false)} className="btn-secondary" style={{ padding: '10px 16px' }}>Cancel</button>
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

    </div>
  );
};
