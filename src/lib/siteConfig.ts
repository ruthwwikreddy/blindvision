/** Site metadata for SEO, AEO, and LLM discovery. Set VITE_SITE_URL in production. */
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://blindvision.app';

export const SITE_NAME = 'Blind Vision';

export const SITE_TAGLINE = 'AI-Powered Visual Assistance for Blind & Visually Impaired Users';

export const SITE_DESCRIPTION =
  'Blind Vision is a free AI accessibility app that describes your surroundings aloud, reads text and signs, guides navigation, identifies objects, and supports voice questions — built for blind and visually impaired users.';

export const SITE_KEYWORDS = [
  'blind vision app',
  'visual assistance app',
  'AI for blind users',
  'visually impaired accessibility',
  'scene description app',
  'voice navigation blind',
  'OCR for blind',
  'object recognition accessibility',
  'low vision assistant',
  'screen reader companion',
].join(', ');
