# Spotify Playlist Recommender

A simple web application that creates personalized playlists based on a Spotify user's profile.

## Features

- Enter a Spotify user ID or profile URL
- Get a personalized playlist based on the user's public playlists
- View recommended tracks with album artwork

## Setup

1. Create a Spotify Developer account and register a new application at [https://developer.spotify.com/dashboard/](https://developer.spotify.com/dashboard/)

2. Set the redirect URI to `http://localhost:3000/api/callback` in your Spotify app settings

3. Copy your Client ID and Client Secret

4. Update the `.env.local` file with your Spotify credentials:
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/callback
   ```

5. Install dependencies:
   ```bash
   npm install
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

The application uses the Spotify Web API to:
1. Take a user ID as input
2. Fetch the user's public playlists
3. Extract artists from those playlists
4. Use those artists as seed values for Spotify's recommendation engine
5. Generate a playlist of recommended tracks based on the user's listening habits

## Technologies Used

- Next.js
- React
- spotify-web-api-node
- Axios
