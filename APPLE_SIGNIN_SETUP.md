# Setting Up Apple Sign-In for Dripmax

This guide provides instructions for setting up Sign in with Apple in your Dripmax React Native app.

## Prerequisites

- An Apple Developer account
- Xcode installed on your Mac
- Your app must be registered in the Apple Developer portal

## Step 1: Configure Your App in the Apple Developer Portal

1. Go to the [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Click on "Identifiers" in the sidebar
3. Add a new identifier or edit your existing app identifier
4. Enable the "Sign In with Apple" capability
5. Save your changes

## Step 2: Create a Service ID for Sign in with Apple

1. In the Apple Developer Portal, go to "Identifiers" again
2. Click the "+" button to add a new identifier
3. Select "Services IDs" and click "Continue"
4. Enter a description and identifier (e.g., "com.yourcompany.dripmax.signin")
5. Check "Sign In with Apple" and click "Configure"
6. Add your domain and return URL (e.g., "dripmax://auth/callback")
7. Save your changes

## Step 3: Configure Your App in Xcode

If you're building with Expo, these steps will be handled automatically when you build your app with EAS Build. However, if you're developing with a bare workflow or need to test on a simulator:

1. Open your Xcode project
2. Select your app target
3. Go to the "Signing & Capabilities" tab
4. Add the "Sign In with Apple" capability
5. Ensure your bundle identifier matches what you configured in the Apple Developer Portal

## Step 4: Update Your Supabase Configuration

1. Go to your Supabase dashboard
2. Navigate to Authentication > Providers
3. Enable Apple provider
4. Configure the following settings:
   - Client ID: Your Services ID (e.g., "com.yourcompany.dripmax.signin")
   - Secret Key: Generate a key in the Apple Developer Portal under "Keys"
   - Redirect URL: The same URL you configured in the Apple Developer Portal

## Step 5: Testing

1. Run your app on an iOS device or simulator
2. Test the Sign in with Apple flow
3. Verify that the authentication works correctly

## Troubleshooting

### Common Issues

1. **Button not appearing**: Make sure you're testing on an iOS device or simulator and that `isAppleAuthAvailable()` is returning true.

2. **Authentication fails**: Check your Supabase configuration and ensure the client ID, secret key, and redirect URL are correct.

3. **Missing user information**: Apple may not provide email or name information on subsequent sign-ins. Your app should handle this gracefully.

4. **Web fallback not working**: Ensure your web-based authentication fallback is properly configured with the correct redirect URL.

### Debugging

- Enable debug logging in your app to see detailed authentication logs
- Check the Supabase authentication logs for any errors
- Verify that your Apple Developer account and app configuration are correct

## Additional Resources

- [Expo Apple Authentication Documentation](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/get-started/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-apple) 