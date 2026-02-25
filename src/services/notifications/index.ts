import Toast from "react-native-toast-message";

export type NotificationType = "success" | "error" | "warning" | "info" | "hint";

export interface ShowNotificationOptions {
  type?: NotificationType;
  title?: string;
  durationMs?: number;
  dedupeKey?: string;
}

export interface NotificationPayload {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
  durationMs: number;
  dedupeKey?: string;
}

type NotificationListener = (notification: NotificationPayload | null) => void;

const DEFAULT_DURATION_MS = 2400;
const TYPE_DURATION_MS: Record<NotificationType, number> = {
  success: 2200,
  error: 3200,
  warning: 3200,
  info: 2600,
  hint: 5200,
};

let hideTimeoutId: ReturnType<typeof setTimeout> | null = null;
let currentNotification: NotificationPayload | null = null;
const listeners: NotificationListener[] = [];

const emit = () => {
  listeners.forEach((listener) => {
    listener(currentNotification);
  });
};

const clearHideTimeout = () => {
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
};

const shouldSkipDuplicate = (next: ShowNotificationOptions, message: string) => {
  if (!currentNotification) {
    return false;
  }

  if (next.dedupeKey && currentNotification.dedupeKey === next.dedupeKey) {
    return true;
  }

  return (
    currentNotification.message === message &&
    currentNotification.type === (next.type ?? "info")
  );
};

export const getCurrentNotification = (): NotificationPayload | null => {
  return currentNotification;
};

export const subscribeToNotifications = (
  listener: NotificationListener,
): (() => void) => {
  listeners.push(listener);
  listener(currentNotification);

  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

export const dismissNotification = (): void => {
  clearHideTimeout();

  if (!currentNotification) {
    Toast.hide();
    return;
  }

  currentNotification = null;
  emit();
  Toast.hide();
};

export const showNotification = (
  message: string,
  options: ShowNotificationOptions = {},
): void => {
  if (!message.trim()) {
    return;
  }

  if (shouldSkipDuplicate(options, message)) {
    return;
  }

  clearHideTimeout();

  const type = options.type ?? "info";
  const durationMs =
    options.durationMs ?? TYPE_DURATION_MS[type] ?? DEFAULT_DURATION_MS;

  currentNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    title: options.title,
    type,
    durationMs,
    dedupeKey: options.dedupeKey,
  };
  emit();

  Toast.show({
    type,
    text1: options.title ?? message,
    text2: options.title ? message : undefined,
    visibilityTime: durationMs,
    autoHide: true,
    position: "top",
  });

  hideTimeoutId = setTimeout(() => {
    currentNotification = null;
    emit();
  }, durationMs);
};

export const showToast = (message: string): void => {
  showNotification(message, { type: "success" });
};

export const showHint = (message: string): void => {
  showNotification(message, {
    type: "hint",
  });
};
