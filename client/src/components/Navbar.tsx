import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/audio';
import {
  Compass,
  Trophy,
  BookOpen,
  Shield,
  LogOut,
  Volume2,
  VolumeX,
  QrCode,
} from 'lucide-react';

interface NavbarProps {
  onOpenNotebook?: () => void;
  onOpenQRScanner?: () => void;
  unlockedCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNotebook,
  onOpenQRScanner,
  unlockedCount = 0,
}) => {
  const { role, team, admin, logout } = useAuth();
  const navigate = useNavigate();
  const [audioMuted, setAudioMuted] = useState(false);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setAudioMuted(!sound.enabled);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="glass-panel" style={{ margin: '12px auto', maxWidth: '1200px', padding: '12px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)'
          }}>
            <Compass size={24} color="#0d1117" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '18px', color: '#fbbf24', letterSpacing: '0.04em' }}>
              TREASURE HUNT
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              The Sovereign Vault
            </div>
          </div>
        </Link>

        {/* Center / Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          {role === 'PARTICIPANT' && (
            <>
              {onOpenQRScanner && (
                <button
                  onClick={onOpenQRScanner}
                  className="btn-gold"
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                >
                  <QrCode size={16} />
                  <span>Scan QR</span>
                </button>
              )}

              {onOpenNotebook && (
                <button
                  onClick={onOpenNotebook}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '13px', position: 'relative' }}
                >
                  <BookOpen size={16} color="#fbbf24" />
                  <span>Notebook</span>
                  {unlockedCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#f59e0b',
                      color: '#000',
                      fontSize: '11px',
                      fontWeight: 800,
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {unlockedCount}
                    </span>
                  )}
                </button>
              )}
            </>
          )}

          <Link
            to="/leaderboard"
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <Trophy size={16} color="#34d399" />
            <span>Leaderboard</span>
          </Link>

          {role === 'ADMIN' && (
            <Link
              to="/admin/dashboard"
              className="btn-emerald"
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              <Shield size={16} />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Right Status & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          <button
            onClick={toggleSound}
            className="btn-secondary"
            style={{ padding: '8px', borderRadius: '10px' }}
            title={audioMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {audioMuted ? <VolumeX size={18} color="#94a3b8" /> : <Volume2 size={18} color="#fbbf24" />}
          </button>

          {team && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '6px 12px',
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fde047' }}>
                {team.teamName}
              </div>
              <span style={{
                background: '#f59e0b',
                color: '#000',
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                Lvl {team.currentLevel}
              </span>
            </div>
          )}

          {admin && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#34d399',
              fontWeight: 600
            }}>
              Master: {admin.username}
            </div>
          )}

          {(team || admin) ? (
            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: '8px', borderRadius: '10px' }}
              title="Logout"
            >
              <LogOut size={18} color="#ef4444" />
            </button>
          ) : (
            <Link
              to="/admin/login"
              style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              Admin Portal
            </Link>
          )}
        </div>

      </div>
    </header>
  );
};
