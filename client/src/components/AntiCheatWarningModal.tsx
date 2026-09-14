import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface AntiCheatWarningModalProps {
  isOpen: boolean;
  reason: string;
  violationCount: number;
  onDismiss: () => void;
}

export const AntiCheatWarningModal: React.FC<AntiCheatWarningModalProps> = ({
  isOpen,
  reason,
  violationCount,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 5, 5, 0.92)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px',
    }}>
      <div className="glass-panel animate-shake" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '28px',
        textAlign: 'center',
        background: '#180a0a',
        border: '2px solid rgba(239, 68, 68, 0.7)',
        boxShadow: '0 0 35px rgba(239, 68, 68, 0.4)',
      }}>
        
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 16px auto',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '2px solid #ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ShieldAlert size={36} color="#ef4444" />
        </div>

        <h3 style={{ fontSize: '20px', color: '#f87171', marginBottom: '8px' }}>
          ANTI-CHEAT WARNING
        </h3>

        <p style={{ fontSize: '14px', color: '#fca5a5', marginBottom: '14px', lineHeight: 1.5 }}>
          {reason}
        </p>

        <div style={{
          background: 'rgba(0,0,0,0.5)',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={16} color="#f59e0b" />
          <span>Total Recorded Violations: <strong style={{ color: '#ef4444' }}>{violationCount}</strong></span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          All telemetry events, tab switches, and inspection attempts are logged in real-time with the Game Master. Repeated violations will result in immediate disqualification.
        </p>

        <button
          onClick={onDismiss}
          className="btn-danger"
          style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
        >
          I Understand & Return to Hunt
        </button>

      </div>
    </div>
  );
};
