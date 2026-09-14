import React, { useState } from 'react';
import { KeyRound, X, Unlock, HelpCircle } from 'lucide-react';

interface AccessKeyModalProps {
  isOpen: boolean;
  level: number;
  onClose: () => void;
  onSubmitKey: (key: string) => Promise<void>;
  error?: string | null;
  onOpenNotebook?: () => void;
}

export const AccessKeyModal: React.FC<AccessKeyModalProps> = ({
  isOpen,
  level,
  onClose,
  onSubmitKey,
  error,
  onOpenNotebook,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    setLoading(true);
    try {
      await onSubmitKey(keyInput.trim().toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
    }}>
      <div className="glass-panel-gold animate-fade-in" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '28px',
        position: 'relative',
        background: '#0e1424',
        textAlign: 'center'
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn-secondary"
          style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px', borderRadius: '8px' }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 16px auto',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)'
        }}>
          <KeyRound size={28} color="#fbbf24" />
        </div>

        <h3 style={{ fontSize: '20px', color: '#fbbf24', marginBottom: '8px' }}>
          Level {level} Access Key Required
        </h3>
        
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
          {level === 1
            ? <>Enter the <strong style={{ color: '#fbbf24' }}>6-character access key</strong> for Checkpoint 1 provided on the checkpoint badge or by the Game Master.</>
            : <>Enter the <strong style={{ color: '#fbbf24' }}>6-character alphanumeric key</strong> obtained upon solving Level {level - 1}.</>}
        </p>

        {error && (
          <div className="animate-shake" style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              maxLength={6}
              autoFocus
              className="input-field"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="••••••"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '0.3em',
                padding: '14px',
                fontWeight: 700,
                color: '#fbbf24',
                borderColor: 'var(--border-gold-bright)',
                backgroundColor: 'rgba(10, 15, 26, 0.9)'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-gold"
            disabled={keyInput.length < 4 || loading}
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
          >
            <Unlock size={18} />
            <span>{loading ? 'Verifying Key...' : 'Unlock Level ' + level}</span>
          </button>
        </form>

        {onOpenNotebook && (
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNotebook();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'underline'
              }}
            >
              <HelpCircle size={14} />
              <span>Forgot key? View unlocked keys in Notebook</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
