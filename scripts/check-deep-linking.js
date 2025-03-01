/**
 * Utility script to check if deep linking is properly configured
 * 
 * Run this script with: node scripts/check-deep-linking.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check app.json for scheme configuration
const checkAppJson = () => {
  console.log('Checking app.json for scheme configuration...');
  
  try {
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (!appJson.expo.scheme) {
      console.error('❌ Missing "scheme" in app.json');
      return false;
    }
    
    console.log(`✅ Found scheme in app.json: "${appJson.expo.scheme}"`);
    return appJson.expo.scheme;
  } catch (error) {
    console.error('❌ Error reading app.json:', error.message);
    return false;
  }
};

// Check .env for redirect URL
const checkEnvFile = () => {
  console.log('Checking .env for redirect URL...');
  
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const redirectUrl = envContent.match(/EXPO_PUBLIC_AUTH_REDIRECT_URL=(.*)/);
    
    if (!redirectUrl) {
      console.warn('⚠️ Missing EXPO_PUBLIC_AUTH_REDIRECT_URL in .env file');
      return null;
    }
    
    console.log(`✅ Found redirect URL in .env: "${redirectUrl[1]}"`);
    return redirectUrl[1];
  } catch (error) {
    console.error('❌ Error reading .env file:', error.message);
    return null;
  }
};

// Check if the callback route exists
const checkCallbackRoute = () => {
  console.log('Checking if callback route exists...');
  
  const callbackPath = path.join(__dirname, '..', 'app', '(auth)', 'callback.tsx');
  
  if (fs.existsSync(callbackPath)) {
    console.log('✅ Callback route exists at app/(auth)/callback.tsx');
    return true;
  } else {
    console.error('❌ Missing callback route at app/(auth)/callback.tsx');
    return false;
  }
};

// Run the checks
const runChecks = async () => {
  console.log('🔍 Checking deep linking configuration...\n');
  
  const scheme = checkAppJson();
  const redirectUrl = checkEnvFile();
  const callbackExists = checkCallbackRoute();
  
  console.log('\nDeep linking check results:');
  
  if (scheme && redirectUrl && callbackExists) {
    console.log('\n✅ Deep linking appears to be properly configured.');
    
    // Check if scheme matches redirect URL
    if (redirectUrl.startsWith(`${scheme}://`)) {
      console.log(`✅ Redirect URL matches scheme: ${scheme}://`);
    } else {
      console.warn(`⚠️ Redirect URL (${redirectUrl}) doesn't match scheme (${scheme}://)`);
      console.warn('   This may cause deep linking to fail.');
    }
    
    console.log('\nTo test deep linking manually, try opening this URL on your device:');
    console.log(`${redirectUrl}?access_token=test`);
    console.log('\nIf deep linking is working, your app should open and navigate to the callback screen.');
  } else {
    console.log('\n❌ Deep linking is not properly configured. Please fix the issues above.');
  }
  
  rl.close();
};

runChecks(); 