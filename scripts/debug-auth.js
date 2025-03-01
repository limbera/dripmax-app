/**
 * Utility script to help debug the authentication flow
 * 
 * Run this script with: node scripts/debug-auth.js
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

// Create a mock token URL with fragment
const createMockTokenUrl = (redirectUrl) => {
  // Create a mock access token and refresh token
  const mockAccessToken = 'mock_access_token_' + Date.now();
  const mockRefreshToken = 'mock_refresh_token_' + Date.now();
  
  // Create the URL with the mock tokens in the fragment
  return `${redirectUrl}#access_token=${mockAccessToken}&refresh_token=${mockRefreshToken}&token_type=bearer&expires_in=3600`;
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

// Run the debug
const runDebug = async () => {
  console.log('🔍 Debugging authentication flow...\n');
  
  console.log('This script will help you debug the authentication flow by:');
  console.log('1. Testing deep linking with a mock token in the URL fragment');
  console.log('2. Checking if the app correctly handles the URL fragment');
  
  // Ask for the redirect URL
  rl.question('\nEnter your redirect URL (default: dripmax://auth/callback): ', async (redirectUrl) => {
    // Use the provided URL or the default
    const url = redirectUrl || 'dripmax://auth/callback';
    console.log(`Using redirect URL: ${url}`);
    
    // Create a mock token URL with fragment
    const mockTokenUrl = createMockTokenUrl(url);
    console.log(`Created mock token URL with fragment: ${mockTokenUrl}`);
    
    // Ask for confirmation
    rl.question('\nDo you want to open this URL on your device? (y/n) ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('\nOpening URL on your device...');
        const opened = await openUrl(mockTokenUrl);
        
        if (opened) {
          console.log('\n✅ URL opened successfully!');
          console.log('Check your app to see if it handles the URL fragment correctly.');
          console.log('You should see logs in the console about the fragment being parsed and the tokens being processed.');
        }
      } else {
        console.log('\nDebug cancelled.');
      }
      
      rl.close();
    });
  });
};

runDebug(); 