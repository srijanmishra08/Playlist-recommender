export default function handler(req, res) {
  res.status(200).json({
    clientIdExists: !!process.env.SPOTIFY_CLIENT_ID,
    clientIdLength: process.env.SPOTIFY_CLIENT_ID?.length || 0,
    clientSecretExists: !!process.env.SPOTIFY_CLIENT_SECRET,
    clientSecretLength: process.env.SPOTIFY_CLIENT_SECRET?.length || 0,
    redirectUriExists: !!process.env.SPOTIFY_REDIRECT_URI,
    // First 4 chars only, for security
    clientIdPrefix: process.env.SPOTIFY_CLIENT_ID?.substring(0, 4) || '',
    clientSecretPrefix: process.env.SPOTIFY_CLIENT_SECRET?.substring(0, 4) || ''
  });
} 