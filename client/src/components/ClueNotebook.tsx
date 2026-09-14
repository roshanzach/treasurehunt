import React, { useState } from 'react';
import { BookOpen, X, Key, MapPin, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { getMediaUrl, detectMediaType } from '../utils/media';

export interface UnlockedClue {
  step?: number;
  level: number;
  title?: string;
  questionType?: string;
  questionContent?: string;
  questionMediaUrl?: string | null;
  locationHintType: string;
  locationHintContent: string;
  locationHintMediaUrl: string | null;
  nextAccessKey: string | null;
  unlockedAt?: string;
}

interface ClueNotebookProps {
  isOpen: boolean;
  onClose: () => void;
  clues: UnlockedClue[];
}

export const ClueNotebook: React.FC<ClueNotebookProps> = ({
  isOpen,
  onClose,
  clues,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '560px',
        width: '100%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        position: 'relative',
        background: '#0d1322',
        border: '1px solid var(--border-gold)',
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '8px',
              borderRadius: '8px',
              color: '#fbbf24'
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', color: '#fbbf24' }}>Explorer's Clue Notebook</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>All unlocked location clues and access keys</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '8px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Clue List */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {clues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <MapPin size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notebook is currently empty</p>
              <p style={{ fontSize: '13px' }}>Solve checkpoints to reveal location hints and next access keys.</p>
            </div>
          ) : (
            clues.map((clue) => (
              <div
                key={clue.level}
                className="glass-panel"
                style={{
                  padding: '16px',
                  background: 'rgba(18, 24, 38, 0.8)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#0b0f19',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    STATION {clue.step || clue.level} BRIEFING
                  </span>
                  {clue.title && (
                    <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 600 }}>
                      {clue.title}
                    </span>
                  )}
                </div>

                {/* Question / Puzzle Media Attachment if available */}
                {clue.questionMediaUrl && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      <ImageIcon size={14} />
                      <span>STATION PUZZLE MEDIA:</span>
                    </div>
                    {detectMediaType(clue.questionMediaUrl, clue.questionType) === 'IMAGE' && (
                      <img
                        src={getMediaUrl(clue.questionMediaUrl)}
                        alt="Station Puzzle"
                        style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    )}
                    {detectMediaType(clue.questionMediaUrl, clue.questionType) === 'AUDIO' && (
                      <audio controls src={getMediaUrl(clue.questionMediaUrl)} style={{ width: '100%', height: '36px' }} />
                    )}
                    {detectMediaType(clue.questionMediaUrl, clue.questionType) === 'VIDEO' && (
                      <video controls src={getMediaUrl(clue.questionMediaUrl)} style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px' }} />
                    )}
                  </div>
                )}

                {/* Location Hint */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    <MapPin size={14} />
                    <span>LOCATION RIDDLE / CLUE:</span>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    lineHeight: 1.5
                  }}>
                    {clue.locationHintContent}

                    {/* Location Hint Media */}
                    {clue.locationHintMediaUrl && (
                      <div style={{ marginTop: '10px' }}>
                        {detectMediaType(clue.locationHintMediaUrl, clue.locationHintType) === 'IMAGE' && (
                          <img
                            src={getMediaUrl(clue.locationHintMediaUrl)}
                            alt="Location Hint"
                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'contain' }}
                          />
                        )}
                        {detectMediaType(clue.locationHintMediaUrl, clue.locationHintType) === 'AUDIO' && (
                          <audio controls src={getMediaUrl(clue.locationHintMediaUrl)} style={{ width: '100%', height: '36px' }} />
                        )}
                        {detectMediaType(clue.locationHintMediaUrl, clue.locationHintType) === 'VIDEO' && (
                          <video controls src={getMediaUrl(clue.locationHintMediaUrl)} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Access Key */}
                {clue.nextAccessKey && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px dashed rgba(245, 158, 11, 0.4)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={16} color="#fbbf24" />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Station Access Key:
                      </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#fbbf24', letterSpacing: '0.1em' }}>
                        {clue.nextAccessKey}
                      </strong>
                    </div>

                    <button
                      onClick={() => handleCopy(clue.nextAccessKey!)}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                    >
                      {copiedKey === clue.nextAccessKey ? (
                        <>
                          <Check size={12} color="#10b981" />
                          <span style={{ color: '#10b981' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 18px', fontSize: '13px' }}>
            Close Notebook
          </button>
        </div>

      </div>
    </div>
  );
};
