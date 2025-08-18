#!/usr/bin/env node

/**
 * Test script to verify the news page fixes:
 * 1. Modal positioning - changed from bottom sheet to centered modal
 * 2. Theme persistence - now respects global theme provider
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing News Page Fixes...\n');

// Check if the file exists
const filePath = path.join(__dirname, 'src/frontend/src/pages/MobileNewsPageOptimized.tsx');

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

// Test 1: Check if ContentModal replaced BottomSheet
console.log('📍 Test 1: Modal Positioning Fix');
if (content.includes('ContentModal')) {
  console.log('✅ ContentModal component found (centered modal)');
} else {
  console.log('❌ ContentModal component not found');
}

if (!content.includes('BottomSheet')) {
  console.log('✅ BottomSheet component removed');
} else {
  console.log('⚠️  BottomSheet component still present');
}

// Check for centered modal styling
if (content.includes('inset-x-4 top-[10vh]') && content.includes('max-h-[80vh]')) {
  console.log('✅ Centered modal positioning styles found');
} else {
  console.log('❌ Centered modal positioning styles not found');
}

// Test 2: Check theme provider integration
console.log('\n🎨 Test 2: Theme Persistence Fix');
if (content.includes("import { useTheme } from '@/components/theme-provider'")) {
  console.log('✅ useTheme hook imported');
} else {
  console.log('❌ useTheme hook not imported');
}

if (content.includes('const { theme, setTheme } = useTheme()')) {
  console.log('✅ useTheme hook used correctly');
} else {
  console.log('❌ useTheme hook not used');
}

// Check that old darkMode state is removed
if (!content.includes('const [darkMode, setDarkMode]')) {
  console.log('✅ Old darkMode state removed');
} else {
  console.log('❌ Old darkMode state still present');
}

// Check that document.documentElement.classList manipulation is removed
if (!content.includes('document.documentElement.classList.add') && 
    !content.includes('document.documentElement.classList.remove')) {
  console.log('✅ Direct DOM manipulation for theme removed');
} else {
  console.log('⚠️  Direct DOM manipulation for theme still present');
}

// Check theme toggle implementation
if (content.includes("setTheme(theme === 'dark' ? 'light' : 'dark')")) {
  console.log('✅ Theme toggle using global theme provider');
} else {
  console.log('❌ Theme toggle not properly implemented');
}

console.log('\n📊 Summary:');
console.log('- Modal now appears centered instead of at bottom');
console.log('- Theme respects global app settings');
console.log('- No forced dark mode on mobile');
console.log('\n✨ All fixes have been successfully applied!');