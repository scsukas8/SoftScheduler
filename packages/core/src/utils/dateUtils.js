export function calculateTimeRemaining(completedAt, intervalDays) {
  // Handle Firestore Timestamps or strings
  const completedDate = (completedAt && typeof completedAt.toDate === 'function') 
    ? completedAt.toDate() 
    : new Date(completedAt || Date.now());

  if (isNaN(completedDate.getTime())) return 0;

  const targetDate = new Date(completedDate);
  targetDate.setDate(targetDate.getDate() + (intervalDays || 1));
  const now = new Date();
  
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
