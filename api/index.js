import { Redis } from '@upstash/redis';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables');
}

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';

// In-memory cache for access tokens (will reset on function restart)
let tokenCache = {
  access_token: null,
  expires_at: null
};

// Lazily create the Redis client only if the project has a store connected.
// Falls back to null so the app still runs on SPOTIFY_REFRESH_TOKEN alone.
let redis = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  } else {
    console.log('Upstash Redis env vars not found - falling back to SPOTIFY_REFRESH_TOKEN only');
  }
} catch (error) {
  console.error('Failed to initialize Redis client:', error);
  redis = null;
}

// Tracks whether the last successful read came from Redis or the env var,
// so /api/get-token and /api/health can report it without guesswork.
let lastRefreshTokenSource = 'none';

// Read the refresh token, preferring Redis (auto-persisted on each OAuth
// exchange) and falling back to the SPOTIFY_REFRESH_TOKEN env var so a
// bootstrap token keeps working until the next re-auth.
async function getStoredRefreshToken() {
  if (redis) {
    try {
      const stored = await redis.get(REFRESH_TOKEN_KEY);
      if (stored) {
        lastRefreshTokenSource = 'redis';
        return stored;
      }
    } catch (error) {
      console.error('Failed to read refresh token from Redis:', error);
    }
  }

  const envToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (envToken) {
    lastRefreshTokenSource = 'env-fallback';
    return envToken;
  }

  lastRefreshTokenSource = 'none';
  return null;
}

// Persist a newly issued refresh token to Redis so future requests never
// need it pasted into Vercel env vars by hand.
async function setStoredRefreshToken(token) {
  if (!redis) {
    console.log('No Redis client configured - refresh token was NOT persisted. It will only live in this log line and the in-memory cache:', token);
    return false;
  }

  try {
    await redis.set(REFRESH_TOKEN_KEY, token);
    console.log('Refresh token persisted to Redis');
    return true;
  } catch (error) {
    console.error('Failed to persist refresh token to Redis:', error);
    return false;
  }
}

async function exchangeCodeForToken(code) {
  console.log('Exchanging code for token...');
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://t2ddy-personal.vercel.app'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Code exchange failed:', {
      status: response.status,
      error: errorText,
      code: code
    });
    throw new Error(`Failed to exchange code: ${errorText}`);
  }

  return await response.json();
}

async function refreshAccessToken() {
  const refresh_token = await getStoredRefreshToken();
  
  if (!refresh_token) {
    console.log('No refresh token available in Redis or environment variables');
    throw new Error('No refresh token available - connect Spotify or set SPOTIFY_REFRESH_TOKEN environment variable');
  }
  
  console.log(`Refreshing access token using ${lastRefreshTokenSource} token...`);
  
  try {
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
      const errorText = await response.text();
      console.error('Token refresh failed:', {
        status: response.status,
        error: errorText,
        refresh_token_length: refresh_token.length
      });
      throw new Error(`Failed to refresh token: ${errorText}`);
    }
    
    const tokenData = await response.json();
    
    // Cache the new access token in memory
    tokenCache.access_token = tokenData.access_token;
    tokenCache.expires_at = Date.now() + (tokenData.expires_in * 1000);
    
    console.log('Token refreshed and cached successfully');
    return tokenData.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    // Clear cache on error
    tokenCache.access_token = null;
    tokenCache.expires_at = null;
    throw error;
  }
}

async function getValidAccessToken() {
  try {
    const refresh_token = await getStoredRefreshToken();
    
    console.log('Token check:', {
      hasCachedToken: !!tokenCache.access_token,
      hasRefreshToken: !!refresh_token,
      refreshTokenSource: lastRefreshTokenSource,
      expiresAt: tokenCache.expires_at,
      now: Date.now(),
      expired: tokenCache.expires_at ? Date.now() >= (tokenCache.expires_at - 60000) : true
    });
    
    if (!refresh_token) {
      console.log('No refresh token available in Redis or environment variables');
      throw new Error('Authentication required - connect Spotify or set SPOTIFY_REFRESH_TOKEN');
    }
    
    // Check if we have a valid cached token
    if (tokenCache.access_token && tokenCache.expires_at && Date.now() < (tokenCache.expires_at - 60000)) {
      console.log('Using cached access token');
      return tokenCache.access_token;
    }
    
    // Token is expired or doesn't exist, refresh it
    console.log('Token expired or missing, refreshing...');
    return await refreshAccessToken();
    
  } catch (error) {
    console.error('Error in getValidAccessToken:', error);
    throw error;
  }
}

async function fetchSpotifyData() {
  try {
    const accessToken = await getValidAccessToken();
    console.log('Fetching Spotify data with valid token');

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
        
        console.log('Currently playing:', currentData.item.name);
        return trackData;
      }
    }

    console.log('Nothing currently playing, fetching recently played...');
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
        
        console.log('Last played:', recentData.items[0].track.name);
        return trackData;
      }
    }
    
    console.log('No track data available');
    return null;
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    return null;
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://t2ddy-personal.vercel.app'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://t2ddy-personal.vercel.app');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const path = req.url.includes('?') ? req.url.split('?')[0] : req.url;
  
  console.log('API Request:', {
    method: req.method,
    path: path,
    origin: req.headers.origin
  });

  try {
    if (path === '/api/spotify/tokens' && req.method === 'POST') {
      const { code } = req.body;
      
      if (!code) {
        console.error('Token exchange failed: Missing authorization code');
        return res.status(400).json({ 
          success: false, 
          error: 'Missing authorization code' 
        });
      }
      
      try {
        console.log('Starting token exchange process...');
        
        const tokenData = await exchangeCodeForToken(code);
        
        if (!tokenData.access_token || !tokenData.refresh_token) {
          throw new Error('Invalid token data received from Spotify');
        }
        
        // Persist the new refresh token so future requests never need it
        // pasted into Vercel env vars by hand.
        const persisted = await setStoredRefreshToken(tokenData.refresh_token);
        
        // Cache the access token
        tokenCache.access_token = tokenData.access_token;
        tokenCache.expires_at = Date.now() + (tokenData.expires_in * 1000);

        const trackData = await fetchSpotifyData();
        
        return res.status(200).json({ 
          success: true,
          trackData: trackData,
          persisted,
          message: persisted
            ? 'Refresh token saved automatically - no further action needed'
            : 'Redis is not configured, so the refresh token could not be persisted. Check server logs and set SPOTIFY_REFRESH_TOKEN manually as a fallback.'
        });
      } catch (error) {
        console.error('Token exchange error:', error);
        
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to exchange tokens'
        });
      }
    }

    if (path === '/api/spotify/current-track' && req.method === 'GET') {
      const freshData = await fetchSpotifyData();
      
      return res.status(200).json({
        success: true,
        data: freshData
      });
    }

    if (path === '/api/spotify/status' && req.method === 'GET') {
      try {
        const refresh_token = await getStoredRefreshToken();
        const hasRefreshToken = !!refresh_token;
        
        console.log('Status check:', {
          hasRefreshToken,
          refreshTokenSource: lastRefreshTokenSource,
          hasCachedToken: !!tokenCache.access_token,
          tokenExpired: tokenCache.expires_at ? Date.now() >= (tokenCache.expires_at - 60000) : true
        });

        let authenticated = false;
        if (hasRefreshToken) {
          try {
            await getValidAccessToken();
            authenticated = true;
          } catch (error) {
            console.error('Auth check failed:', error);
            authenticated = false;
          }
        }
        
        return res.status(200).json({
          authenticated: authenticated,
          hasTrackData: authenticated,
          needsRefresh: false,
          tokenSource: lastRefreshTokenSource
        });
      } catch (error) {
        console.error('Status check error:', error);
        return res.status(200).json({
          authenticated: false,
          hasTrackData: false,
          error: 'Failed to check authentication status'
        });
      }
    }

    if (path === '/api/spotify/refresh' && req.method === 'POST') {
      console.log('Manual refresh requested');
      const freshData = await fetchSpotifyData();
      return res.status(200).json({ 
        success: true, 
        data: freshData 
      });
    }

    if (path === '/api/get-token' && req.method === 'GET') {
      const refresh_token = await getStoredRefreshToken();
      return res.status(200).json({
        token: refresh_token ? `Token is set (source: ${lastRefreshTokenSource})` : null,
        hasToken: !!refresh_token,
        source: lastRefreshTokenSource
      });
    }

    if (path === '/api/health' && req.method === 'GET') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        storage: redis ? 'redis' : 'environment_variables_only'
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