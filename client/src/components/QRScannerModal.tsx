import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { sound } from '../utils/audio';
import { X, Camera, ArrowRight } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrIdentifier: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-reader-video-box';

  const extractQRIdentifier = (text: string): string => {
    // If it's a full URL like https://domain.com/hunt?qr=QR-L1-GATEWAY-A1
    try {
      if (text.includes('qr=')) {
        const url = new URL(text);
        const qr = url.searchParams.get('qr');
        if (qr) return qr;
      }
    } catch {
      // Not a full URL, treat as raw identifier
    }
    return text.trim();
  };

  const handleSuccess = (decodedText: string) => {
    const cleanId = extractQRIdentifier(decodedText);
    sound.playScan();
    stopScanner();
    onScanSuccess(cleanId);
  };

  const startScanner = async () => {
    try {
      setScannerError(null);
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        (_errorMessage) => {
          // ignore scan framing misses
        }
      );
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start failed:', err);
      setScannerError('Could not start camera feed. Please allow camera permissions or enter QR code manually below.');
      setCameraActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM to render #qr-reader-video-box
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const cleanId = extractQRIdentifier(manualCode);
    sound.playScan();
    stopScanner();
    onScanSuccess(cleanId);
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
        maxWidth: '480px',
        width: '100%',
        padding: '24px',
        position: 'relative',
        background: '#0d1322',
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '8px',
              borderRadius: '8px',
              color: '#fbbf24'
            }}>
              <Camera size={20} />
            </div>
            <h3 style={{ fontSize: '18px', color: '#fbbf24' }}>Scan Checkpoint QR</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '8px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: '260px',
          background: '#000',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-gold)',
          marginBottom: '16px',
        }}>
          <div id={readerElementId} style={{ width: '100%' }} />
          {!cameraActive && scannerError && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#f87171', fontSize: '13px' }}>
              {scannerError}
            </div>
          )}
        </div>

        {/* Manual Fallback Input */}
        <form onSubmit={handleManualSubmit} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Or enter Checkpoint QR Code manually:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. QR-L1-GATEWAY-A1"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <button type="submit" className="btn-gold" style={{ padding: '10px 16px' }}>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
