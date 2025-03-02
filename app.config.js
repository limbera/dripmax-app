// app.config.js
module.exports = {
    expo: {
      name: "Dripmax",
      slug: "dripmax-app",
      version: "1.0.0",
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
          ]
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
          "android.permission.RECORD_AUDIO"
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
            "backgroundColor": "#ffffff"
          }
        ],
        "expo-secure-store",
        "expo-camera",
        "expo-image-picker",
        [
          "expo-apple-authentication"
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
        revenuecatGoogleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY
      },
      
      owner: "limbera"
    }
  };