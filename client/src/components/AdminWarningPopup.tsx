import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Megaphone, Check } from 'lucide-react';

export const AdminWarningPopup: React.FC = () => {
  const { adminWarningMessage, dismissAdminWarning } = useSocket();

  if (!adminWarningMessage) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: '16px',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '28px',
        textAlign: 'center',
        background: '#1a1006',
        border: '2px solid #f59e0b',
        boxShadow: '0 0 35px rgba(245, 158, 11, 0.5)',
      }}>
        
        <div style={{
          width: '60px',
          height: '60px',
          margin: '0 auto 16px auto',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.2)',
          border: '2px solid #f59e0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Megaphone size={30} color="#fbbf24" />
        </div>

        <h3 style={{ fontSize: '20px', color: '#fbbf24', marginBottom: '10px' }}>
          Message from Game Master
        </h3>

        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '16px',
          borderRadius: '12px',
          color: 'var(--text-primary)',
          fontSize: '15px',
          lineHeight: 1.5,
          marginBottom: '24px',
          fontStyle: 'italic',
        }}>
          "{adminWarningMessage}"
        </div>

        <button
          onClick={dismissAdminWarning}
          className="btn-gold"
          style={{ width: '100%', padding: '12px', fontSize: '14px' }}
        >
          <Check size={18} />
          <span>Acknowledge Message</span>
        </button>

      </div>
    </div>
  );
};
