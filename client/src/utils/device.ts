/**
 * Generates and persists a unique Device ID in localStorage.
 * Captures user-agent and device info for admin approval.
 */

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('th_device_id');
  if (!deviceId) {
    deviceId = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
    localStorage.setItem('th_device_id', deviceId);
  }
  return deviceId;
}

export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'MacOS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('like Mac') !== -1) os = 'iOS';

  let browser = 'Browser';
  if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
  else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Edg') !== -1) browser = 'Edge';

  const isMobile = /Mobi|Android/i.test(ua);
  return `${os} ${browser} (${isMobile ? 'Mobile' : 'Desktop'})`;
}
