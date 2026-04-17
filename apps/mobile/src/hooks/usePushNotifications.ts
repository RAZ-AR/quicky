import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

// Expo Go не поддерживает push-уведомления (SDK 53+)
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Настраиваем handler только вне Expo Go
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // В Expo Go пуши не работают — пропускаем
    if (IS_EXPO_GO) return;

    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Socket.io обновит UI — здесь только badge/звук
    });

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

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (!tokenData) return;

    await api.post('/auth/push-token', { token: tokenData.data }).catch(() => null);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Quicky',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch {
    // push не работают в симуляторе
  }
}
