import SpotifyWebApi from 'spotify-web-api-node';

export default async function handler(req, res) {
  const method = req.method;

  // Generate authorization URL for login
  if (method === 'GET') {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private'
    ];
    
    const spotifyApi = new SpotifyWebApi({
      clientId: '3e19f5ae83c443e3b963a177e78b008b',
      clientSecret: '0bd55c4c50d3465f8a9d70878e260a07',
      redirectUri: 'http://localhost:3000/api/callback'
    });
    
    // Create the authorization URL
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'spotify_auth_state');
    
    return res.status(200).json({ authorizeURL });
  }
  
  // Exchange code for token
  else if (method === 'POST') {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    const spotifyApi = new SpotifyWebApi({
      clientId: '3e19f5ae83c443e3b963a177e78b008b',
      clientSecret: '0bd55c4c50d3465f8a9d70878e260a07',
      redirectUri: 'http://localhost:3000/api/callback'
    });
    
    try {
      // Exchange the code for an access token and refresh token
      const data = await spotifyApi.authorizationCodeGrant(code);
      
      // Return the tokens to the client
      return res.status(200).json({
        accessToken: data.body.access_token,
        refreshToken: data.body.refresh_token,
        expiresIn: data.body.expires_in
      });
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return res.status(500).json({
        error: 'Failed to exchange code for tokens',
        details: error.message || 'Unknown error'
      });
    }
  }
  
  // Refresh token
  else if (method === 'PUT') {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    const spotifyApi = new SpotifyWebApi({
      clientId: '3e19f5ae83c443e3b963a177e78b008b',
      clientSecret: '0bd55c4c50d3465f8a9d70878e260a07',
      redirectUri: 'http://localhost:3000/api/callback',
      refreshToken
    });
    
    try {
      // Refresh the access token
      const data = await spotifyApi.refreshAccessToken();
      
      // Return the new access token to the client
      return res.status(200).json({
        accessToken: data.body.access_token,
        expiresIn: data.body.expires_in
      });
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return res.status(500).json({
        error: 'Failed to refresh access token',
        details: error.message || 'Unknown error'
      });
    }
  }
  
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 