const express = require('express');
const cors = require('cors');
const { fetch } = require('undici'); // Use undici for fetch in Node.js
const app = express();

// Enable CORS for your frontend domains
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://t2ddy-personal.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());

// In-memory storage (in production, you'd use a database)
let spotifyTokens = {
  access_token: null,
  refresh_token: null,
  expires_at: null
};

let currentTrackData = {
  track: null,
  isPlaying: false,
  lastUpdated: null
};

// Spotify configuration
const CLIENT_ID = 'a1051807e7b34d7caf792edfea182fd5';
const CLIENT_SECRET = '0417ca91a9e64d22bd0ad5159d921eb3';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

// Refresh access token
async function refreshAccessToken() {
  if (!spotifyTokens.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: spotifyTokens.refresh_token,
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokenData = await response.json();
  spotifyTokens.access_token = tokenData.access_token;
  if (tokenData.refresh_token) {
    spotifyTokens.refresh_token = tokenData.refresh_token;
  }
  spotifyTokens.expires_at = Date.now() + (tokenData.expires_in * 1000);
  
  return tokenData.access_token;
}

// Get valid access token
async function getValidAccessToken() {
  if (!spotifyTokens.access_token) {
    throw new Error('No access token available');
  }

  // Check if token needs refresh (with 1 minute buffer)
  if (spotifyTokens.expires_at && Date.now() >= (spotifyTokens.expires_at - 60000)) {
    return await refreshAccessToken();
  }

  return spotifyTokens.access_token;
}

// Fetch current track data from Spotify
async function fetchSpotifyData() {
  try {
    const accessToken = await getValidAccessToken();

    // Try to get currently playing track
    const currentResponse = await fetch(CURRENTLY_PLAYING_URL, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (currentResponse.status === 200) {
      const currentData = await currentResponse.json();
      if (currentData.is_playing) {
        currentTrackData = {
          track: currentData.item,
          isPlaying: true,
          lastUpdated: Date.now()
        };
        return;
      }
    }

    // Get most recent track if nothing is currently playing
    const recentResponse = await fetch(RECENTLY_PLAYED_URL, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (recentResponse.ok) {
      const recentData = await recentResponse.json();
      if (recentData.items && recentData.items.length > 0) {
        currentTrackData = {
          track: recentData.items[0].track,
          isPlaying: false,
          lastUpdated: Date.now()
        };
      }
    }
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
  }
}

// API Routes

// Store tokens (called after OAuth)
app.post('/api/spotify/tokens', (req, res) => {
  const { access_token, refresh_token, expires_in } = req.body;
  
  spotifyTokens = {
    access_token,
    refresh_token,
    expires_at: Date.now() + (expires_in * 1000)
  };

  // Immediately fetch current track data
  fetchSpotifyData();

  res.json({ success: true });
});

// Get current track (public endpoint)
app.get('/api/spotify/current-track', (req, res) => {
  // Return cached track data
  res.json({
    success: true,
    data: currentTrackData.track ? {
      track: currentTrackData.track,
      isPlaying: currentTrackData.isPlaying,
      lastUpdated: currentTrackData.lastUpdated
    } : null
  });
});

// Check if authenticated
app.get('/api/spotify/status', (req, res) => {
  res.json({
    authenticated: !!spotifyTokens.access_token,
    hasTrackData: !!currentTrackData.track
  });
});

// Refresh track data manually
app.post('/api/spotify/refresh', async (req, res) => {
  try {
    await fetchSpotifyData();
    res.json({ success: true, data: currentTrackData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Periodic refresh of track data (every 30 seconds)
setInterval(() => {
  if (spotifyTokens.access_token) {
    fetchSpotifyData();
  }
}, 30000);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Spotify API server running on port ${PORT}`);
});

module.exports = app;
