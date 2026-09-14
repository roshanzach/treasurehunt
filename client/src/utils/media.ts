/**
 * Resolves media URLs (images, audio, video) to full backend URLs in production
 * and handles relative paths.
 */
export function getMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const backendOrigin =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? ''
      : 'https://treasurehunt-95y2.onrender.com';

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendOrigin}${cleanPath}`;
}

/**
 * Detects if a URL or type is an Image, Audio, or Video
 */
export function detectMediaType(url?: string | null, explicitType?: string | null): 'IMAGE' | 'AUDIO' | 'VIDEO' | 'UNKNOWN' {
  if (explicitType === 'IMAGE' || explicitType === 'AUDIO' || explicitType === 'VIDEO') {
    return explicitType;
  }
  if (!url) return 'UNKNOWN';

  const lower = url.toLowerCase().split('?')[0];
  if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.avif') ||
    lower.startsWith('data:image')
  ) {
    return 'IMAGE';
  }

  if (
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.aac') ||
    lower.startsWith('data:audio')
  ) {
    return 'AUDIO';
  }

  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.ogv') ||
    lower.endsWith('.mov') ||
    lower.startsWith('data:video')
  ) {
    return 'VIDEO';
  }

  // Default to image if media URL is present
  return 'IMAGE';
}
