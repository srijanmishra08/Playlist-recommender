export default async function handler(req, res) {
  const { code, state, error } = req.query;

  // If there was an error during the OAuth process
  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`);
  }

  // If we received an authorization code, redirect to the frontend with the code
  if (code) {
    return res.redirect(`/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`);
  }

  // If no code or error, something went wrong
  return res.redirect('/?error=unknown_error');
} 