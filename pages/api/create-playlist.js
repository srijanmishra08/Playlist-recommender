import SpotifyWebApi from 'spotify-web-api-node';

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Verify that credentials are loaded properly
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.error('Spotify credentials missing. Please check your .env.local file.');
      return res.status(500).json({ 
        error: 'Server configuration error. Missing Spotify credentials.',
        debug: {
          clientIdExists: !!process.env.SPOTIFY_CLIENT_ID,
          clientSecretExists: !!process.env.SPOTIFY_CLIENT_SECRET
        }
      });
    }

    console.log('Attempting to authenticate with Spotify API...');
    
    // Get client credentials token
    try {
      const authData = await spotifyApi.clientCredentialsGrant();
      spotifyApi.setAccessToken(authData.body.access_token);
      console.log('Successfully authenticated with Spotify API');
    } catch (authError) {
      console.error('Authentication error:', authError);
      return res.status(500).json({ 
        error: 'Failed to authenticate with Spotify API. Please ensure your client ID and secret are correct.',
        details: authError.body?.error || authError.message
      });
    }

    // Get user's top artists
    let topArtists;
    try {
      // Try to get user's public playlists since we can't access their top artists directly
      const userPlaylists = await spotifyApi.getUserPlaylists(userId, { limit: 5 });
      
      // Extract track data from playlists
      const artistIds = new Set();
      const trackPromises = [];
      
      for (const playlist of userPlaylists.body.items) {
        if (playlist.tracks.total > 0) {
          trackPromises.push(
            spotifyApi.getPlaylistTracks(playlist.id, { limit: 10 })
          );
        }
      }
      
      const playlistTracks = await Promise.all(trackPromises);
      
      // Extract unique artist IDs from playlist tracks
      playlistTracks.forEach(response => {
        response.body.items.forEach(item => {
          if (item.track && item.track.artists) {
            item.track.artists.forEach(artist => {
              artistIds.add(artist.id);
            });
          }
        });
      });
      
      // If we found any artists, get their details
      if (artistIds.size > 0) {
        const artistIdsArray = Array.from(artistIds).slice(0, 5); // Limit to 5 artists
        const artistsResponse = await spotifyApi.getArtists(artistIdsArray);
        topArtists = artistsResponse.body.artists;
      } else {
        // Fallback to some popular artists
        const seedArtists = ['4tZwfgrHOc3mvqYlEYSvVi', '1uNFoZAHBGtllmzznpCI3s', '06HL4z0CvFAxyc27GXpf02'];
        const artistsResponse = await spotifyApi.getArtists(seedArtists);
        topArtists = artistsResponse.body.artists;
      }
    } catch (error) {
      console.log('Error fetching user playlists, using fallback artists instead');
      // Fallback to some popular artists if we can't get user's data
      const seedArtists = ['4tZwfgrHOc3mvqYlEYSvVi', '1uNFoZAHBGtllmzznpCI3s', '06HL4z0CvFAxyc27GXpf02'];
      const artistsResponse = await spotifyApi.getArtists(seedArtists);
      topArtists = artistsResponse.body.artists;
    }

    // Get recommendations based on the top artists
    const artistSeeds = topArtists.slice(0, 2).map(artist => artist.id);
    const recommendations = await spotifyApi.getRecommendations({
      seed_artists: artistSeeds,
      limit: 10,
    });

    // Format the response
    const playlist = {
      name: `Playlist for ${userId}`,
      description: `Custom playlist based on ${topArtists.map(a => a.name).join(', ')}`,
      tracks: recommendations.body.tracks.map(track => ({
        name: track.name,
        artists: track.artists.map(artist => artist.name),
        album: track.album.name,
        albumImage: track.album.images[0]?.url,
        id: track.id,
        previewUrl: track.preview_url,
      })),
    };

    return res.status(200).json(playlist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    return res.status(500).json({ 
      error: 'Failed to create playlist',
      details: error.message,
      body: error.body
    });
  }
} 