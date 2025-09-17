const CLIENT_ID = 'a1051807e7b34d7caf792edfea182fd5';
const CLIENT_SECRET = '0417ca91a9e64d22bd0ad5159d921eb3';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

// In-memory cache for access tokens (will reset on function restart)
let tokenCache = {
  access_token: null,
  expires_at: null
};

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
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
  
  if (!refresh_token) {
    console.log('No refresh token available in environment variables');
    throw new Error('No refresh token available - Please set SPOTIFY_REFRESH_TOKEN environment variable');
  }
  
  console.log('Refreshing access token using environment variable...');
  
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
    const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
    
    console.log('Token check:', {
      hasCachedToken: !!tokenCache.access_token,
      hasRefreshToken: !!refresh_token,
      expiresAt: tokenCache.expires_at,
      now: Date.now(),
      expired: tokenCache.expires_at ? Date.now() >= (tokenCache.expires_at - 60000) : true
    });
    
    if (!refresh_token) {
      console.log('No refresh token available in environment variables');
      throw new Error('Authentication required - SPOTIFY_REFRESH_TOKEN not set');
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
        
        // Display the refresh token for manual addition to environment variables
        console.log('='.repeat(50));
        console.log('IMPORTANT: Add this to your Vercel environment variables:');
        console.log('Key: SPOTIFY_REFRESH_TOKEN');
        console.log('Value:', tokenData.refresh_token);
        console.log('='.repeat(50));
        
        // Cache the access token
        tokenCache.access_token = tokenData.access_token;
        tokenCache.expires_at = Date.now() + (tokenData.expires_in * 1000);

        const trackData = await fetchSpotifyData();
        
        return res.status(200).json({ 
          success: true,
          trackData: trackData,
          message: 'Please add the refresh token from the server logs to your Vercel environment variables'
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
        const hasRefreshToken = !!process.env.SPOTIFY_REFRESH_TOKEN;
        
        console.log('Status check:', {
          hasRefreshToken,
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
          needsRefresh: false
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
      const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
      return res.status(200).json({
        token: refresh_token ? 'Token is set in environment variables' : null,
        hasToken: !!refresh_token,
        source: 'environment_variables'
      });
    }

    if (path === '/api/health' && req.method === 'GET') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        storage: 'environment_variables'
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