import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState(null);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savingToSpotify, setSavingToSpotify] = useState(false);
  const [spotifySaveSuccess, setSpotifySaveSuccess] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Handle OAuth callback from Spotify
  useEffect(() => {
    // Check if we have a code in the URL (Spotify OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setError(`Authentication failed: ${error}`);
      return;
    }

    if (code) {
      // Clean up the URL
      window.history.replaceState({}, document.title, '/');

      // Exchange the code for an access token
      exchangeCodeForToken(code);
    }

    // Check if we have a saved token in localStorage
    const savedToken = localStorage.getItem('spotify_access_token');
    const tokenExpiry = localStorage.getItem('spotify_token_expiry');
    
    if (savedToken && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
      setAccessToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Exchange authorization code for access token
  const exchangeCodeForToken = async (code) => {
    try {
      const response = await axios.post('/api/spotify-auth', { code });
      const { accessToken, expiresIn } = response.data;
      
      // Save token and expiry to state and localStorage
      setAccessToken(accessToken);
      setIsAuthenticated(true);
      
      // Calculate expiry time
      const expiryTime = new Date().getTime() + (expiresIn * 1000);
      
      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('spotify_token_expiry', expiryTime.toString());
    } catch (err) {
      console.error('Error exchanging code for token:', err);
      setError('Failed to authenticate with Spotify. Please try again.');
    }
  };

  // Handle Spotify Login
  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/spotify-auth');
      const data = await response.json();
      
      // Redirect to Spotify authorization page
      if (data.authorizeURL) {
        window.location.href = data.authorizeURL;
      } else if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to initialize Spotify login');
      setLoading(false);
    }
  };

  // Save playlist to Spotify
  const handleSaveToSpotify = async () => {
    if (!playlist || !accessToken) return;
    
    setSavingToSpotify(true);
    setSpotifySaveSuccess(null);
    
    try {
      // Extract track URIs from the playlist
      const trackUris = playlist.tracks.map(track => track.uri);
      
      // Call API to save playlist
      const response = await axios.post('/api/save-playlist', {
        name: playlist.name,
        description: playlist.description,
        trackUris,
        accessToken
      });
      
      setSpotifySaveSuccess({
        message: 'Playlist saved to your Spotify account!',
        url: response.data.playlistUrl
      });
    } catch (err) {
      console.error('Error saving playlist to Spotify:', err);
      setError('Failed to save playlist to Spotify. Please try again.');
    } finally {
      setSavingToSpotify(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId.trim()) {
      setError('Please enter a Spotify username');
      return;
    }
    
    // Basic validation for Spotify username
    const cleanedUserId = cleanSpotifyUsername(userId);
    if (!cleanedUserId) {
      setError('Please enter a valid Spotify username or profile URL');
      return;
    }
    
    setLoading(true);
    setError(null);
    setPlaylist(null);
    setSpotifySaveSuccess(null);

    try {
      const response = await fetch('/api/create-playlist-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: cleanedUserId,
          accessToken: isAuthenticated ? accessToken : null
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate playlist');
      }

      setPlaylist(data);
    } catch (error) {
      console.error('Error creating playlist:', error);
      setError(error.message || 'Failed to create playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to clean and validate Spotify username
  const cleanSpotifyUsername = (input) => {
    // If it's a Spotify URL, extract the username
    if (input.includes('spotify.com/user/')) {
      input = input.split('spotify.com/user/')[1].split(/[?/#]/)[0];
    }
    
    // Remove any spaces and special characters
    input = input.trim();
    
    // Check if the username looks valid (alphanumeric with some special chars allowed)
    if (/^[a-zA-Z0-9._-]+$/.test(input)) {
      return input;
    }
    
    return null;
  };

  // Toggle help visibility
  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Spotify Playlist Generator</h1>
          <p className={styles.description}>
            Create personalized playlists with our AI-powered algorithm
          </p>
        </div>

        <div className={styles.card}>
          {!isAuthenticated ? (
            <div className={styles.loginCard}>
              <div className={styles.loginHeader}>
                <h2>Get Personalized Recommendations</h2>
                <p>Connect with Spotify for the best experience and to save your playlists</p>
              </div>
              <button 
                onClick={handleLogin} 
                className={styles.spotifyLoginButton}
              >
                <span className={styles.spotifyLogo}>♫</span> Connect with Spotify
              </button>
              <div className={styles.orDivider}>
                <span>OR</span>
              </div>
              <p className={styles.skipText}>Continue without logging in</p>
            </div>
          ) : (
            <div className={styles.authenticatedBanner}>
              <span className={styles.connectedBadge}>
                <span className={styles.greenDot}></span> Connected to Spotify
              </span>
            </div>
          )}

          <div className={styles.inputSection}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formHeader}>
                <h2>Generate a Playlist</h2>
                <div className={styles.helpIconWrapper}>
                  <button type="button" onClick={toggleHelp} className={styles.helpIcon}>
                    ?
                  </button>
                </div>
              </div>

              {showHelp && (
                <div className={styles.helpBox}>
                  <h4>How to find a Spotify username</h4>
                  <ol>
                    <li>Open Spotify and go to the profile</li>
                    <li>Click "..." → "Share" → "Copy Profile Link"</li>
                    <li>Paste the entire URL here</li>
                  </ol>
                  <p><strong>Pro tip:</strong> Try your friends' profiles too!</p>
                </div>
              )}

              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter Spotify username or profile URL"
                  className={styles.input}
                />
                <button
                  type="submit"
                  className={styles.generateButton}
                  disabled={loading}
                >
                  {loading ? (
                    <span className={styles.loadingSpinner}></span>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>

              {error && <div className={styles.error}>{error}</div>}
            </form>
          </div>
        </div>

        {playlist && (
          <div className={styles.playlistCard}>
            <div className={styles.playlistHeader}>
              <div className={styles.playlistInfo}>
                <h2>{playlist.name}</h2>
                <p className={styles.playlistDescription}>{playlist.description}</p>
              </div>
              
              {playlist.canSave && (
                <button 
                  onClick={handleSaveToSpotify} 
                  className={styles.saveButton}
                  disabled={savingToSpotify}
                >
                  {savingToSpotify ? 'Saving...' : 'Save to Spotify'}
                </button>
              )}
            </div>

            {/* Success message after saving */}
            {spotifySaveSuccess && (
              <div className={styles.successMessage}>
                <p>{spotifySaveSuccess.message}</p>
                <a 
                  href={spotifySaveSuccess.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.spotifyLink}
                >
                  Open in Spotify
                </a>
              </div>
            )}
            
            <ul className={styles.tracksList}>
              {playlist.tracks.map((track, index) => (
                <li key={index} className={styles.trackItem}>
                  <div className={styles.trackItemContent}>
                    <img src={track.albumImage || '/default-album.png'} alt={track.album} className={styles.albumCover} />
                    <div className={styles.trackInfo}>
                      <div className={styles.trackName}>{track.name}</div>
                      <div className={styles.trackArtist}>{track.artists.join(', ')}</div>
                      <div className={styles.trackAlbum}>{track.album}</div>
                    </div>
                    {track.previewUrl && (
                      <div className={styles.trackControls}>
                        <audio 
                          className={styles.previewAudio} 
                          controls 
                          src={track.previewUrl}
                        ></audio>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Footer actions */}
            <div className={styles.playlistFooter}>
              {!isAuthenticated ? (
                <button 
                  onClick={handleLogin} 
                  className={styles.spotifyLoginButton}
                >
                  <span className={styles.spotifyLogo}>♫</span> Login to save this playlist
                </button>
              ) : playlist.canSave && (
                <button 
                  onClick={handleSaveToSpotify} 
                  className={styles.saveButtonLarge}
                  disabled={savingToSpotify}
                >
                  {savingToSpotify ? 'Saving to Spotify...' : 'Save to Spotify'}
                </button>
              )}
              
              <button 
                onClick={handleSubmit} 
                className={styles.generateAgainButton}
              >
                Generate another playlist
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 