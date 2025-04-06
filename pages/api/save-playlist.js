import SpotifyWebApi from 'spotify-web-api-node';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, description, trackUris, accessToken } = req.body;

  if (!accessToken) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  if (!trackUris || !Array.isArray(trackUris) || trackUris.length === 0) {
    return res.status(400).json({ error: 'Track URIs are required' });
  }

  // Initialize Spotify API client with the user's access token
  const spotifyApi = new SpotifyWebApi({
    clientId: '3e19f5ae83c443e3b963a177e78b008b',
    clientSecret: '0bd55c4c50d3465f8a9d70878e260a07',
    redirectUri: 'http://localhost:3000/api/callback'
  });

  spotifyApi.setAccessToken(accessToken);

  try {
    // Get the authenticated user's information
    const meResponse = await spotifyApi.getMe();
    const userId = meResponse.body.id;

    console.log(`Creating playlist for user ${userId}`);
    
    // Create an empty playlist
    const createPlaylistResponse = await spotifyApi.createPlaylist(name, {
      description: description || 'Created by Spotify Playlist Recommender',
      public: true
    });

    const playlistId = createPlaylistResponse.body.id;
    const playlistUrl = createPlaylistResponse.body.external_urls.spotify;
    
    console.log(`Playlist created with ID: ${playlistId}`);
    
    // Add tracks to the playlist (Spotify allows max 100 tracks per request)
    // Split into chunks if needed
    const chunkSize = 100;
    for (let i = 0; i < trackUris.length; i += chunkSize) {
      const chunk = trackUris.slice(i, i + chunkSize);
      await spotifyApi.addTracksToPlaylist(playlistId, chunk);
    }
    
    console.log(`Added ${trackUris.length} tracks to playlist`);
    
    // Return success with the playlist URL
    return res.status(200).json({
      success: true,
      playlistId,
      playlistUrl
    });
    
  } catch (error) {
    console.error('Error saving playlist to Spotify:', error);
    return res.status(500).json({
      error: 'Failed to save playlist to Spotify',
      details: error.message || 'Unknown error',
      body: error.body || null
    });
  }
} 