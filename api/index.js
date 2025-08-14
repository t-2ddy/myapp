const CLIENT_ID = 'a1051807e7b34d7caf792edfea182fd5';
const CLIENT_SECRET = '0417ca91a9e64d22bd0ad5159d921eb3';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

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

async function getValidAccessToken() {
  if (!spotifyTokens.access_token) {
    throw new Error('No access token available');
  }

  if (spotifyTokens.expires_at && Date.now() >= (spotifyTokens.expires_at - 60000)) {
    return await refreshAccessToken();
  }

  return spotifyTokens.access_token;
}

async function fetchSpotifyData() {
  try {
    const accessToken = await getValidAccessToken();

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

function setCorsHeaders(res) {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://t2ddy-personal.vercel.app'
  ];
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://t2ddy-personal.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const path = pathname.replace('/api', '');

  try {
    if (path === '/spotify/tokens' && req.method === 'POST') {
      const { access_token, refresh_token, expires_in } = req.body;
      
      spotifyTokens = {
        access_token,
        refresh_token,
        expires_at: Date.now() + (expires_in * 1000)
      };

      await fetchSpotifyData();
      
      return res.status(200).json({ success: true });
    }

    if (path === '/spotify/current-track' && req.method === 'GET') {
      return res.status(200).json({
        success: true,
        data: currentTrackData.track ? {
          track: currentTrackData.track,
          isPlaying: currentTrackData.isPlaying,
          lastUpdated: currentTrackData.lastUpdated
        } : null
      });
    }

    if (path === '/spotify/status' && req.method === 'GET') {
      return res.status(200).json({
        authenticated: !!spotifyTokens.access_token,
        hasTrackData: !!currentTrackData.track
      });
    }

    if (path === '/spotify/refresh' && req.method === 'POST') {
      await fetchSpotifyData();
      return res.status(200).json({ 
        success: true, 
        data: currentTrackData 
      });
    }

    if (path === '/health' && req.method === 'GET') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      });
    }

    return res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}