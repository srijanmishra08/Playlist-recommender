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

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Spotify Playlist Recommender</h1>
        <p className={styles.description}>
          ML-powered playlist generator based on your music taste
        </p>

        <div className={styles.authSection}>
          {!isAuthenticated ? (
            <>
              <button 
                onClick={handleLogin} 
                className={styles.spotifyLoginButton}
              >
                Login with Spotify
              </button>
              <p className={styles.loginNote}>
                Login is recommended for best results. Without login, some user profiles may return 403 errors 
                due to Spotify API permissions.
              </p>
            </>
          ) : (
            <div className={styles.authStatus}>
              <span className={styles.loggedInStatus}>
                <span className={styles.greenDot}></span> Connected to Spotify
              </span>
            </div>
          )}
        </div>

        <div className={styles.helpText}>
          <h3>How to find your Spotify username:</h3>
          <ol>
            <li>Open Spotify app or website</li>
            <li>Go to your profile</li>
            <li>Click "..." then "Share" then "Copy Profile Link"</li>
            <li>Paste the entire URL here (or just the username part after "user/")</li>
          </ol>
          <p><strong>Note:</strong> Make sure you have public playlists that contain tracks!</p>
        </div>

        <section className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="userId">Spotify Username</label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter Spotify username"
                className={styles.input}
              />
              <p className={styles.helpText}>
                Not sure where to find your Spotify username? 
                Open Spotify, go to your profile, click the three dots (•••) and select "Share" → "Copy Profile Link". 
                Paste that link here.
              </p>
            </div>
            <button
              type="submit"
              className={styles.generateButton}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Playlist'}
            </button>
          </form>
          
          {error && <div className={styles.error}>{error}</div>}
        </section>

        {playlist && (
          <div className={styles.results}>
            <div className={styles.playlistHeader}>
              <h2>{playlist.name}</h2>
              <p>{playlist.description}</p>
              
              {/* Save to Spotify button */}
              {playlist.canSave && (
                <button 
                  onClick={handleSaveToSpotify} 
                  className={styles.saveButton}
                  disabled={savingToSpotify}
                >
                  {savingToSpotify ? 'Saving...' : 'Save to Spotify'}
                </button>
              )}
              
              {/* Show message if not authenticated but can save */}
              {!isAuthenticated && (
                <p className={styles.authPrompt}>
                  Login with Spotify to save this playlist to your account
                </p>
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
            
            <ul className={styles.tracks}>
              {playlist.tracks.map((track, index) => (
                <li key={index} className={styles.track}>
                  <img src={track.albumImage} alt={track.album} className={styles.albumCover} />
                  <div className={styles.trackInfo}>
                    <strong>{track.name}</strong>
                    <span>{track.artists.join(', ')}</span>
                  </div>
                  {track.previewUrl && (
                    <audio 
                      className={styles.previewAudio} 
                      controls 
                      src={track.previewUrl}
                    ></audio>
                  )}
                </li>
              ))}
            </ul>
            
            {/* Repeat save button at bottom for convenience */}
            {playlist.canSave && (
              <button 
                onClick={handleSaveToSpotify} 
                className={styles.saveButtonBottom}
                disabled={savingToSpotify}
              >
                {savingToSpotify ? 'Saving...' : 'Save to Spotify'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 