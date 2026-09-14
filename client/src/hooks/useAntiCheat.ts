import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/audio';

export function useAntiCheat(isActive: boolean = true) {
  const { role, token } = useAuth();
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState<string>('');
  const [violationCount, setViolationCount] = useState<number>(0);
  const lastReportRef = useRef<number>(0);

  const reportCheat = async (eventType: string, details: string) => {
    // Throttle duplicate events within 3 seconds
    const now = Date.now();
    if (now - lastReportRef.current < 3000) return;
    lastReportRef.current = now;

    try {
      sound.playWarning();
      setLastViolationReason(details);
      setWarningModalOpen(true);
      setViolationCount((prev) => prev + 1);

      if (token && role === 'PARTICIPANT') {
        await fetch('/api/hunt/report-cheat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ eventType, details }),
        });
      }
    } catch (err) {
      console.error('Failed to report telemetry', err);
    }
  };

  useEffect(() => {
    if (!isActive || role !== 'PARTICIPANT') return;

    // 1. Visibility Change (Tab Switch / Minimized)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Participant navigated away from tab
      } else {
        // Returned back to tab
        reportCheat(
          'TAB_SWITCH',
          'Navigating away or switching browser tabs during the hunt is prohibited.'
        );
      }
    };

    // 2. Window Blur (Leaving window focus)
    const handleWindowBlur = () => {
      // Defer report to avoid triggering if modal/input causes harmless blur
      setTimeout(() => {
        if (!document.hasFocus()) {
          reportCheat(
            'WINDOW_BLUR',
            'Browser window lost focus or was minimized.'
          );
        }
      }, 500);
    };

    // 3. DevTools & Inspection Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        reportCheat('DEVTOOLS', 'F12 Developer Tools shortcut attempted.');
      }
      // Ctrl+Shift+I / Cmd+Option+I
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')
      ) {
        e.preventDefault();
        reportCheat('DEVTOOLS', 'Developer Inspector shortcut attempted.');
      }
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        reportCheat('DEVTOOLS', 'View Source shortcut attempted.');
      }
    };

    // 4. Disable context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isActive, role, token]);

  const dismissWarning = () => {
    setWarningModalOpen(false);
  };

  return {
    warningModalOpen,
    lastViolationReason,
    violationCount,
    dismissWarning,
  };
}
