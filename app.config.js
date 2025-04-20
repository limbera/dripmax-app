// app.config.js
module.exports = {
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
        "expo-notifications",
        [
          "@sentry/react-native/expo",
          {
            // For all available options, see:
            // https://github.com/getsentry/sentry-react-native/blob/main/plugin/src/index.ts
            
            // Sentry project slug
            project: "dripmax",
            
            // Enable source maps upload during build
            sourceMaps: true,
            
            // Organization slug 
            org: "drip-max-inc",
            
            // Auth token can be provided as an environment variable
            // If your builds are in a CI environment, best to use an environment variable
            authToken: process.env.SENTRY_AUTH_TOKEN,
            
            // Enable native symbol upload
            uploadNativeSymbols: true,
            
            // Allow failures so builds won't be blocked if upload fails
            allowSentryFailure: true,
            
            // Set to true to capture all logs (consider performance impact)
            // Use selectively in your app code instead
            autoLogConsoleError: false,
            
            // Set to true to register a global error handler
            enableAutoPerformanceTracking: true,
            
            // Used to control source maps upload during EAS builds
            // We'll configure based on environment
            dist: process.env.EAS_BUILD_ID || "1.0",
            
            // Use environment from .env file
            environment: process.env.EXPO_PUBLIC_ENVIRONMENT || "development"
          }
        ]
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
        sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        environment: process.env.EXPO_PUBLIC_ENVIRONMENT
      },
      
      owner: "limbera",
      
      // Hooks for build process
      hooks: {
        postPublish: [
          {
            file: "@sentry/react-native/scripts/expo-hooks.js",
            config: {
              organization: "drip-max-inc",
              project: "dripmax",
              authToken: process.env.SENTRY_AUTH_TOKEN,
              setCommits: true,
              deployEnv: process.env.EXPO_PUBLIC_ENVIRONMENT || "development"
            }
          }
        ]
      }
    }
  };