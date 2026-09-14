import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDeviceInfo } from '../utils/device';
import { Compass, Key, Lock, ArrowRight, ShieldCheck, Radio, AlertCircle } from 'lucide-react';

export const ParticipantLogin: React.FC = () => {
  const { loginTeam, isDeviceApproved, deviceId, team, logout } = useAuth();
  const navigate = useNavigate();

  const [teamCode, setTeamCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [waitingTeamName, setWaitingTeamName] = useState<string>('');

  const handleCancelAndSwitch = () => {
    setIsWaitingApproval(false);
    setWaitingTeamName('');
    setTeamCode('');
    setPassword('');
    setError(null);
    logout();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const deviceInfo = getDeviceInfo();
      const res = await fetch('/api/auth/team-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamCode: teamCode.trim().toUpperCase(),
          password,
          deviceId,
          deviceInfo,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      if (data.status === 'PENDING_APPROVAL' || !data.isApproved) {
        loginTeam(data.token, data.team, false);
        setWaitingTeamName(data.team.teamName);
        setIsWaitingApproval(true);
      } else {
        loginTeam(data.token, data.team, true);
        navigate('/hunt');
      }
    } catch (err: any) {
      setError('Unable to connect to hunt server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // If approved via WebSocket while on waiting screen, auto-redirect
  React.useEffect(() => {
    if (isWaitingApproval && isDeviceApproved) {
      navigate('/hunt');
    }
  }, [isWaitingApproval, isDeviceApproved, navigate]);

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div className="container-mobile" style={{ width: '100%' }}>

        {isWaitingApproval || (team && !isDeviceApproved) ? (
          /* Awaiting Admin Approval Radar Screen */
          <div className="glass-panel-gold animate-fade-in" style={{ padding: '36px 24px', textAlign: 'center', background: '#0c1220' }}>
            
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px auto',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '2px solid #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }} className="pulse-radar">
              <Radio size={40} color="#fbbf24" />
            </div>

            <h2 style={{ fontSize: '24px', color: '#fbbf24', marginBottom: '8px' }}>
              Device Awaiting Approval
            </h2>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              Welcome, <strong style={{ color: '#fde047' }}>{waitingTeamName || team?.teamName}</strong>! Your device registration request has been dispatched to the Game Master.
            </p>

            <div style={{
              background: 'rgba(10, 15, 26, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              fontSize: '13px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Device Fingerprint:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>{deviceId.slice(0, 14)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Device Info:</span>
                <span style={{ color: 'var(--text-primary)' }}>{getDeviceInfo()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Approval Status:</span>
                <span style={{ color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                  Pending Game Master Approval
                </span>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              ⚡ This screen will automatically unlock the moment the organizer approves your device. No need to refresh.
            </p>

            <button
              type="button"
              onClick={handleCancelAndSwitch}
              className="btn-secondary"
              style={{ fontSize: '13px', padding: '8px 18px', cursor: 'pointer' }}
            >
              Cancel & Switch Account
            </button>

          </div>
        ) : (
          /* Main Participant Login Form */
          <div className="glass-panel-gold animate-fade-in" style={{ padding: '36px 28px', background: '#0e1424' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px auto',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.4)'
              }}>
                <Compass size={36} color="#0d1117" />
              </div>
              <h1 style={{ fontSize: '26px', color: '#fbbf24', marginBottom: '6px' }}>
                Team Portal
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Enter your credentials to enter the sovereign treasure hunt
              </p>
            </div>

            {error && (
              <div className="animate-shake" style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={18} color="#ef4444" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Team Code
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ALPHA, GALLEON"
                    className="input-field"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', paddingLeft: '40px' }}
                  />
                  <Key size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Team Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold"
                style={{ width: '100%', padding: '14px', fontSize: '15px' }}
              >
                <span>{loading ? 'Authenticating...' : 'Enter Sovereign Hunt'}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#10b981" />
                <span>Single Device Secured</span>
              </div>
              <Link to="/admin/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Admin Portal &rarr;
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
