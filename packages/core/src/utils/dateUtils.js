export function calculateTimeRemaining(completedAt, intervalDays) {
  const completedDate = (completedAt && typeof completedAt.toDate === 'function') 
    ? completedAt.toDate() 
    : new Date(completedAt || Date.now());

  if (isNaN(completedDate.getTime())) {
    return {
      isOverdue: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      hoursTotal: (intervalDays || 1) * 24,
      timePassedStr: 'Unknown'
    };
  }

  const targetDate = new Date(completedDate);
  targetDate.setDate(targetDate.getDate() + (intervalDays || 1));
  const now = new Date();
  
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Rich data for TaskCard
  const hoursRemaining = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60)));
  const hoursTotal = (intervalDays || 1) * 24;
  
  const passedMs = now.getTime() - completedDate.getTime();
  const passedDays = Math.floor(passedMs / (1000 * 60 * 60 * 24));
  const timePassedStr = passedDays === 0 ? 'Today' : `${passedDays}d ago`;

  return {
    isOverdue: diffTime < 0,
    daysRemaining: diffDays,
    hoursRemaining,
    hoursTotal,
    timePassedStr
  };
}

export function formatTimeRemaining(isOverdue, daysRemaining, hoursRemaining, wiggleRoom, hoursTotal) {
  const wiggleHours = (wiggleRoom || 0) * 24;
  const isWiggle = hoursRemaining <= wiggleHours;
  const isCritical = isOverdue;

  let formattedTime = '';
  if (isOverdue) {
    const absDays = Math.abs(daysRemaining);
    formattedTime = `${absDays} day${absDays !== 1 ? 's' : ''} overdue`;
  } else if (daysRemaining === 0) {
    formattedTime = 'Due today';
  } else if (daysRemaining === 1) {
    formattedTime = 'In 1 day';
  } else {
    formattedTime = `In ${daysRemaining} days`;
  }

  return {
    isWiggle,
    isCritical,
    formattedTime
  };
}
