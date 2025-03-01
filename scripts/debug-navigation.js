/**
 * Utility script to help debug the navigation flow
 * 
 * Run this script with: node scripts/debug-navigation.js
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

// Check if the app is using expo-router
const checkExpoRouter = () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasExpoRouter = !!packageJson.dependencies['expo-router'];
    return hasExpoRouter;
  } catch (error) {
    console.error('Error checking for expo-router:', error.message);
    return false;
  }
};

// Check the app directory structure
const checkAppStructure = () => {
  try {
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) {
      console.log('❌ No app directory found. Make sure you are in the root of your Expo project.');
      return false;
    }

    console.log('✅ App directory found.');
    
    // Check for layout files
    const layoutFile = path.join(appDir, '_layout.tsx');
    if (fs.existsSync(layoutFile)) {
      console.log('✅ Root layout file found.');
    } else {
      console.log('❌ No root layout file found.');
    }
    
    // Check for auth directory
    const authDir = path.join(appDir, '(auth)');
    if (fs.existsSync(authDir)) {
      console.log('✅ Auth directory found.');
    } else {
      console.log('❌ No auth directory found.');
    }
    
    // Check for protected directory
    const protectedDir = path.join(appDir, '(protected)');
    if (fs.existsSync(protectedDir)) {
      console.log('✅ Protected directory found.');
    } else {
      console.log('❌ No protected directory found.');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking app structure:', error.message);
    return false;
  }
};

// Check for common navigation issues
const checkForCommonIssues = () => {
  try {
    // Check for useProtectedRoute hook
    const protectedRouteHook = path.join(process.cwd(), 'hooks', 'useProtectedRoute.ts');
    if (fs.existsSync(protectedRouteHook)) {
      console.log('✅ useProtectedRoute hook found.');
      
      // Check if the hook is used in the root layout
      const rootLayout = path.join(process.cwd(), 'app', '_layout.tsx');
      if (fs.existsSync(rootLayout)) {
        const layoutContent = fs.readFileSync(rootLayout, 'utf8');
        if (layoutContent.includes('useProtectedRoute')) {
          console.log('✅ useProtectedRoute is used in the root layout.');
        } else {
          console.log('❌ useProtectedRoute is not used in the root layout.');
        }
      }
    } else {
      console.log('❌ No useProtectedRoute hook found.');
    }
    
    // Check for useAuth hook
    const authHook = path.join(process.cwd(), 'hooks', 'useAuth.ts');
    if (fs.existsSync(authHook)) {
      console.log('✅ useAuth hook found.');
    } else {
      console.log('❌ No useAuth hook found.');
    }
    
    // Check for authStore
    const authStore = path.join(process.cwd(), 'stores', 'authStore.ts');
    if (fs.existsSync(authStore)) {
      console.log('✅ authStore found.');
    } else {
      console.log('❌ No authStore found.');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking for common issues:', error.message);
    return false;
  }
};

// Suggest fixes for common issues
const suggestFixes = () => {
  console.log('\n🔧 Potential fixes for navigation issues:');
  
  console.log('\n1. Check for race conditions in navigation:');
  console.log('   - Make sure navigation happens after the auth state is fully updated');
  console.log('   - Add a small delay before navigation to ensure state updates are processed');
  
  console.log('\n2. Check for issues with the router:');
  console.log('   - Make sure you are using router.replace() instead of router.push() for auth redirects');
  console.log('   - Check if there are any navigation guards preventing the redirect');
  
  console.log('\n3. Check for issues with the auth state:');
  console.log('   - Make sure the auth state is properly initialized before navigation');
  console.log('   - Check if there are any issues with the auth state persistence');
  
  console.log('\n4. Check for issues with the deep linking:');
  console.log('   - Make sure the deep linking is properly configured in app.json');
  console.log('   - Check if the callback URL is correctly handled');
  
  console.log('\n5. Try adding a delay before navigation:');
  console.log('   - Add a setTimeout before router.replace() to ensure state updates are processed');
  console.log('   - Example: setTimeout(() => router.replace("/(protected)"), 100);');
};

// Run the debug
const runDebug = async () => {
  console.log('🔍 Debugging navigation flow...\n');
  
  // Check if the app is using expo-router
  const hasExpoRouter = checkExpoRouter();
  if (hasExpoRouter) {
    console.log('✅ expo-router is installed.');
  } else {
    console.log('❌ expo-router is not installed. This script is designed for Expo Router apps.');
    rl.close();
    return;
  }
  
  // Check the app directory structure
  const appStructureOk = checkAppStructure();
  if (!appStructureOk) {
    rl.close();
    return;
  }
  
  // Check for common issues
  const commonIssuesChecked = checkForCommonIssues();
  if (!commonIssuesChecked) {
    rl.close();
    return;
  }
  
  // Suggest fixes
  suggestFixes();
  
  rl.close();
};

runDebug(); 