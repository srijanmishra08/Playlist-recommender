import SpotifyWebApi from 'spotify-web-api-node';

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  // Extract authorization code from request
  const extractedCode = code || null;
  const extractedError = error || null;

  // Set up Spotify Web API with credentials
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/api/callback'
  });

  // Get the base URL for redirects
  // First try APP_URL env var, then use host headers, fallback to localhost
  const baseUrl = process.env.APP_URL || 
    (process.env.NODE_ENV === 'production' 
      ? `https://${req.headers.host}`
      : 'http://localhost:3000');

  // If there was an error during the OAuth process
  if (extractedError) {
    return res.redirect(`${baseUrl}/?error=${encodeURIComponent(extractedError)}`);
  }

  // If we received an authorization code, redirect to the frontend with the code
  if (extractedCode) {
    return res.redirect(`${baseUrl}/?code=${encodeURIComponent(extractedCode)}&state=${encodeURIComponent(state || '')}`);
  }

  // If no code or error, something went wrong
  return res.redirect(`${baseUrl}/?error=unknown_error`);
} 