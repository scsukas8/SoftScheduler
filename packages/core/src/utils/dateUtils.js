export function calculateTimeRemaining(completedAt, intervalDays, scheduledDate = null, wiggleRoom = 0, wiggleType = 'late-only') {
  const completedDate = (completedAt && typeof completedAt.toDate === 'function') 
    ? completedAt.toDate() 
    : new Date(completedAt || Date.now());

  if (isNaN(completedDate.getTime()) && !scheduledDate) {
    return {
      isOverdue: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      hoursTotal: (intervalDays || 1) * 24,
      timePassedStr: 'Unknown'
    };
  }

  let targetDate;
  if (scheduledDate) {
    targetDate = (typeof scheduledDate.toDate === 'function') 
      ? scheduledDate.toDate() 
      : new Date(scheduledDate);
  } else {
    targetDate = new Date(completedDate);
    targetDate.setDate(targetDate.getDate() + (intervalDays || 1));
  }

  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const wiggle = scheduledDate ? 0 : parseInt(wiggleRoom || 0, 10);
  const isSymmetric = wiggleType === 'symmetric';
  const windowStartDiff = diffDays - (isSymmetric ? wiggle : 0);
  const windowEndDiff = diffDays + wiggle;
  
  // Rich data for TaskCard
  const hoursRemaining = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60)));
  const hoursTotal = (intervalDays || 1) * 24;
  
  const passedMs = now.getTime() - completedDate.getTime();
  const passedDays = Math.floor(passedMs / (1000 * 60 * 60 * 24));
  const timePassedStr = passedDays === 0 ? 'Today' : `${passedDays}d ago`;

  return {
    isOverdue: windowEndDiff < 0,
    daysRemaining: diffDays,
    windowStartDiff,
    windowEndDiff,
    hoursRemaining,
    hoursTotal,
    timePassedStr,
    isScheduled: !!scheduledDate
  };
}

export function formatTimeRemaining(isOverdue, daysRemaining, windowStartDiff, windowEndDiff, isScheduled) {
  let formattedTime = '';
  
  if (isScheduled) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRemaining);
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    formattedTime = `Scheduled for ${dayName}`;
  } else if (isOverdue) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + windowEndDiff);
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    formattedTime = `Slipped (Was ${dayName})`;
  } else if (windowStartDiff <= 0) {
    // We are inside the wiggle window
    if (windowEndDiff === 0) {
      formattedTime = 'By Today';
    } else {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + windowEndDiff);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
      formattedTime = `By ${dayName}`;
    }
  } else {
    // Before the window starts
    if (windowStartDiff === 1) {
      formattedTime = 'Tomorrow';
    } else {
      formattedTime = `In ${windowStartDiff} day${windowStartDiff === 1 ? '' : 's'}`;
    }
  }

  const isInRange = (windowStartDiff <= 0 && !isOverdue) || isOverdue;
  const isSoon = windowStartDiff > 0 && windowStartDiff <= 7;
  const isDistant = windowStartDiff > 7;

  return {
    isWiggle: isInRange && !isOverdue, // Backward compatibility
    isCritical: isOverdue,
    isInRange,
    isSoon,
    isDistant,
    formattedTime
  };
}
