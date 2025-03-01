/**
 * Test script for verifying the authentication flow
 * 
 * Run this script with: node scripts/test-auth.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if .env file exists and has required variables
const checkEnvFile = () => {
  console.log('Checking .env file...');
  
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const supabaseUrl = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
    const supabaseKey = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    const redirectUrl = envContent.match(/EXPO_PUBLIC_AUTH_REDIRECT_URL=(.*)/);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials in .env file');
      return false;
    }
    
    if (!redirectUrl) {
      console.warn('⚠️ Missing EXPO_PUBLIC_AUTH_REDIRECT_URL in .env file');
      console.warn('   Using default: dripmax://auth/callback');
    }
    
    console.log('✅ .env file looks good');
    return true;
  } catch (error) {
    console.error('❌ Error reading .env file:', error.message);
    return false;
  }
};

// Check if app.json has the correct scheme
const checkAppJson = () => {
  console.log('Checking app.json configuration...');
  
  try {
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (!appJson.expo.scheme) {
      console.error('❌ Missing "scheme" in app.json');
      return false;
    }
    
    if (appJson.expo.scheme !== 'dripmax') {
      console.warn(`⚠️ Scheme in app.json is "${appJson.expo.scheme}" but expected "dripmax"`);
      console.warn('   Make sure this matches your Supabase redirect URL');
    } else {
      console.log('✅ app.json scheme looks good');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error reading app.json:', error.message);
    return false;
  }
};

// Check if the callback route exists
const checkCallbackRoute = () => {
  console.log('Checking callback route...');
  
  const callbackPath = path.join(__dirname, '..', 'app', '(auth)', 'callback.tsx');
  
  if (fs.existsSync(callbackPath)) {
    console.log('✅ Callback route exists');
    return true;
  } else {
    console.error('❌ Missing callback route at app/(auth)/callback.tsx');
    return false;
  }
};

// Run the tests
const runTests = async () => {
  console.log('🧪 Running authentication setup tests...\n');
  
  const envCheck = checkEnvFile();
  const appJsonCheck = checkAppJson();
  const callbackCheck = checkCallbackRoute();
  
  console.log('\nTest results:');
  console.log(`Environment variables: ${envCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`App configuration: ${appJsonCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Callback route: ${callbackCheck ? '✅ PASS' : '❌ FAIL'}`);
  
  if (envCheck && appJsonCheck && callbackCheck) {
    console.log('\n✅ All tests passed! Your authentication setup looks good.');
    console.log('\nNext steps:');
    console.log('1. Make sure you have configured Google OAuth in your Supabase project');
    console.log('2. Run your app with "npm start" or "expo start"');
    console.log('3. Test the Google Sign-In flow on a device or simulator');
  } else {
    console.log('\n❌ Some tests failed. Please fix the issues above before testing authentication.');
  }
  
  rl.close();
};

runTests(); 