export function formatDetailLevel(level: string): string {
  switch (level) {
    case 'small':
    case 'low':
      return 'Brief';
    case 'medium':
      return 'Medium';
    case 'full':
    case 'high':
      return 'Detailed';
    default:
      return level.charAt(0).toUpperCase() + level.slice(1);
  }
}

export function normalizeDetailLevel(level: string): 'low' | 'medium' | 'high' {
  if (level === 'small' || level === 'low') return 'low';
  if (level === 'full' || level === 'high') return 'high';
  return 'medium';
}
