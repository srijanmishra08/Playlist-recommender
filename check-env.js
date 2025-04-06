// Simple script to check environment variables
console.log('Starting environment check...');

// Manually check the .env.local file
const fs = require('fs');
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  console.log('Found .env.local file. Contents:');
  console.log('------------------------------');
  console.log(envFile);
  console.log('------------------------------');
} catch (err) {
  console.error('Error reading .env.local file:', err.message);
}

// Try to load with dotenv
try {
  require('dotenv').config({ path: '.env.local' });
  console.log('Loaded with dotenv:');
  console.log('SPOTIFY_CLIENT_ID exists:', !!process.env.SPOTIFY_CLIENT_ID);
  console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('SPOTIFY_CLIENT_SECRET exists:', !!process.env.SPOTIFY_CLIENT_SECRET);
  console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET);
  console.log('SPOTIFY_REDIRECT_URI exists:', !!process.env.SPOTIFY_REDIRECT_URI);
  console.log('SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI);
} catch (err) {
  console.error('Error loading environment with dotenv:', err.message);
}

console.log('Environment check complete.'); 