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
    // 1. Immediately trigger local sound and show warning modal
    try {
      sound.playWarning();
    } catch (_) {}

    setLastViolationReason(details);
    setWarningModalOpen(true);
    setViolationCount((prev) => prev + 1);

    // 2. Report to backend telemetry (throttle network calls to max 1 per 1.5 seconds)
    const now = Date.now();
    if (now - lastReportRef.current < 1500) return;
    lastReportRef.current = now;

    try {
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

    // 1. Visibility Change (Tab Switch / Minimized / App switch on mobile)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Participant navigated away or minimized tab
      } else {
        // Returned back to tab
        reportCheat(
          'TAB_SWITCH',
          'Navigating away, minimizing the browser, or switching tabs during the hunt is prohibited.'
        );
      }
    };

    // 2. Window Blur (Leaving window focus / splitting screens)
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus()) {
          reportCheat(
            'WINDOW_BLUR',
            'Browser window lost focus. Please keep the hunt tab active and visible.'
          );
        }
      }, 400);
    };

    // 3. DevTools & Inspection Shortcuts (Windows, Linux, macOS)
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        reportCheat('DEVTOOLS', 'F12 Developer Tools shortcut attempted.');
        return;
      }

      // Windows/Linux DevTools: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'K')) {
        e.preventDefault();
        reportCheat('DEVTOOLS', `Developer Tools shortcut (Ctrl+Shift+${key}) attempted.`);
        return;
      }

      // macOS DevTools: Cmd+Option+I, Cmd+Option+J, Cmd+Option+C, Cmd+Option+U
      if (e.metaKey && e.altKey && (key === 'I' || key === 'J' || key === 'C' || key === 'U')) {
        e.preventDefault();
        reportCheat('DEVTOOLS', `Developer Tools shortcut (Cmd+Option+${key}) attempted.`);
        return;
      }

      // View Source: Ctrl+U or Cmd+U
      if ((e.ctrlKey || e.metaKey) && key === 'U') {
        e.preventDefault();
        reportCheat('DEVTOOLS', 'View Page Source shortcut attempted.');
        return;
      }

      // Ctrl+S / Cmd+S (Save page)
      if ((e.ctrlKey || e.metaKey) && key === 'S') {
        e.preventDefault();
        reportCheat('SAVE_PAGE', 'Page save shortcut blocked.');
        return;
      }
    };

    // 4. Disable context menu (right-click / long-press on mobile)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportCheat('CONTEXT_MENU', 'Right-click context menu and inspection are disabled.');
    };

    // 5. Block copy / cut of clues
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportCheat('CLIPBOARD_COPY', 'Copying hunt materials and clues is prohibited.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
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
