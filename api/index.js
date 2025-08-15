import { Redis } from '@upstash/redis';

const CLIENT_ID = 'a1051807e7b34d7caf792edfea182fd5';
const CLIENT_SECRET = '0417ca91a9e64d22bd0ad5159d921eb3';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function refreshAccessToken() {
  const refresh_token = await redis.get('spotify_refresh_token');
  
  if (!refresh_token) {
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
      refresh_token: refresh_token,
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokenData = await response.json();
  
  await redis.set('spotify_access_token', tokenData.access_token);
  if (tokenData.refresh_token) {
    await redis.set('spotify_refresh_token', tokenData.refresh_token);
  }
  const expires_at = Date.now() + (tokenData.expires_in * 1000);
  await redis.set('spotify_expires_at', expires_at);
  
  return tokenData.access_token;
}

async function getValidAccessToken() {
  const access_token = await redis.get('spotify_access_token');
  const expires_at = await redis.get('spotify_expires_at');
  
  if (!access_token) {
    throw new Error('No access token available');
  }

  if (expires_at && Date.now() >= (expires_at - 60000)) {
    return await refreshAccessToken();
  }

  return access_token;
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
        const trackData = {
          track: currentData.item,
          isPlaying: true,
          lastUpdated: Date.now()
        };
        
        await redis.set('current_track_data', JSON.stringify(trackData));
        
        return trackData;
      }
    }

    const recentResponse = await fetch(RECENTLY_PLAYED_URL, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (recentResponse.ok) {
      const recentData = await recentResponse.json();
      if (recentData.items && recentData.items.length > 0) {
        const trackData = {
          track: recentData.items[0].track,
          isPlaying: false,
          lastUpdated: Date.now()
        };
        
        await redis.set('current_track_data', JSON.stringify(trackData));
        
        return trackData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    return null;
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

  // Extract path from request URL - Vercel provides the full path
  const path = req.url.includes('?') ? req.url.split('?')[0] : req.url;
  
  // Debug logging
  console.log('API Debug:', {
    method: req.method,
    url: req.url,
    path: path,
    headers: req.headers
  });

  try {
    if (path === '/api/spotify/tokens' && req.method === 'POST') {
      const { access_token, refresh_token, expires_in } = req.body;
      
      await redis.set('spotify_access_token', access_token);
      await redis.set('spotify_refresh_token', refresh_token);
      const expires_at = Date.now() + (expires_in * 1000);
      await redis.set('spotify_expires_at', expires_at);

      await fetchSpotifyData();
      
      return res.status(200).json({ success: true });
    }

    if (path === '/api/spotify/current-track' && req.method === 'GET') {
      let cachedData = await redis.get('current_track_data');
      
      if (cachedData) {
        if (typeof cachedData === 'string') {
          cachedData = JSON.parse(cachedData);
        }
        
        if (cachedData.lastUpdated && Date.now() - cachedData.lastUpdated > 30000) {
          const freshData = await fetchSpotifyData();
          if (freshData) {
            return res.status(200).json({
              success: true,
              data: freshData
            });
          }
        }
        
        return res.status(200).json({
          success: true,
          data: cachedData
        });
      }
      
      const freshData = await fetchSpotifyData();
      
      return res.status(200).json({
        success: true,
        data: freshData
      });
    }

    if (path === '/api/spotify/status' && req.method === 'GET') {
      const access_token = await redis.get('spotify_access_token');
      const trackData = await redis.get('current_track_data');
      
      return res.status(200).json({
        authenticated: !!access_token,
        hasTrackData: !!trackData
      });
    }

    if (path === '/api/spotify/refresh' && req.method === 'POST') {
      const freshData = await fetchSpotifyData();
      return res.status(200).json({ 
        success: true, 
        data: freshData 
      });
    }

    if (path === '/api/health' && req.method === 'GET') {
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