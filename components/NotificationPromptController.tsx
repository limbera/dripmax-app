import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { useAppStateStore, AppState } from '../stores/appStateStore';
import { notificationService } from '../services/notifications';
import { authLogger } from '../utils/logger';

/**
 * Triggers the OS notification permission prompt as soon as the notification
 * service is ready, without blocking navigation.
 */
export default function NotificationPromptController() {
  const { notificationsReady, currentState } = useAppStateStore();
  const hasAttemptedPromptRef = useRef(false);

  useEffect(() => {
    if (!notificationsReady || hasAttemptedPromptRef.current) {
      return;
    }

    // Only prompt while we're still in the pre-auth states so it feels "early"
    if (
      currentState !== AppState.INITIALIZING &&
      currentState !== AppState.LOADING_FONTS &&
      currentState !== AppState.CHECKING_AUTH &&
      currentState !== AppState.CHECKING_SUBSCRIPTION &&
      currentState !== AppState.INITIALIZING_NOTIFICATIONS &&
      currentState !== AppState.UNAUTHENTICATED
    ) {
      return;
    }

    hasAttemptedPromptRef.current = true;

    const promptForNotifications = async () => {
      try {
        const permissions = await Notifications.getPermissionsAsync();
        authLogger.debug('NotificationPromptController: current permission state', permissions);

        if (permissions.status === Notifications.PermissionStatus.UNDETERMINED) {
          authLogger.info('NotificationPromptController: prompting user for notifications');
          await notificationService.promptAndSubscribeUser();
        } else {
          authLogger.info('NotificationPromptController: permissions already determined, skipping prompt');
        }
      } catch (error) {
        authLogger.error('NotificationPromptController: failed to prompt for notifications', error);
      }
    };

    promptForNotifications();
  }, [notificationsReady, currentState]);

  return null;
}

