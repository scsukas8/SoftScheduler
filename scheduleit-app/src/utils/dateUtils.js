export function calculateTimeRemaining(completedAt, intervalDays) {
  const completedDate = new Date(completedAt);
  const targetDate = new Date(completedDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  // Need difference in days
  const diffTime = targetDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function formatTimeRemaining(days) {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'In 1 day';
  if (days % 7 === 0) return `In ${days / 7} week${days / 7 !== 1 ? 's' : ''}`;
  return `In ${days} days`;
}
