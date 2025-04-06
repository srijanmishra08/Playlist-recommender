# Spotify Playlist Recommender

A web application that generates personalized playlists based on your Spotify listening history and preferences.

## Features

- Analyzes your public playlists to understand your music taste
- Uses advanced genre analysis and artist discovery algorithms
- Creates personalized playlists with tracks you haven't heard before
- Randomizes recommendations each time for continuous fresh discoveries
- Allows saving playlists directly to your Spotify account

## Technology Stack

- Next.js for frontend and API routes
- Spotify Web API for music data and playlist creation
- Algorithm featuring artist ranking, genre analysis, and randomization

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file with your Spotify credentials (see `.env.sample`)
4. Run the development server:
   ```
   npm run dev
   ```
5. Visit http://localhost:3000 in your browser

## Deploying to Render

### Prerequisites

1. A [Render](https://render.com) account
2. A [Spotify Developer](https://developer.spotify.com) account with an app created

### Deployment Steps

1. Fork or push this repository to your GitHub account
2. Log in to your Render account
3. Click "New" and select "Blueprint" (if you have the render.yaml file) or "Web Service"
4. Connect your GitHub repository
5. Configure the following environment variables:
   - `SPOTIFY_CLIENT_ID`: Your Spotify app client ID
   - `SPOTIFY_CLIENT_SECRET`: Your Spotify app client secret
   - `REDIRECT_URI`: `https://your-app-name.onrender.com/api/callback` (replace with your actual Render URL)
6. Click "Create Blueprint/Web Service"

### Important Notes for Spotify Integration

After deploying to Render:

1. Go to your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Edit Settings"
4. Add your Render URL to the Redirect URIs:
   - `https://your-app-name.onrender.com/api/callback`
5. Save changes

## How It Works

The application uses a multi-step algorithm to create personalized playlists:

1. **Genre Analysis**: Identifies your favorite music genres based on artists in your playlists
2. **Artist Ranking**: Scores and ranks artists based on genre match and popularity
3. **Track Discovery**: Collects top tracks from your highest-ranked artists
4. **Randomization**: Applies multiple randomization techniques to ensure variety
5. **Filtering**: Excludes tracks already in your playlists
6. **Playlist Creation**: Generates a cohesive playlist of 15 tracks

Each time you generate a playlist, the algorithm uses randomization to create a unique set of recommendations.

## License

MIT
