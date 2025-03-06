// This is a minimal type definition file for the OneSignal SDK v5
// It's used to fix some type errors in our implementation

declare module 'react-native-onesignal' {
  export enum LogLevel {
    None = 0,
    Fatal = 1,
    Error = 2,
    Warn = 3,
    Info = 4,
    Debug = 5,
    Verbose = 6
  }

  export interface NotificationWillDisplayEvent {
    notification: {
      additionalData?: any;
      body: string;
      notificationId: string;
      title: string;
      launchURL?: string;
      sound?: string;
      actionButtons?: Array<{
        id: string;
        text: string;
        icon?: string;
      }>;
    };
    // Note: In v5, there is no display() method
  }

  export interface NotificationClickEvent {
    notification: {
      additionalData?: any;
      body: string;
      notificationId: string;
      title: string;
      launchURL?: string;
      sound?: string;
      actionButtons?: Array<{
        id: string;
        text: string;
        icon?: string;
      }>;
    };
  }

  // The subscription object has methods, not just properties
  export interface PushSubscription {
    id?: string;
    token?: string;
    optedIn?: boolean;
    getIdAsync(): Promise<string | null>;
    getTokenAsync(): Promise<string | null>;
    getOptedIn(): boolean;
    getOptedInAsync(): Promise<boolean>;
    optIn(): void;
    optOut(): void;
    getPushSubscriptionId(): string | undefined;
    getPushSubscriptionToken(): string | undefined;
    addEventListener(event: string, listener: Function): void;
    removeEventListener(event: string, listener: Function): void;
  }

  export const OneSignal: {
    initialize(appId: string): void;
    login(externalId: string): void;
    logout(): void;
    Debug: {
      setLogLevel(logLevel: LogLevel): void;
    };
    User: {
      addTag(key: string, value: string): void;
      pushSubscription: PushSubscription;
    };
    Notifications: {
      addEventListener(event: string, listener: Function): void;
      removeEventListener(event: string, listener: Function): void;
      requestPermission(fallbackToSettings: boolean): void;
      clearAll(): void;
      permissionNative: Promise<boolean>;
    };
  };

  export default OneSignal;
} 