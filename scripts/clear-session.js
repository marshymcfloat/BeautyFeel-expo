/**
 * Script to clear Supabase session storage
 * Run this to remove stored sessions (useful for debugging)
 */

const readline = require("readline");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Session Clearer for Expo App");
console.log("============================\n");
console.log("This will clear session data from:");
console.log("1. Web: localStorage (if app is running on web)");
console.log("2. iOS: AsyncStorage (need to clear app data)");
console.log("3. Android: AsyncStorage (need to clear app data)\n");

console.log("For iOS/Android:");
console.log("- Close the Expo app completely");
console.log("- Clear app data: Settings > Expo > Clear Data");
console.log("- Or uninstall and reinstall the app\n");

console.log("For Web:");
console.log("- Open browser DevTools (F12)");
console.log("- Go to Application/Storage tab");
console.log("- Clear localStorage");
console.log("- Look for keys containing 'supabase' or 'auth'\n");

rl.question("Do you want to see the session storage keys? (y/n): ", (answer) => {
  if (answer.toLowerCase() === "y") {
    console.log("\nSession keys to look for:");
    console.log("- supabase.auth.token");
    console.log("- supabase.auth.refresh_token");
    console.log("- Any key containing 'supabase' or 'auth'\n");
  }
  
  rl.close();
});

