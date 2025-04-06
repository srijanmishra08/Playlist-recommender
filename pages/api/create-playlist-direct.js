import SpotifyWebApi from 'spotify-web-api-node';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { userId, accessToken } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Clean up the user ID - handle URLs and remove any spaces or extra characters
  userId = cleanUserId(userId);
  
  console.log(`Starting playlist creation for user: "${userId}"`);

  // Initialize Spotify API client with hardcoded credentials
  const spotifyApi = new SpotifyWebApi({
    clientId: '3e19f5ae83c443e3b963a177e78b008b',
    clientSecret: '0bd55c4c50d3465f8a9d70878e260a07',
    redirectUri: 'http://localhost:3000/api/callback'
  });

  // If we have a user access token, use it (for creating playlists in user's account)
  if (accessToken) {
    spotifyApi.setAccessToken(accessToken);
  }

  try {
    console.log('Attempting to authenticate with Spotify API...');
    
    // If no user access token provided, get client credentials token
    if (!accessToken) {
      const authData = await spotifyApi.clientCredentialsGrant();
      console.log('Authentication successful, token expires in', authData.body.expires_in, 'seconds');
      spotifyApi.setAccessToken(authData.body.access_token);
    }
    
    // Try to get the actual user first to verify they exist
    try {
      console.log(`Checking if user "${userId}" exists...`);
      const user = await spotifyApi.getUser(userId);
      console.log(`User found: ${user.body.display_name || userId} (ID: ${user.body.id})`);
      
      // Use the verified user ID from the response
      userId = user.body.id;
    } catch (userError) {
      console.error(`Error finding user "${userId}":`, userError.message);
      
      // Try some common variations of the username
      const variations = [
        userId.toLowerCase(),
        userId.toUpperCase(),
        capitalizeFirstLetter(userId),
        userId.replace(/\s+/g, '')
      ];
      
      let userFound = false;
      
      for (const variation of variations) {
        if (variation === userId) continue; // Skip if it's the same as the original
        
        try {
          console.log(`Trying variation "${variation}"...`);
          const user = await spotifyApi.getUser(variation);
          console.log(`User found with variation "${variation}": ${user.body.display_name || variation} (ID: ${user.body.id})`);
          userId = user.body.id;
          userFound = true;
          break;
        } catch (err) {
          console.log(`User not found with variation "${variation}"`);
        }
      }
      
      if (!userFound) {
        console.log('Could not find user with any variations, using fallback playlist');
        return res.status(200).json(getFallbackPlaylist(userId));
      }
    }
    
    // Get user's public playlists
    console.log(`Fetching public playlists for user: "${userId}"`);
    const userPlaylists = await spotifyApi.getUserPlaylists(userId, { limit: 50 });
    console.log(`Found ${userPlaylists.body.items.length} playlists`);
    
    // Print the names of all playlists found for debugging
    if (userPlaylists.body.items.length > 0) {
      console.log('Playlists found:');
      userPlaylists.body.items.forEach((playlist, index) => {
        console.log(`  ${index + 1}. "${playlist.name}" (${playlist.tracks.total} tracks, Public: ${playlist.public})`);
      });
    }
    
    // Filter to only include public playlists
    const publicPlaylists = userPlaylists.body.items.filter(playlist => playlist.public === true);
    console.log(`Found ${publicPlaylists.length} public playlists`);
    
    if (publicPlaylists.length === 0) {
      console.log('No public playlists found, using fallback playlist');
      return res.status(200).json(getFallbackPlaylist(userId));
    }
    
    // Get tracks from user's playlists
    const allTracks = [];
    const userTrackIds = new Set();
    const artistIds = new Set();
    const topGenres = new Map(); // For counting genre occurrences
    
    // Process each playlist to get tracks
    const playlistTrackPromises = [];
    for (const playlist of publicPlaylists) {
      console.log(`Fetching tracks from playlist "${playlist.name}" (ID: ${playlist.id})`);
      playlistTrackPromises.push(
        spotifyApi.getPlaylistTracks(playlist.id, { limit: 50 })
      );
    }
    
    // Wait for all playlist track requests to complete
    const playlistTracksResults = await Promise.all(playlistTrackPromises);
    
    // Process all the tracks to extract artists and track IDs
    for (const playlistTracks of playlistTracksResults) {
      for (const item of playlistTracks.body.items) {
        if (item.track) {
          userTrackIds.add(item.track.id);
          allTracks.push(item.track);
          
          // Add all artists from the track
          for (const artist of item.track.artists) {
            artistIds.add(artist.id);
          }
        }
      }
    }
    
    console.log(`Found ${userTrackIds.size} unique tracks and ${artistIds.size} unique artists`);
    
    // If we don't have enough seed data, use fallback
    if (artistIds.size === 0 && userTrackIds.size === 0) {
      console.log('Not enough seed data found, using fallback playlist');
      return res.status(200).json(getFallbackPlaylist(userId));
    }

    // DIRECT ARTIST APPROACH
    // Since both the recommendations API and Browse API are failing,
    // we'll use artist top tracks directly, which is the most reliable endpoint
    console.log('Starting direct artist-based discovery...');
    
    try {
      // Step 1: Extract genre information from the user's tracks
      const artistPromises = [];
      const artistIdsArray = Array.from(artistIds).slice(0, 50);
      const userGenres = new Map();
      const artistData = new Map(); // Store artist data for later use
      
      // Process in batches of 20 (Spotify API limit for getArtists)
      for (let i = 0; i < artistIdsArray.length; i += 20) {
        const batch = artistIdsArray.slice(i, i + 20);
        artistPromises.push(
          spotifyApi.getArtists(batch)
            .catch(err => {
              console.error(`Error getting artist data:`, err.message || 'Unknown error');
              return { body: { artists: [] } };
            })
        );
      }
      
      const artistResults = await Promise.all(artistPromises);
      
      // Collect genre information and artists
      let allArtists = [];
      for (const result of artistResults) {
        if (result.body && result.body.artists) {
          allArtists = allArtists.concat(result.body.artists);
          
          for (const artist of result.body.artists) {
            // Store artist data for later ranking
            artistData.set(artist.id, {
              name: artist.name,
              popularity: artist.popularity,
              genres: artist.genres || []
            });
            
            if (artist.genres && artist.genres.length > 0) {
              for (const genre of artist.genres) {
                userGenres.set(genre, (userGenres.get(genre) || 0) + 1);
              }
            }
          }
        }
      }
      
      // Get top genres
      const topGenres = Array.from(userGenres.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
      
      console.log(`Top genres: ${topGenres.join(', ')}`);
      
      // Step 2: Rank artists by a combination of factors:
      // - Genre match with top genres (indicates user preference)
      // - Popularity (but not too popular to enable discovery)
      // - Add a random component to ensure different results each time
      const rankedArtists = allArtists
        .filter(artist => artist.id && artist.genres)
        .map(artist => {
          // Count how many of the artist's genres match the user's top genres
          const genreMatchCount = (artist.genres || []).filter(genre => 
            topGenres.includes(genre)
          ).length;
          
          // Calculate a score based on genre match and optimal popularity range
          // We want somewhat popular artists but not too mainstream (60-85 range is ideal)
          const popularityScore = artist.popularity >= 60 && artist.popularity <= 85 
            ? artist.popularity 
            : artist.popularity > 85 
              ? 180 - artist.popularity // Penalize super popular artists (180-90 = 90, 180-100 = 80)
              : artist.popularity; // Keep score as is for less popular artists
          
          // Add a randomization factor to ensure different results each time
          // This will be between 0-10 points (enough to shuffle things without overwhelming the main algorithm)
          const randomFactor = Math.floor(Math.random() * 11);
              
          return {
            id: artist.id,
            name: artist.name,
            // Include the random factor in the score to ensure variety on each request
            score: (genreMatchCount * 20) + popularityScore + randomFactor
          };
        })
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 20); // Take top 20 ranked artists
      
      console.log('Top ranked artists for discovery:');
      rankedArtists.forEach((artist, i) => {
        console.log(`  ${i+1}. ${artist.name} (Score: ${artist.score})`);
      });
      
      // Step 3: Get top tracks from highest ranked artists
      const topTracksPromises = [];
      const topRankedArtistIds = rankedArtists.map(artist => artist.id);
      
      // Randomize order and select a different subset of artists each time
      // This ensures variety in recommendations between requests
      const shuffledArtistIds = topRankedArtistIds
        .sort(() => 0.5 - Math.random()); // Shuffle the array
      
      // Take a different number of artists each time (between 8-10)
      // This adds more variety to the recommendations
      const artistCount = 8 + Math.floor(Math.random() * 3); // 8, 9, or 10
      const discoveryArtistIds = shuffledArtistIds.slice(0, artistCount);
      
      console.log(`Selected ${artistCount} artists randomly from top 20 for this playlist`);
      
      for (const artistId of discoveryArtistIds) {
        topTracksPromises.push(
          spotifyApi.getArtistTopTracks(artistId, 'US')
            .catch(err => {
              console.error(`Error getting top tracks for artist ${artistId}:`, err.message || 'Unknown error');
              return { body: { tracks: [] } };
            })
        );
      }
      
      const topTracksResults = await Promise.all(topTracksPromises);
      
      // Step 4: Collect and filter tracks
      let discoveryTracks = [];
      
      for (const result of topTracksResults) {
        if (result.body && result.body.tracks) {
          // Filter out tracks the user already has
          const newTracks = result.body.tracks.filter(track => 
            !userTrackIds.has(track.id)
          );
          
          // Take a random subset of each artist's tracks to ensure variety
          // This way we don't always pick the same top tracks
          const randomizedTracks = newTracks
            .sort(() => 0.5 - Math.random()) // Shuffle
            .slice(0, 3); // Take up to 3 tracks per artist, randomly selected
          
          discoveryTracks = discoveryTracks.concat(randomizedTracks);
        }
      }
      
      console.log(`Found ${discoveryTracks.length} potential tracks for recommendations`);
      
      if (discoveryTracks.length === 0) {
        console.log('No discovery tracks found, using fallback playlist');
        return res.status(200).json(getFallbackPlaylist(userId));
      }
      
      // Add timestamp to playlist name to indicate it's fresh
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      
      // Create a more dynamic playlist name with different variations
      const playlistNameOptions = [
        `Fresh Finds: ${topGenres[0]} Mix`,
        `${topGenres[0]} Discovery`,
        `${topGenres[0]} & ${topGenres[1]} Explorer`,
        `New ${topGenres[0]} Picks`,
        `${userId}'s ${topGenres[0]} Radio`
      ];
      
      // Randomly select a playlist name
      const playlistNameIndex = Math.floor(Math.random() * playlistNameOptions.length);
      const playlistName = playlistNameOptions[playlistNameIndex];
      
      // Step 5: Create a diverse playlist with tracks from different artists
      const selectedTracks = [];
      const selectedArtistIds = new Set();
      
      // First, add one track from each artist to ensure diversity
      // Shuffle discoveryTracks first to get different tracks each time
      const shuffledDiscoveryTracks = discoveryTracks.sort(() => 0.5 - Math.random());
      
      for (const track of shuffledDiscoveryTracks) {
        const mainArtistId = track.artists[0].id;
        
        if (!selectedArtistIds.has(mainArtistId) && selectedTracks.length < 10) {
          selectedArtistIds.add(mainArtistId);
          selectedTracks.push(track);
        }
      }
      
      // Then, add any remaining tracks up to 15 total
      // Use a combination of popularity and random selection for variety
      if (selectedTracks.length < 15) {
        // Sort remaining tracks by popularity but add randomness
        const remainingTracks = shuffledDiscoveryTracks
          .filter(track => !selectedTracks.includes(track))
          .sort((a, b) => {
            // 80% weight to popularity, 20% to randomness
            const popularityDiff = b.popularity - a.popularity;
            const randomFactor = Math.floor(Math.random() * 20) - 10; // -10 to +10
            return popularityDiff + randomFactor;
          })
          .slice(0, 15 - selectedTracks.length);
        
        selectedTracks.push(...remainingTracks);
      }
      
      // Format the response
      const playlist = {
        name: playlistName,
        description: `Fresh playlist created on ${timestamp} based on your favorite genres: ${topGenres.slice(0, 3).join(', ')}`,
        tracks: selectedTracks.map(track => ({
          name: track.name,
          artists: track.artists.map(artist => artist.name),
          album: track.album.name,
          albumImage: track.album.images && track.album.images.length > 0 ? track.album.images[0].url : null,
          id: track.id,
          previewUrl: track.preview_url,
          uri: track.uri
        })),
        canSave: !!accessToken
      };
      
      console.log(`Successfully created discovery playlist "${playlistName}" with ${selectedTracks.length} tracks from top artists`);
      return res.status(200).json(playlist);
    } catch (artistError) {
      console.error('Error in artist-based discovery:', artistError.message || artistError);
      console.log('Artist-based discovery failed, using fallback playlist');
    }
    
    // If all else fails, return a fallback playlist
    console.log('All discovery methods failed, using fallback playlist');
    return res.status(200).json(getFallbackPlaylist(userId));
  } catch (error) {
    console.error('Error creating playlist:', error);
    if (error.statusCode === 404) {
      console.log('User not found, returning fallback playlist');
      return res.status(200).json(getFallbackPlaylist(userId));
    }
    return res.status(200).json(getFallbackPlaylist(userId));
  }
}

// Helper function to calculate average audio features for ML analysis
function calculateAverageAudioFeatures(features) {
  if (!features || features.length === 0) {
    return {
      danceability: 0.5,
      energy: 0.5,
      valence: 0.5,
      acousticness: 0.5,
      instrumentalness: 0.2,
      tempo: 120
    };
  }
  
  const sum = features.reduce((acc, feature) => {
    if (!feature) return acc;
    
    return {
      danceability: acc.danceability + (feature.danceability || 0),
      energy: acc.energy + (feature.energy || 0),
      valence: acc.valence + (feature.valence || 0),
      acousticness: acc.acousticness + (feature.acousticness || 0),
      instrumentalness: acc.instrumentalness + (feature.instrumentalness || 0),
      tempo: acc.tempo + (feature.tempo || 0)
    };
  }, {
    danceability: 0,
    energy: 0,
    valence: 0,
    acousticness: 0,
    instrumentalness: 0,
    tempo: 0
  });
  
  const count = features.length;
  
  return {
    danceability: sum.danceability / count,
    energy: sum.energy / count,
    valence: sum.valence / count,
    acousticness: sum.acousticness / count,
    instrumentalness: sum.instrumentalness / count,
    tempo: sum.tempo / count
  };
}

// Helper function to get a fallback playlist
function getFallbackPlaylist(userId) {
  return {
    name: `Playlist for ${userId}`,
    description: 'A collection of popular tracks we think you might enjoy',
    tracks: [
      {
        name: 'Blinding Lights',
        artists: ['The Weeknd'],
        album: 'After Hours',
        albumImage: 'https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856',
        id: '0VjIjW4GlUZAMYd2vXMi3b',
        uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b'
      },
      {
        name: 'Don\'t Start Now',
        artists: ['Dua Lipa'],
        album: 'Future Nostalgia',
        albumImage: 'https://i.scdn.co/image/ab67616d0000b2734eb939af3ac2c3a2dfa6d85a',
        id: '3PfIrDoz19wz7qK7tYeu62',
        uri: 'spotify:track:3PfIrDoz19wz7qK7tYeu62'
      },
      {
        name: 'Shape of You',
        artists: ['Ed Sheeran'],
        album: '÷ (Divide)',
        albumImage: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
        id: '7qiZfU4dY1lWllzX7mPBI3',
        uri: 'spotify:track:7qiZfU4dY1lWllzX7mPBI3'
      },
      {
        name: 'Bad Guy',
        artists: ['Billie Eilish'],
        album: 'WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?',
        albumImage: 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a',
        id: '2Fxmhks0bxGSBdJ92vM42m',
        uri: 'spotify:track:2Fxmhks0bxGSBdJ92vM42m'
      },
      {
        name: 'Levitating',
        artists: ['Dua Lipa'],
        album: 'Future Nostalgia',
        albumImage: 'https://i.scdn.co/image/ab67616d0000b2734eb939af3ac2c3a2dfa6d85a',
        id: '5nujrmhLynf4yMoMtj8AQF',
        uri: 'spotify:track:5nujrmhLynf4yMoMtj8AQF'
      },
      {
        name: 'Watermelon Sugar',
        artists: ['Harry Styles'],
        album: 'Fine Line',
        albumImage: 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f',
        id: '6UelLqGlWMcVH1E5c4H7lY',
        uri: 'spotify:track:6UelLqGlWMcVH1E5c4H7lY'
      },
      {
        name: 'Uptown Funk',
        artists: ['Mark Ronson', 'Bruno Mars'],
        album: 'Uptown Special',
        albumImage: 'https://i.scdn.co/image/ab67616d0000b27328a2cbca86dbc4e67d0ac59c',
        id: '32OlwWuMpZ6b0aN2RZOeMS',
        uri: 'spotify:track:32OlwWuMpZ6b0aN2RZOeMS'
      },
      {
        name: 'Shallow',
        artists: ['Lady Gaga', 'Bradley Cooper'],
        album: 'A Star Is Born Soundtrack',
        albumImage: 'https://i.scdn.co/image/ab67616d0000b273e2d156fdc691f57159b82601',
        id: '2VxeLyX666F8uXCJ0dZF8B',
        uri: 'spotify:track:2VxeLyX666F8uXCJ0dZF8B'
      }
    ],
    canSave: false
  };
}

// Helper function to clean user ID
function cleanUserId(userId) {
  // If it's a full Spotify URL, extract the user ID
  if (userId.includes('spotify.com/user/')) {
    userId = userId.split('spotify.com/user/')[1].split(/[?/#]/)[0];
  }
  
  // Remove any leading/trailing whitespace
  return userId.trim();
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
} 