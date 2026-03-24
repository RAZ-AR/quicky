import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

// Как показывать уведомления когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications();

    // Уведомление получено когда приложение открыто
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Socket.io уже обновит UI, это для badge/звука
    });

    // Пользователь нажал на уведомление
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { task_id?: string };
      if (!data.task_id) return;
      const role = useAuthStore.getState().user?.role;
      if (role === 'executor') {
        router.push({ pathname: '/(executor)/task/[id]', params: { id: data.task_id } });
      } else {
        router.push({ pathname: '/(client)/tasks/[id]', params: { id: data.task_id } });
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Только на реальном девайсе (не симулятор)
    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (!tokenData) return;

    // Регистрируем токен на сервере
    await api.post('/auth/push-token', { token: tokenData.data }).catch(() => {
      // Не критично если сервер не принял токен
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Quicky',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch {
    // push не работают в симуляторе — не критично
  }
}
