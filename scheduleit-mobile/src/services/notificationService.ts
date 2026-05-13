import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { calculateTimeRemaining } from '@scheduleit/core';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  try {
    if (!Device?.isDevice) return null;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

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

const getBriefingMessage = (tasksToBrief: any[]) => {
  const todayTasks: any[] = [];
  const soonTasks: any[] = [];
  const comingUpTasks: any[] = [];

  for (const task of tasksToBrief) {
    const info = calculateTimeRemaining(
      task.completed_at, 
      task.interval_days, 
      task.scheduled_date, 
      task.wiggle_room, 
      task.wiggle_type
    );

    const taskWithInfo = { ...task, info };

    if (info.daysRemaining <= 0) {
      todayTasks.push(taskWithInfo);
    } else if (info.windowStartDiff !== undefined && info.windowEndDiff !== undefined && info.windowStartDiff <= 0 && info.windowEndDiff >= 0) {
      soonTasks.push(taskWithInfo);
    } else if (info.windowStartDiff !== undefined && info.windowStartDiff > 0 && info.windowStartDiff <= 7) {
      comingUpTasks.push(taskWithInfo);
    }
  }

  if (todayTasks.length === 0 && soonTasks.length === 0 && comingUpTasks.length === 0) {
    return "☀️ Good morning! No tasks on the horizon today. Enjoy your free time! ✨";
  }

  // Sort: Today and Soon by deadline, Coming Up by start date
  todayTasks.sort((a, b) => (a.info.windowEndDiff || 0) - (b.info.windowEndDiff || 0));
  soonTasks.sort((a, b) => (a.info.windowEndDiff || 0) - (b.info.windowEndDiff || 0));
  comingUpTasks.sort((a, b) => (a.info.windowStartDiff || 0) - (b.info.windowStartDiff || 0));

  let body = "☀️ Good morning! Here is your day at a glance:\n";
  
  if (todayTasks.length > 0) {
    body += `\n🚨 Today\n• ${todayTasks.map(t => t.info.daysRemaining < 0 ? `${t.name} (overdue)` : t.name).join('\n• ')}`;
  }
  
  if (soonTasks.length > 0) {
    const formatSoon = (t: any) => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + (t.info.windowEndDiff || 0));
      const dayName = deadlineDate.toLocaleDateString('en-US', { weekday: 'long' });
      return `${t.name} (By ${dayName})`;
    };
    body += `\n\n➡️ Soon\n• ${soonTasks.map(formatSoon).join('\n• ')}`;
  }

  if (comingUpTasks.length > 0) {
    const formatComing = (t: any) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (t.info.windowStartDiff || 0));
      const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
      return `${t.name} (Starting ${dayName})`;
    };
    body += `\n\n📅 Coming Up\n• ${comingUpTasks.map(formatComing).join('\n• ')}`;
  }

  body += "\n\nHave a productive day! 🚀";
  return body;
};

export const scheduleAllNotifications = async (
  tasks: any[], 
  settings: { briefingEnabled: boolean, briefingHour: number, briefingMinute: number } = { briefingEnabled: true, briefingHour: 8, briefingMinute: 0 }
) => {
  console.log("DEBUG: scheduleAllNotifications start", tasks?.length, settings);
  try {
    if (!Notifications) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!tasks || tasks.length === 0) return;

    const dueTodayArr: string[] = [];
    const dueSoonArr: string[] = [];

    // Schedule individual reminders with safety
    for (const task of tasks) {
      try {
        const { windowStartDiff, windowEndDiff, daysRemaining } = calculateTimeRemaining(
          task.completed_at, 
          task.interval_days, 
          task.scheduled_date, 
          task.wiggle_room, 
          task.wiggle_type
        );

        if (windowStartDiff !== undefined && windowStartDiff > 0 && windowStartDiff <= 14) {
          const triggerDate = new Date();
          triggerDate.setHours(9, 0, 0, 0);
          triggerDate.setDate(triggerDate.getDate() + windowStartDiff);

          const secondsUntilTrigger = Math.floor((triggerDate.getTime() - Date.now()) / 1000);
          
          if (secondsUntilTrigger > 0) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `Task Reminder: ${task.name}`,
                body: `Time to check on this task!`,
                data: { taskId: task.id, type: 'TASK_REMINDER' },
                android: { channelId: 'default' }
              },
              trigger: {
                type: 'timeInterval',
                seconds: secondsUntilTrigger,
                repeats: false
              } as any,
            });
          }
        }
      } catch (e) {
        console.error("Individual task schedule failed for:", task.name, e);
      }
    }

    // Schedule the collective Morning Briefing with safety
    if (settings.briefingEnabled) {
      try {
        const now = new Date();
        const nextBriefing = new Date();
        nextBriefing.setHours(settings.briefingHour, settings.briefingMinute, 0, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (nextBriefing <= now) {
          nextBriefing.setDate(nextBriefing.getDate() + 1);
        }

        const secondsToBriefing = Math.floor((nextBriefing.getTime() - now.getTime()) / 1000);
        
        console.log(`Scheduling Daily Briefing for: ${nextBriefing.toLocaleString()} (${secondsToBriefing}s from now)`);
        
        const briefingBody = getBriefingMessage(tasks);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Your Morning Briefing",
            body: briefingBody,
            android: { 
              channelId: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
            }
          },
          trigger: {
            type: 'timeInterval',
            seconds: secondsToBriefing,
            repeats: false // Re-scheduled every time app updates anyway
          } as any,
        });
      } catch (e) {
        console.error("Briefing schedule failed:", e);
      }
    }

    console.log(`Scheduled updates for ${tasks.length} tasks.`);
  } catch (error) {
    console.error('Global notification schedule crash:', error);
  }
};

export const sendBriefingTest = async (tasks: any[]) => {
  try {
    if (!Notifications || !tasks) return;
    const briefingBody = getBriefingMessage(tasks);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your Morning Briefing (Test)",
        body: briefingBody,
        android: { 
          channelId: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        }
      },
      trigger: null,
    });
  } catch (error) {
    console.error("Briefing test error:", error);
  }
};

export const sendTestNotification = async () => {
  try {
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification 🔔",
        body: "SoftSchedule notifications are working!",
        android: { channelId: 'default' }
      },
      trigger: null,
    });
  } catch (error) {
    console.error("Test notification error:", error);
  }
};
