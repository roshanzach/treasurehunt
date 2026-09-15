import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sound } from '../utils/audio';
import { AlertOctagon, ArrowLeft, Ghost } from 'lucide-react';

export const MALAYALAM_TROLL_QUOTE =
  'ഇരുട്ടുപിടിച്ച മൂലകളിൽ കയറി കണ്ട കറുപ്പും വെളുപ്പും വരകളൊക്കെ സ്കാൻ ചെയ്യാനാണോ നിന്നെ വീട്ടുകാർ കോളേജിലോട്ട് വിട്ടത്?';

export const CGPA_TROLL_QUOTE =
  'If you analyzed your lecture slides with this much dedication, your CGPA wouldn’t look like a room temperature.\n\nHahahahahahahaha…………';

export const FakeQRPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const codeParam = (searchParams.get('code') || '').toUpperCase();
  const quoteParam = searchParams.get('quote') || '';

  const [activeQuote, setActiveQuote] = React.useState(
    codeParam.includes('CGPA') ? CGPA_TROLL_QUOTE : (quoteParam || MALAYALAM_TROLL_QUOTE)
  );

  useEffect(() => {
    sound.playError();
    if (codeParam) {
      fetch(`/api/fake-qr-info?code=${encodeURIComponent(codeParam)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.trollQuote) {
            setActiveQuote(data.trollQuote);
          }
        })
        .catch(() => {});
    }
  }, [codeParam]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #0b0f19 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
    }}>
      <div className="glass-panel-gold animate-fade-in" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '28px 24px',
        borderRadius: '20px',
        border: '2px solid rgba(239, 68, 68, 0.6)',
        boxShadow: '0 0 35px rgba(239, 68, 68, 0.35)',
        background: 'rgba(15, 23, 42, 0.92)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated Warning Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid #ef4444',
          color: '#fca5a5',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          <AlertOctagon size={16} color="#ef4444" />
          <span>DECOY CHECKPOINT TRAPPED!</span>
          <Ghost size={16} color="#ef4444" />
        </div>

        {/* Troll Photo Frame */}
        <div style={{
          width: '100%',
          maxWidth: '340px',
          margin: '0 auto 20px',
          borderRadius: '16px',
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
              maxHeight: '380px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        {/* Troll Roast Text */}
        <div style={{
          fontSize: '19px',
          lineHeight: '1.5',
          fontWeight: 800,
          color: '#fbbf24',
          marginBottom: '16px',
          textShadow: '0 2px 10px rgba(245, 158, 11, 0.3)',
          padding: '0 8px',
          whiteSpace: 'pre-line',
        }}>
          "{activeQuote}"
        </div>

        {/* Witty Subtitle */}
        <p style={{
          fontSize: '13px',
          color: '#94a3b8',
          lineHeight: '1.5',
          marginBottom: '24px',
        }}>
          ⚠️ You just scanned a campus decoy trap! Look closely at your active location riddle in your hunt portal and only scan the genuine checkpoint badges.
        </p>

        {/* Back to Hunt Button */}
        <button
          onClick={() => navigate('/hunt')}
          className="btn-gold"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderRadius: '12px',
          }}
        >
          <ArrowLeft size={18} />
          <span>Return to Treasure Hunt Portal</span>
        </button>
      </div>
    </div>
  );
};
