import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export interface MobileNotificationSetupResult {
  enabled: boolean;
  native: boolean;
  reason?: string;
}

export const initializePushNotifications = async (): Promise<MobileNotificationSetupResult> => {
  if (!Capacitor.isNativePlatform()) {
    return { enabled: false, native: false, reason: 'Web platform' };
  }

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      return { enabled: false, native: true, reason: 'Permission denied' };
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.info('Push registration token:', token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.warn('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.info('Push notification received:', notification);
    });

    return { enabled: true, native: true };
  } catch (error) {
    console.warn('Push notifications setup skipped:', error);
    return { enabled: false, native: true, reason: 'Setup failed' };
  }
};
