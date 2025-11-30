#!/bin/bash
# Fix react-native-svg bundling issues

echo "Clearing Metro bundler cache..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf metro-cache

echo "Clearing watchman cache (if installed)..."
watchman watch-del-all 2>/dev/null || true

echo "✅ Cache cleared! Now restart your dev server with:"
echo "   npm start -- --clear"
echo ""
echo "Or if port is in use, kill the process first:"
echo "   npx kill-port 8081"
echo "   npm start -- --clear"

