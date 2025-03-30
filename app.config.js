// app.config.js
module.exports = ({ config }) => {
  // Function to return platform-specific values
  const getRevenueCatApiKeyForSuperwall = () => {
    if (process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY && process.platform === 'darwin') {
      return process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
    } else if (process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY && process.platform === 'linux') {
      return process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;
    }
    // Default to iOS if we can't determine platform or for web
    return process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || '';
  };

  return {
    ...config,
    expo: {
      name: "Dripmax",
      slug: "dripmax-app",
      version: "1.1.0",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: "dripmax",
      userInterfaceStyle: "automatic",
      newArchEnabled: true,
      
      // iOS configuration
      ios: {
        supportsTablet: true,
        bundleIdentifier: "app.dripmax",
        config: {
          usesNonExemptEncryption: false
        },
        infoPlist: {
          CFBundleURLTypes: [
            {
              CFBundleURLSchemes: [
                "dripmax"
              ]
            }
          ],
          NSCameraUsageDescription: "Allow Dripmax to access your camera to capture and analyze your outfits.",
          NSPhotoLibraryUsageDescription: "Allow Dripmax to access your photos to save and share your outfit captures.",
          NSUserNotificationUsageDescription: "We'll send you updates about your outfits and new app features.",
          NSLocationWhenInUseUsageDescription: "Dripmax needs access to your location to provide location-specific features and experiences."
        }
      },
      
      // Android configuration
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
        package: "app.dripmax",
        permissions: [
          "android.permission.CAMERA",
          "android.permission.RECORD_AUDIO",
          "android.permission.READ_EXTERNAL_STORAGE",
          "android.permission.WRITE_EXTERNAL_STORAGE",
          "android.permission.RECEIVE_BOOT_COMPLETED",
          "android.permission.VIBRATE"
        ]
      },
      
      // Web configuration
      web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png"
      },
      
      // Plugins
      plugins: [
        "expo-router",
        [
          "expo-splash-screen",
          {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 200,
            "resizeMode": "contain",
            "backgroundColor": "#00FF77"
          }
        ],
        "expo-secure-store",
        [
          "expo-camera",
          {
            "cameraPermission": "Allow Dripmax to access your camera to capture and analyze your outfits.",
            "microphonePermission": "Allow Dripmax to access your microphone for video capture."
          }
        ],
        "expo-image-picker",
        [
          "expo-apple-authentication"
        ],
        "expo-notifications"
      ],
      
      // Experiments
      experiments: {
        typedRoutes: true
      },
      
      // Extra configuration
      extra: {
        router: {
          origin: false
        },
        eas: {
          projectId: "da11a9ed-914d-49bc-9f2c-39b1d654807f"
        },
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        authRedirectUrl: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL,
        revenuecatAppleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
        revenuecatGoogleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
        oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
        superwallApiKey: process.env.EXPO_PUBLIC_SUPERWALL_API_KEY,
        revenuecatSuperwallApiKey: getRevenueCatApiKeyForSuperwall()
      },
      
      owner: "limbera"
    }
  };
};