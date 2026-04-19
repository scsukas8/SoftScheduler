import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { calculateTimeRemaining, formatTimeRemaining } from '@scheduleit/core';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  try {
    if (!Device?.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    if (!Notifications) {
      console.error('Notifications module not found. Is it installed and linked correctly?');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get permissions for notifications!');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ec4899',
      });
    }

    return finalStatus;
  } catch (error) {
    console.error('Error during notification registration:', error);
    return null;
  }
};

export const scheduleMorningBriefing = async (tasks: any[]) => {
  try {
    if (!Notifications) return;

    // Prevent SecurityExceptions by verifying permission before scheduling anything
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // Cancel existing scheduled notifications to avoid duplicates and stale content
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!tasks || tasks.length === 0) return;

    const dueTodayArr: string[] = [];
    const dueSoonArr: string[] = [];

    tasks.forEach(task => {
      // Shared core logic for calculation
      const { daysRemaining, isOverdue, hoursRemaining, hoursTotal } = calculateTimeRemaining(task.completed_at, task.interval_days);
      const { isWiggle } = formatTimeRemaining(isOverdue, daysRemaining, hoursRemaining, task.wiggle_room, hoursTotal);

      if (daysRemaining <= 0) {
        dueTodayArr.push(task.name);
      } else if (isWiggle) {
        dueSoonArr.push(task.name);
      }
    });

    if (dueTodayArr.length === 0 && dueSoonArr.length === 0) return;

    // Construct dynamic briefing message
    let title = "SoftSchedule Briefing ☕";
    let body = "";

    if (dueTodayArr.length > 0) {
      const count = dueTodayArr.length;
      body += `${count} task${count > 1 ? 's' : ''} ${count > 1 ? 'are' : 'is'} due today. `;
    }
    
    if (dueSoonArr.length > 0) {
      const count = dueSoonArr.length;
      body += `${count} task${count > 1 ? 's' : ''} entering wiggle room soon.`;
    }

    // Schedule a daily recurring notification at 8:00 AM
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'MORNING_BRIEFING' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });

    console.log(`Scheduled Morning Briefing with ${dueTodayArr.length} due today, ${dueSoonArr.length} due soon.`);
  } catch (error) {
    console.error('Error scheduling morning briefing:', error);
  }
};
