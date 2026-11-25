import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small physical feedback. Silently does nothing where unsupported (web).
const on = Platform.OS !== 'web';
export const tap = () => on && Haptics.selectionAsync().catch(() => {});
export const bump = () => on && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const success = () => on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
