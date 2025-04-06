# Spotify Playlist Recommender

A web application that generates personalized playlists based on your Spotify listening history and preferences.

check it out on- 
https://playlist-recommender-zj6m.onrender.com

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



## How It Works

The application uses a multi-step algorithm to create personalized playlists:

1. **Genre Analysis**: Identifies your favorite music genres based on artists in your playlists
2. **Artist Ranking**: Scores and ranks artists based on genre match and popularity
3. **Track Discovery**: Collects top tracks from your highest-ranked artists
4. **Randomization**: Applies multiple randomization techniques to ensure variety
5. **Filtering**: Excludes tracks already in your playlists
6. **Playlist Creation**: Generates a cohesive playlist of 15 tracks

Each time you generate a playlist, the algorithm uses randomization to create a unique set of recommendations.

