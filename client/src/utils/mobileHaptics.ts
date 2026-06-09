import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const triggerImpact = async (style: ImpactStyle = ImpactStyle.Light) => {
  try {
    await Haptics.impact({ style });
  } catch (error) {
    console.warn('Haptics impact skipped:', error);
  }
};

export const triggerSelection = async () => {
  try {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch (error) {
    console.warn('Haptics selection skipped:', error);
  }
};

export const triggerNotification = async (type: NotificationType = NotificationType.Success) => {
  try {
    await Haptics.notification({ type });
  } catch (error) {
    console.warn('Haptics notification skipped:', error);
  }
};
