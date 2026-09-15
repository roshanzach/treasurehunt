import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { sound } from '../utils/audio';
import { Navbar } from '../components/Navbar';
import { QRScannerModal } from '../components/QRScannerModal';
import { AccessKeyModal } from '../components/AccessKeyModal';
import { ClueNotebook, UnlockedClue } from '../components/ClueNotebook';
import { AntiCheatWarningModal } from '../components/AntiCheatWarningModal';
import {
  Compass,
  QrCode,
  MapPin,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Copy,
  Check,
  Award,
  Key,
  Navigation,
  BookOpen,
  AlertOctagon,
  Ghost,
} from 'lucide-react';
import { getMediaUrl, detectMediaType } from '../utils/media';

interface QuestionData {
  id: string;
  level: number;
  title: string;
  questionType: string;
  questionContent: string;
  questionMediaUrl?: string | null;
}

interface SolvedReward {
  isHuntCompleted: boolean;
  message: string;
  locationHint: {
    type: string;
    content: string;
    mediaUrl?: string | null;
  };
  nextTitle?: string | null;
  nextAccessKey?: string | null;
  nextLevel?: number | null;
}

interface ActiveCheckpointInfo {
  step: number;
  totalSteps: number;
  targetLevel: number;
  title: string;
  locationHintType: string;
  locationHintContent: string;
  locationHintMediaUrl?: string | null;
  accessKey: string;
  isStartingPoint: boolean;
}

export const HuntPage: React.FC = () => {
  const { token, team, refreshProfile, updateTeamProfile } = useAuth();

  // Modals & Drawers
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [pendingQRIdentifier, setPendingQRIdentifier] = useState<string | null>(null);
  const [keyModalLevel, setKeyModalLevel] = useState<number>(1);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Active Game State
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<{ isError: boolean; message: string } | null>(null);
  const [solvedReward, setSolvedReward] = useState<SolvedReward | null>(null);
  const [unlockedClues, setUnlockedClues] = useState<UnlockedClue[]>([]);
  const [activeCheckpoint, setActiveCheckpoint] = useState<ActiveCheckpointInfo | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [isFakeQRTrollOpen, setIsFakeQRTrollOpen] = useState(false);
  const [fakeQRTrollQuote, setFakeQRTrollQuote] = useState<string>(
    'ഇരുട്ടുപിടിച്ച മൂലകളിൽ കയറി കണ്ട കറുപ്പും വെളുപ്പും വരകളൊക്കെ സ്കാൻ ചെയ്യാനാണോ നിന്നെ വീട്ടുകാർ കോളേജിലോട്ട് വിട്ടത്?'
  );

  // Anti-Cheat Engine Hook
  const { warningModalOpen, lastViolationReason, violationCount, dismissWarning } = useAntiCheat(true);

  // Load hunt status & inventory
  const fetchInventoryAndStatus = async () => {
    if (!token) return;
    try {
      const [statusRes, invRes] = await Promise.all([
        fetch('/api/hunt/status', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hunt/inventory', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setTotalQuestions(sData.hunt?.totalQuestions || 10);
        if (sData.team) {
          updateTeamProfile(sData.team);
        }
        if (sData.activeCheckpoint) {
          setActiveCheckpoint(sData.activeCheckpoint);
        }
      }

      if (invRes.ok) {
        const iData = await invRes.json();
        setUnlockedClues(iData.inventory || []);
      }
    } catch (err) {
      console.error('Error fetching hunt info', err);
    }
  };

  useEffect(() => {
    fetchInventoryAndStatus();
  }, [token]);

  // Handle QR Scan
  const handleQRScanSuccess = async (qrIdentifier: string, accessKey?: string) => {
    setIsQRModalOpen(false);
    setAnswerFeedback(null);
    setSolvedReward(null);

    try {
      const res = await fetch('/api/hunt/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qrIdentifier, accessKey }),
      });

      const data = await res.json();

      if (data.status === 'FAKE_QR' || data.isFake) {
        sound.playError();
        if (data.trollQuote) {
          setFakeQRTrollQuote(data.trollQuote);
        }
        setIsFakeQRTrollOpen(true);
        return;
      }

      if (!res.ok) {
        if (data.status === 'KEY_REQUIRED') {
          // Level requires access key
          setPendingQRIdentifier(qrIdentifier);
          setKeyModalLevel(data.level || (team?.currentLevel || 1));
          setKeyError(null);
          setIsKeyModalOpen(true);
          return;
        }

        if (data.status === 'INVALID_KEY') {
          sound.playError();
          setKeyError(data.error || 'Invalid 6-character access key.');
          return;
        }

        sound.playError();
        alert(data.error || 'Failed to unlock question.');
        return;
      }

      // Question successfully unlocked!
      sound.playUnlock();
      setIsKeyModalOpen(false);
      setPendingQRIdentifier(null);
      setActiveQuestion(data.question);

      if (data.status === 'ALREADY_SOLVED') {
        setSolvedReward({
          isHuntCompleted: false,
          message: 'You have already conquered this checkpoint! Review the clue below.',
          locationHint: data.locationHint,
          nextAccessKey: data.accessKey,
        });
      }
    } catch (err) {
      sound.playError();
      alert('Network error while accessing question.');
    }
  };

  // Handle Access Key Submission
  const handleAccessKeySubmit = async (key: string) => {
    if (!pendingQRIdentifier) return;
    await handleQRScanSuccess(pendingQRIdentifier, key);
  };

  // Submit Answer
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedAnswer.trim() || !activeQuestion || isSubmitting) return;

    setIsSubmitting(true);
    setAnswerFeedback(null);

    try {
      const res = await fetch('/api/hunt/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId: activeQuestion.id,
          answer: submittedAnswer,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        sound.playError();
        setAnswerFeedback({ isError: true, message: data.error || 'Submission failed.' });
        return;
      }

      if (!data.isCorrect) {
        sound.playError();
        setAnswerFeedback({ isError: true, message: data.message || 'Incorrect answer. Try again!' });
        return;
      }

      // CORRECT ANSWER!
      sound.playSuccess();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#10b981', '#34d399', '#ffffff'],
      });

      setSolvedReward({
        isHuntCompleted: data.isHuntCompleted,
        message: data.message,
        locationHint: data.locationHint,
        nextTitle: data.nextTitle,
        nextAccessKey: data.nextAccessKey,
        nextLevel: data.nextLevel,
      });

      setSubmittedAnswer('');
      refreshProfile();
      fetchInventoryAndStatus();
    } catch (err) {
      sound.playError();
      setAnswerFeedback({ isError: true, message: 'Failed to submit answer.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const currentLevel = team?.currentLevel || 1;
  const isCompleted = team?.isCompleted || false;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Top Navigation */}
      <Navbar
        onOpenNotebook={() => setIsNotebookOpen(true)}
        onOpenQRScanner={() => setIsQRModalOpen(true)}
        unlockedCount={unlockedClues.length}
      />

      <main className="container-mobile" style={{ marginTop: '20px' }}>
        {/* Level Progression Header Card */}
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid var(--border-gold)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={20} color="#fbbf24" />
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 700,
                  color: '#fbbf24',
                  fontSize: '15px',
                }}
              >
                HUNT PROGRESSION
              </span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {isCompleted
                ? 'All 10 Checkpoints Solved!'
                : `Station ${currentLevel} of ${totalQuestions}`}
            </span>
          </div>

          {/* Progression Bar */}
          <div
            style={{
              width: '100%',
              height: '10px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '5px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${
                  isCompleted
                    ? 100
                    : Math.max(10, ((currentLevel - 1) / totalQuestions) * 100)
                }%`,
                height: '100%',
                background: isCompleted
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>

        {/* Victory Screen if Hunt Completed */}
        {isCompleted ? (
          <div
            className="glass-panel-gold animate-fade-in"
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: '#0e1628',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 20px auto',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
              }}
            >
              <Award size={48} color="#ffffff" />
            </div>

            <h1
              style={{
                fontSize: '28px',
                color: '#fbbf24',
                marginBottom: '10px',
              }}
            >
              TREASURE UNLOCKED!
            </h1>

            <p
              style={{
                fontSize: '15px',
                color: 'var(--text-primary)',
                marginBottom: '24px',
                lineHeight: 1.6,
              }}
            >
              Congratulations{' '}
              <strong style={{ color: '#fde047' }}>{team?.teamName}</strong>! You
              have successfully deciphered all 10 campus checkpoint riddles and
              conquered the Sovereign Vault!
            </p>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '24px',
                fontSize: '14px',
                color: '#34d399',
              }}
            >
              🏆 Proceed immediately to the Main Stage / Organizer Desk to verify
              your official ranking and claim your award!
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsNotebookOpen(true)}
                className="btn-gold"
                style={{ padding: '12px 20px' }}
              >
                Review Solved Clues
              </button>
            </div>
          </div>
        ) : activeQuestion ? (
          /* Active Question Solver Card */
          <div
            className="glass-panel-gold animate-fade-in"
            style={{ padding: '24px', background: '#0d1322' }}
          >
            {/* Question Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0b0f19',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                }}
              >
                CHECKPOINT STATION {currentLevel}
              </span>

              <button
                onClick={() => setIsQRModalOpen(true)}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
              >
                <QrCode size={14} />
                <span>Rescan</span>
              </button>
            </div>

            <h2 style={{ fontSize: '20px', color: '#fbbf24', marginBottom: '16px' }}>
              {activeQuestion.title}
            </h2>

            {/* Media Clue Display */}
            {activeQuestion.questionMediaUrl && (
              <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                {detectMediaType(activeQuestion.questionMediaUrl, activeQuestion.questionType) === 'IMAGE' && (
                  <img
                    src={getMediaUrl(activeQuestion.questionMediaUrl)}
                    alt="Question Clue"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '12px',
                      objectFit: 'contain',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    }}
                  />
                )}
                {detectMediaType(activeQuestion.questionMediaUrl, activeQuestion.questionType) === 'AUDIO' && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#fbbf24',
                        marginBottom: '10px',
                      }}
                    >
                      <Volume2 size={18} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        Listen carefully to the audio clue:
                      </span>
                    </div>
                    <audio
                      controls
                      src={getMediaUrl(activeQuestion.questionMediaUrl)}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
                {detectMediaType(activeQuestion.questionMediaUrl, activeQuestion.questionType) === 'VIDEO' && (
                  <video
                    controls
                    src={getMediaUrl(activeQuestion.questionMediaUrl)}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                )}
              </div>
            )}

            {/* Question Text / Riddle Content */}
            <div
              style={{
                background: 'rgba(10, 15, 26, 0.75)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '18px',
                fontSize: '15px',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                marginBottom: '24px',
              }}
            >
              {activeQuestion.questionContent}
            </div>

            {/* If not yet solved on screen: Answer Submission Form */}
            {!solvedReward ? (
              <form onSubmit={handleAnswerSubmit}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                  }}
                >
                  Enter Your Answer:
                </label>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Type your solution here..."
                    className="input-field"
                    value={submittedAnswer}
                    onChange={(e) => setSubmittedAnswer(e.target.value)}
                    style={{ fontSize: '15px' }}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !submittedAnswer.trim()}
                    className="btn-gold"
                    style={{ padding: '0 20px', whiteSpace: 'nowrap' }}
                  >
                    <Send size={16} />
                    <span>{isSubmitting ? 'Checking...' : 'Submit'}</span>
                  </button>
                </div>

                {answerFeedback && (
                  <div
                    className="animate-shake"
                    style={{
                      background: answerFeedback.isError
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                      border: `1px solid ${
                        answerFeedback.isError
                          ? 'rgba(239, 68, 68, 0.4)'
                          : 'rgba(16, 185, 129, 0.4)'
                      }`,
                      color: answerFeedback.isError ? '#fca5a5' : '#6ee7b7',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {answerFeedback.isError ? (
                      <AlertCircle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>{answerFeedback.message}</span>
                  </div>
                )}
              </form>
            ) : (
              /* Correct Answer Revealed Reward Box */
              <div
                className="animate-fade-in"
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '14px',
                  padding: '20px',
                  marginTop: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#34d399',
                    marginBottom: '12px',
                  }}
                >
                  <Sparkles size={22} />
                  <strong style={{ fontSize: '16px' }}>
                    {solvedReward.message}
                  </strong>
                </div>

                {/* Location Hint Card */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginBottom: '4px',
                    }}
                  >
                    <MapPin size={14} color="#fbbf24" />
                    <span>
                      CLUE FOR NEXT STATION{' '}
                      {solvedReward.nextLevel ? `(STATION ${solvedReward.nextLevel})` : ''}
                      :
                    </span>
                  </div>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      color: '#f8fafc',
                      lineHeight: 1.5,
                    }}
                  >
                    {solvedReward.locationHint.content}

                    {/* Next Station Clue Media */}
                    {solvedReward.locationHint.mediaUrl && (
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        {detectMediaType(solvedReward.locationHint.mediaUrl, solvedReward.locationHint.type) === 'IMAGE' && (
                          <img
                            src={getMediaUrl(solvedReward.locationHint.mediaUrl)}
                            alt="Next Station Clue"
                            style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                        )}
                        {detectMediaType(solvedReward.locationHint.mediaUrl, solvedReward.locationHint.type) === 'AUDIO' && (
                          <audio controls src={getMediaUrl(solvedReward.locationHint.mediaUrl)} style={{ width: '100%', height: '36px' }} />
                        )}
                        {detectMediaType(solvedReward.locationHint.mediaUrl, solvedReward.locationHint.type) === 'VIDEO' && (
                          <video controls src={getMediaUrl(solvedReward.locationHint.mediaUrl)} style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px' }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Access Key Card */}
                {solvedReward.nextAccessKey && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px dashed rgba(245, 158, 11, 0.5)',
                      padding: '14px',
                      borderRadius: '10px',
                      marginBottom: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                      }}
                    >
                      🔑 NEXT STATION ACCESS KEY (STATION{' '}
                      {solvedReward.nextLevel || currentLevel + 1}):
                    </div>
                    <div className="key-badge" style={{ marginBottom: '8px' }}>
                      {solvedReward.nextAccessKey}
                    </div>
                    <div>
                      <button
                        onClick={() =>
                          handleCopyKey(solvedReward.nextAccessKey!)
                        }
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        {copiedKey ? (
                          <Check size={14} color="#10b981" />
                        ) : (
                          <Copy size={14} />
                        )}
                        <span>
                          {copiedKey ? 'Copied to Clipboard!' : 'Copy Key'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Next Action Button */}
                <button
                  onClick={() => {
                    setActiveQuestion(null);
                    setSolvedReward(null);
                    setIsQRModalOpen(true);
                  }}
                  className="btn-gold"
                  style={{ width: '100%', padding: '12px' }}
                >
                  <QrCode size={18} />
                  <span>Scan Next Station QR</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Checkpoint Cryptic Location Hint & Mission Briefing */
          <div
            className="glass-panel-gold animate-fade-in"
            style={{
              padding: '30px 24px',
              background: '#0d1322',
              border: '1px solid var(--border-gold)',
            }}
          >
            {/* Header Badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                <Navigation size={14} />
                <span>
                  {currentLevel === 1
                    ? 'INITIAL STARTING MISSION BRIEFING'
                    : `ACTIVE MISSION OBJECTIVE (STATION ${currentLevel} OF ${totalQuestions})`}
                </span>
              </div>

              <span
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                TEAM: {team?.teamCode}
              </span>
            </div>

            {/* Checkpoint Station Title */}
            <h2
              style={{
                fontSize: '22px',
                color: '#fbbf24',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MapPin size={22} color="#f59e0b" />
              <span>
                {activeCheckpoint?.title || `Checkpoint Station ${currentLevel}`}
              </span>
            </h2>

            {/* Cryptic Location Clue Box */}
            <div
              style={{
                background: 'rgba(10, 15, 26, 0.85)',
                border: '1px solid var(--border-gold)',
                borderRadius: '12px',
                padding: '18px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#34d399',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} />
                <span>Location Riddle:</span>
              </div>

              <p
                style={{
                  fontSize: '15px',
                  color: '#f8fafc',
                  lineHeight: 1.6,
                  margin: 0,
                  marginBottom: activeCheckpoint?.locationHintMediaUrl ? '14px' : 0,
                }}
              >
                {activeCheckpoint?.locationHintContent ||
                  'Decipher your active campus riddle to locate the checkpoint QR badge.'}
              </p>

              {/* Active Station Location Riddle Media */}
              {activeCheckpoint?.locationHintMediaUrl && (
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  {detectMediaType(activeCheckpoint.locationHintMediaUrl, activeCheckpoint.locationHintType) === 'IMAGE' && (
                    <img
                      src={getMediaUrl(activeCheckpoint.locationHintMediaUrl)}
                      alt="Location Clue Photo"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '260px',
                        borderRadius: '10px',
                        objectFit: 'contain',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                      }}
                    />
                  )}
                  {detectMediaType(activeCheckpoint.locationHintMediaUrl, activeCheckpoint.locationHintType) === 'AUDIO' && (
                    <audio controls src={getMediaUrl(activeCheckpoint.locationHintMediaUrl)} style={{ width: '100%', height: '36px' }} />
                  )}
                  {detectMediaType(activeCheckpoint.locationHintMediaUrl, activeCheckpoint.locationHintType) === 'VIDEO' && (
                    <video controls src={getMediaUrl(activeCheckpoint.locationHintMediaUrl)} style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '10px' }} />
                  )}
                </div>
              )}
            </div>

            {/* Access Key Card */}
            {activeCheckpoint?.accessKey && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px dashed rgba(245, 158, 11, 0.4)',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      padding: '8px',
                      borderRadius: '8px',
                      color: '#fbbf24',
                    }}
                  >
                    <Key size={20} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Station Access Key:
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '18px',
                        fontWeight: 800,
                        color: '#fbbf24',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {activeCheckpoint.accessKey}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleCopyKey(activeCheckpoint.accessKey)}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '12px', gap: '6px' }}
                >
                  {copiedKey ? (
                    <>
                      <Check size={14} color="#10b981" />
                      <span style={{ color: '#10b981' }}>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Key</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="btn-gold"
                style={{ width: '100%', padding: '14px', fontSize: '15px' }}
              >
                <QrCode size={20} />
                <span>Scan Checkpoint QR Badge</span>
              </button>

              <button
                onClick={() => setIsNotebookOpen(true)}
                className="btn-secondary"
                style={{ width: '100%', padding: '10px', fontSize: '13px' }}
              >
                <BookOpen size={16} />
                <span>View Explorer Clue Notebook ({unlockedClues.length})</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals & Dialogs */}
      <QRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />

      <AccessKeyModal
        isOpen={isKeyModalOpen}
        level={keyModalLevel}
        onClose={() => setIsKeyModalOpen(false)}
        onSubmitKey={handleAccessKeySubmit}
        error={keyError}
        onOpenNotebook={() => setIsNotebookOpen(true)}
      />

      <ClueNotebook
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        clues={unlockedClues}
      />

      {/* Anti-Cheat Participant Warning Modal */}
      <AntiCheatWarningModal
        isOpen={warningModalOpen}
        reason={lastViolationReason}
        violationCount={violationCount}
        onDismiss={dismissWarning}
      />

      {/* Decoy / Fake QR Troll Modal */}
      {isFakeQRTrollOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
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
              whiteSpace: 'pre-line',
            }}>
              "{fakeQRTrollQuote}"
            </div>

            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.4',
              marginBottom: '20px',
            }}>
              ⚠️ You scanned a fake decoy QR! Review your active location riddle in the portal and look only for genuine checkpoints.
            </p>

            <button
              onClick={() => setIsFakeQRTrollOpen(false)}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 800,
              }}
            >
              Return to Active Riddle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
