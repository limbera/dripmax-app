/**
 * Test script for deep linking with a mock token
 * 
 * Run this script with: node scripts/test-deep-linking.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');
const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get the redirect URL from .env
const getRedirectUrl = () => {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const redirectUrl = envContent.match(/EXPO_PUBLIC_AUTH_REDIRECT_URL=(.*)/);
    
    if (!redirectUrl) {
      console.warn('⚠️ Missing EXPO_PUBLIC_AUTH_REDIRECT_URL in .env file');
      return 'dripmax://auth/callback';
    }
    
    return redirectUrl[1];
  } catch (error) {
    console.error('❌ Error reading .env file:', error.message);
    return 'dripmax://auth/callback';
  }
};

// Create a mock token URL
const createMockTokenUrl = (redirectUrl) => {
  // Create a mock access token and refresh token
  const mockAccessToken = 'mock_access_token_' + Date.now();
  const mockRefreshToken = 'mock_refresh_token_' + Date.now();
  
  // Create the URL with the mock tokens
  return `${redirectUrl}?access_token=${mockAccessToken}&refresh_token=${mockRefreshToken}&token_type=bearer&expires_in=3600`;
};

// Open the URL on the device
const openUrl = async (url) => {
  try {
    if (process.platform === 'darwin') {
      // macOS
      await execAsync(`xcrun simctl openurl booted "${url}"`);
      return true;
    } else if (process.platform === 'win32') {
      // Windows
      console.log('On Windows, please manually open this URL on your device:');
      console.log(url);
      return false;
    } else {
      // Linux
      console.log('On Linux, please manually open this URL on your device:');
      console.log(url);
      return false;
    }
  } catch (error) {
    console.error('❌ Error opening URL:', error.message);
    console.log('Please manually open this URL on your device:');
    console.log(url);
    return false;
  }
};

// Run the test
const runTest = async () => {
  console.log('🔍 Testing deep linking with mock tokens...\n');
  
  // Get the redirect URL
  const redirectUrl = getRedirectUrl();
  console.log(`Using redirect URL: ${redirectUrl}`);
  
  // Create a mock token URL
  const mockTokenUrl = createMockTokenUrl(redirectUrl);
  console.log(`Created mock token URL: ${mockTokenUrl}`);
  
  // Ask for confirmation
  rl.question('\nDo you want to open this URL on your device? (y/n) ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log('\nOpening URL on your device...');
      const opened = await openUrl(mockTokenUrl);
      
      if (opened) {
        console.log('\n✅ URL opened successfully!');
        console.log('Check your app to see if it handles the deep link correctly.');
        console.log('You should see logs in the console about the callback being mounted and the tokens being processed.');
      }
    } else {
      console.log('\nTest cancelled.');
    }
    
    rl.close();
  });
};

runTest(); 