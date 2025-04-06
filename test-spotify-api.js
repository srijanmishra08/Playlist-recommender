const SpotifyWebApi = require('spotify-web-api-node');

// Initialize Spotify API client with the credentials
const spotifyApi = new SpotifyWebApi({
  clientId: '3e19f5ae83c443e3b963a177e78b008b',
  clientSecret: '0bd55c4c50d3465f8a9d70878e260a07',
  redirectUri: 'http://localhost:3000/api/callback'
});

console.log('Testing Spotify API credentials...');

// Try to get a client credentials token
spotifyApi.clientCredentialsGrant()
  .then(data => {
    console.log('SUCCESS! Authentication successful');
    console.log('Access token expires in', data.body.expires_in, 'seconds');
    
    // Set the access token
    spotifyApi.setAccessToken(data.body.access_token);
    
    // Use the API to verify it works - get info about a popular artist
    return spotifyApi.getArtist('4tZwfgrHOc3mvqYlEYSvVi'); // Taylor Swift
  })
  .then(data => {
    console.log('Successfully retrieved artist data for:', data.body.name);
  })
  .catch(err => {
    console.error('ERROR: Authentication failed');
    console.error('Error details:', err.body?.error || err.message);
    if (err.body?.error === 'invalid_client') {
      console.error('\nPossible causes:');
      console.error('1. The Client ID or Client Secret is incorrect');
      console.error('2. Your Spotify app is not properly registered');
      console.error('3. Your app might not have been reviewed/approved by Spotify yet');
      console.error('\nRecommended actions:');
      console.error('- Double-check your Client ID and Client Secret on the Spotify Developer Dashboard');
      console.error('- Make sure your app is registered correctly at https://developer.spotify.com/dashboard');
      console.error('- Check if your app is in development mode and add your Spotify username to the list of users');
    }
  }); 