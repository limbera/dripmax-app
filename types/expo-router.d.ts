import { ExpoRouterNamespace } from 'expo-router';

declare module 'expo-router' {
  /**
   * All the routes available in the app
   */
  type AppRoutes = {
    // Define your app's routes here
    '/': {};
    '/(auth)/login': {};
    '/(auth)/callback': {};
    '/(auth)/paywall': {};
    '/(protected)': {};
    '/(tabs)': {};
  };

  type AppParamList = {
    [K in keyof AppRoutes]: AppRoutes[K] extends { __params: infer P } ? P : {};
  };

  /**
   * Valid external paths (http/https)
   */
  type ExternalPathString = `https://${string}` | `http://${string}`;
  
  /**
   * Valid internal paths for our app
   */
  type InternalPathString = keyof AppRoutes | (string & {});
  
  /**
   * Relative path for navigation
   */
  type RelativePathString<T extends InternalPathString> = `${T}` | `../${T}` | `../../${T}`;

  /**
   * Augment the Router's replace method to allow explicit route paths
   */
  interface Router {
    replace<T extends keyof AppParamList>(
      href: RelativePathString<T> | ExternalPathString | string,
      params?: AppParamList[T],
      options?: { animationTypeForReplace?: 'push' | 'pop' }
    ): void;
  }
} 